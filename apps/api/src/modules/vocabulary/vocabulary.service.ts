import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateVocabularyDto,
  UpdateVocabularyDto,
  PaginatedResponse,
} from '@vocabulary/types';
import { QueryVocabularyInput } from '@vocabulary/validation';
import { LearningStatus, Prisma } from '../../../prisma/generated/client';
import { MasteryEngine } from '../practice/engine/mastery-engine';

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves a new vocabulary item (starts with SAVED status).
   * Prevents duplicate words in the same source language.
   */
  async create(userId: string, dto: CreateVocabularyDto) {
    // Ensure the user exists in database before inserting vocabulary
    await this.prisma.ensureDefaultUser(userId);

    const trimmedWord = dto.word.trim();
    const sourceLanguage = dto.sourceLanguage || 'de';
    const targetLanguage = dto.targetLanguage || 'en';

    // 1. Strict duplicate check (case-insensitive)
    const existing = await this.prisma.userVocabulary.findFirst({
      where: {
        userId,
        sourceLanguage,
        word: { equals: trimmedWord, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_WORD',
        message: `"${trimmedWord}" is already in your ${sourceLanguage.toUpperCase()} vocabulary list.`,
        existingId: existing.id,
        status: existing.status,
        masteryScore: existing.masteryScore,
      });
    }

    const initialStatus = LearningStatus.SAVED;

    const initialPriority = MasteryEngine.computePriorityScore(
      initialStatus,
      0,
      new Date(),
    );

    return this.prisma.userVocabulary.create({
      data: {
        userId,
        word: dto.word.trim(),
        sourceLanguage,
        targetLanguage,
        article: dto.article?.trim() || null,
        plural: dto.plural?.trim() || null,
        translation: dto.translation?.trim() || null,
        definition: dto.definition?.trim() || null,
        partOfSpeech: dto.partOfSpeech?.trim() || null,
        contextSentence: dto.contextSentence?.trim() || null,
        contextSourceUrl: dto.contextSourceUrl?.trim() || null,
        tags: dto.tags || [],
        notes: dto.notes?.trim() || null,
        dictionaryEntryId: dto.dictionaryEntryId?.trim() || null,
        status: initialStatus,
        masteryScore: 0.0,
        priorityScore: initialPriority,
      },
    });
  }

  /**
   * Retrieves paginated vocabulary entries with language-pair and status filtering.
   */
  async findAll(
    userId: string,
    query: QueryVocabularyInput,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserVocabularyWhereInput = {
      userId,
      ...(query.sourceLanguage && { sourceLanguage: query.sourceLanguage }),
      ...(query.targetLanguage && { targetLanguage: query.targetLanguage }),
      ...(query.status && { status: query.status as LearningStatus }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.minMastery !== undefined && {
        masteryScore: { gte: query.minMastery },
      }),
      ...(query.maxMastery !== undefined && {
        masteryScore: { lte: query.maxMastery },
      }),
      ...(query.search && {
        OR: [
          { word: { contains: query.search, mode: 'insensitive' } },
          { translation: { contains: query.search, mode: 'insensitive' } },
          { definition: { contains: query.search, mode: 'insensitive' } },
          { contextSentence: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [total, data] = await Promise.all([
      this.prisma.userVocabulary.count({ where }),
      this.prisma.userVocabulary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single vocabulary item with its exercise history.
   */
  async findOne(userId: string, id: string) {
    const item = await this.prisma.userVocabulary.findFirst({
      where: { id, userId },
      include: {
        attempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 10,
        },
        dictionaryEntry: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Vocabulary item with ID "${id}" not found`);
    }

    return item;
  }

  /**
   * Updates fields of a vocabulary item.
   */
  async update(userId: string, id: string, dto: UpdateVocabularyDto) {
    await this.findOne(userId, id);

    return this.prisma.userVocabulary.update({
      where: { id },
      data: {
        ...(dto.word !== undefined && { word: dto.word }),
        ...(dto.article !== undefined && { article: dto.article?.trim() || null }),
        ...(dto.plural !== undefined && { plural: dto.plural?.trim() || null }),
        ...(dto.translation !== undefined && { translation: dto.translation }),
        ...(dto.definition !== undefined && { definition: dto.definition }),
        ...(dto.partOfSpeech !== undefined && {
          partOfSpeech: dto.partOfSpeech,
        }),
        ...(dto.contextSentence !== undefined && {
          contextSentence: dto.contextSentence,
        }),
        ...(dto.contextSourceUrl !== undefined && {
          contextSourceUrl: dto.contextSourceUrl,
        }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && {
          status: dto.status as LearningStatus,
        }),
        ...(dto.sourceLanguage && { sourceLanguage: dto.sourceLanguage }),
        ...(dto.targetLanguage && { targetLanguage: dto.targetLanguage }),
      },
    });
  }

  /**
   * Deletes a vocabulary item.
   */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.userVocabulary.delete({ where: { id } });
  }

  /**
   * Bulk import of words.
   */
  async bulkCreate(userId: string, items: CreateVocabularyDto[]) {
    const created = [] as CreateVocabularyDto[];
    for (const item of items) {
      const createdItem = (await this.create(
        userId,
        item,
      )) as CreateVocabularyDto;
      created.push(createdItem);
    }
    return { count: created.length, items: created };
  }

  /**
   * Checks if a word already exists in the user's vocabulary.
   */
  async checkDuplicate(userId: string, word: string, sourceLanguage = 'de') {
    const trimmed = word.trim();
    if (!trimmed) return { exists: false };

    const existing = await this.prisma.userVocabulary.findFirst({
      where: {
        userId,
        sourceLanguage,
        word: { equals: trimmed, mode: 'insensitive' },
      },
    });

    return {
      exists: !!existing,
      vocabulary: existing || undefined,
    };
  }
}
