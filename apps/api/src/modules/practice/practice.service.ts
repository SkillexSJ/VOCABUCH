import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MasteryEngine } from './engine/mastery-engine';
import {
  SubmitExerciseInput,
  PracticeQueueQueryInput,
} from '@vocabulary/validation';
import {
  LearningStatus,
  ExerciseType,
  Prisma,
} from '../../../prisma/generated/client';

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates an intelligent practice deck for the user.
   * Prioritizes weak items (INCOMPLETE), overdue reviews, and new items.
   */
  async getPracticeQueue(userId: string, query: PracticeQueueQueryInput) {
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const now = new Date();

    const where: Prisma.UserVocabularyWhereInput = {
      userId,
      ...(query.sourceLanguage && { sourceLanguage: query.sourceLanguage }),
      ...(query.targetLanguage && { targetLanguage: query.targetLanguage }),
      OR: [
        // Weak items that user failed previously
        { status: LearningStatus.INCOMPLETE },
        // Items scheduled for review that are due or overdue
        { nextReviewAt: { lte: now } },
        // Newly saved items ready for first practice
        { status: { in: [LearningStatus.SAVED, LearningStatus.NEW] } },
      ],
    };

    // Sort by priorityScore descending so the weakest / most urgent items are practiced first
    const items = await this.prisma.userVocabulary.findMany({
      where,
      take: limit,
      orderBy: [
        { priorityScore: 'desc' },
        { nextReviewAt: 'asc' },
      ],
    });

    return items.map((item) => ({
      id: item.id,
      word: item.word,
      sourceLanguage: item.sourceLanguage,
      targetLanguage: item.targetLanguage,
      article: item.article,
      plural: item.plural,
      translation: item.translation,
      definition: item.definition,
      partOfSpeech: item.partOfSpeech,
      contextSentence: item.contextSentence,
      contextSourceUrl: item.contextSourceUrl,
      tags: item.tags,
      notes: item.notes,
      status: item.status,
      masteryScore: item.masteryScore,
      consecutiveCorrect: item.consecutiveCorrect,
      totalAttempts: item.totalAttempts,
      correctAttempts: item.correctAttempts,
      priorityScore: item.priorityScore,
      nextReviewAt: item.nextReviewAt,
    }));
  }

  /**
   * Submits an exercise attempt, applies the 6-tier mastery state machine,
   * updates the vocabulary item, and logs the attempt.
   */
  async recordAttempt(userId: string, dto: SubmitExerciseInput) {
    await this.prisma.ensureDefaultUser(userId);

    const vocabulary = await this.prisma.userVocabulary.findFirst({
      where: { id: dto.userVocabularyId, userId },
    });

    if (!vocabulary) {
      throw new NotFoundException(
        `Vocabulary item with ID "${dto.userVocabularyId}" not found`,
      );
    }

    const previousStatus = vocabulary.status;
    const previousMasteryScore = vocabulary.masteryScore;

    // Run the Mastery State Machine
    const calculated = MasteryEngine.calculate({
      currentStatus: vocabulary.status,
      masteryScore: vocabulary.masteryScore,
      consecutiveCorrect: vocabulary.consecutiveCorrect,
      totalAttempts: vocabulary.totalAttempts,
      correctAttempts: vocabulary.correctAttempts,
      intervalDays: vocabulary.intervalDays,
      easeFactor: vocabulary.easeFactor,
      nextReviewAt: vocabulary.nextReviewAt,
      isCorrect: dto.isCorrect,
    });

    // Execute atomic update of vocabulary item and creation of exercise attempt log
    const [updatedVocabulary, attemptRecord] = await this.prisma.$transaction([
      this.prisma.userVocabulary.update({
        where: { id: vocabulary.id },
        data: {
          status: calculated.newStatus,
          masteryScore: calculated.newMasteryScore,
          consecutiveCorrect: calculated.newConsecutiveCorrect,
          totalAttempts: calculated.newTotalAttempts,
          correctAttempts: calculated.newCorrectAttempts,
          intervalDays: calculated.newIntervalDays,
          easeFactor: calculated.newEaseFactor,
          nextReviewAt: calculated.nextReviewAt,
          lastReviewedAt: new Date(),
          priorityScore: calculated.priorityScore,
        },
      }),
      this.prisma.exerciseAttempt.create({
        data: {
          userId,
          userVocabularyId: vocabulary.id,
          exerciseType: dto.exerciseType as ExerciseType,
          isCorrect: dto.isCorrect,
          userResponse: dto.userResponse?.trim(),
          timeSpentMs: dto.timeSpentMs,
          previousStatus,
          newStatus: calculated.newStatus,
          previousMasteryScore,
          newMasteryScore: calculated.newMasteryScore,
          attemptedAt: new Date(),
        },
      }),
    ]);

    return {
      attemptId: attemptRecord.id,
      vocabularyId: updatedVocabulary.id,
      word: updatedVocabulary.word,
      isCorrect: dto.isCorrect,
      previousStatus,
      newStatus: calculated.newStatus,
      previousMasteryScore,
      newMasteryScore: calculated.newMasteryScore,
      consecutiveCorrect: calculated.newConsecutiveCorrect,
      intervalDays: calculated.newIntervalDays,
      nextReviewAt: calculated.nextReviewAt,
      statusChanged: previousStatus !== calculated.newStatus,
    };
  }

  /**
   * Aggregates learning statistics for the user and optional language pair.
   */
  async getStats(
    userId: string,
    sourceLanguage?: string,
    targetLanguage?: string,
  ) {
    const where: Prisma.UserVocabularyWhereInput = {
      userId,
      ...(sourceLanguage && { sourceLanguage }),
      ...(targetLanguage && { targetLanguage }),
    };

    const now = new Date();

    const [
      statusGroups,
      dueWords,
      totalAttempts,
      aggregateResult,
    ] = await Promise.all([
      // 1. Single query to group and count all 6 learning statuses
      this.prisma.userVocabulary.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      // 2. Scheduled reviews due or overdue
      this.prisma.userVocabulary.count({
        where: { ...where, nextReviewAt: { lte: now } },
      }),
      // 3. Total attempts by user
      this.prisma.exerciseAttempt.count({ where: { userId } }),
      // 4. Total count and average mastery score
      this.prisma.userVocabulary.aggregate({
        where,
        _count: { _all: true },
        _avg: { masteryScore: true },
      }),
    ]);

    const statusCounts: Record<LearningStatus, number> = {
      [LearningStatus.SAVED]: 0,
      [LearningStatus.NEW]: 0,
      [LearningStatus.LEARNING]: 0,
      [LearningStatus.INCOMPLETE]: 0,
      [LearningStatus.PROFICIENT]: 0,
      [LearningStatus.MASTERED]: 0,
    };

    for (const group of statusGroups) {
      statusCounts[group.status] = group._count._all;
    }

    return {
      sourceLanguage: sourceLanguage || 'all',
      targetLanguage: targetLanguage || 'all',
      totalWords: aggregateResult._count._all,
      savedWords: statusCounts[LearningStatus.SAVED],
      newWords: statusCounts[LearningStatus.NEW],
      learningWords: statusCounts[LearningStatus.LEARNING],
      incompleteWords: statusCounts[LearningStatus.INCOMPLETE],
      proficientWords: statusCounts[LearningStatus.PROFICIENT],
      masteredWords: statusCounts[LearningStatus.MASTERED],
      exercisesDueToday: dueWords,
      totalExercisesCompleted: totalAttempts,
      averageMasteryScore: Number(
        (aggregateResult._avg.masteryScore || 0).toFixed(1),
      ),
    };
  }
}
