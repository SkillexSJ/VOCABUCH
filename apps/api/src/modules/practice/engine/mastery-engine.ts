import { LearningStatus } from '../../../../prisma/generated/enums';

export interface MasteryEngineInput {
  currentStatus: LearningStatus;
  masteryScore: number;
  consecutiveCorrect: number;
  totalAttempts: number;
  correctAttempts: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: Date;
  isCorrect: boolean;
}

export interface MasteryEngineOutput {
  newStatus: LearningStatus;
  newMasteryScore: number;
  newConsecutiveCorrect: number;
  newTotalAttempts: number;
  newCorrectAttempts: number;
  newIntervalDays: number;
  newEaseFactor: number;
  nextReviewAt: Date;
  priorityScore: number;
}

export class MasteryEngine {
  /**
   * Calculates the state transition and scheduling metrics following an exercise attempt.
   */
  public static calculate(input: MasteryEngineInput): MasteryEngineOutput {
    const {
      currentStatus,
      masteryScore,
      consecutiveCorrect,
      totalAttempts,
      correctAttempts,
      intervalDays,
      easeFactor,
      isCorrect,
    } = input;

    const newTotalAttempts = totalAttempts + 1;
    const newCorrectAttempts = isCorrect
      ? correctAttempts + 1
      : correctAttempts;
    let newStatus = currentStatus;
    let newConsecutiveCorrect = isCorrect ? consecutiveCorrect + 1 : 0;
    let newIntervalDays = intervalDays;
    let newEaseFactor = easeFactor;

    if (!isCorrect) {
      // ----------------------------------------------------
      // WRONG ANSWER FLOW:
      // Item immediately becomes or remains INCOMPLETE.
      // Interval resets to 1 day for immediate retesting.
      // Ease factor decreases.
      // ----------------------------------------------------
      newStatus = LearningStatus.INCOMPLETE;
      newIntervalDays = 1;
      newEaseFactor = Math.max(1.3, easeFactor - 0.2);
    } else {
      // ----------------------------------------------------
      // CORRECT ANSWER FLOW:
      // Progressive consolidation based on streaks & intervals
      // ----------------------------------------------------
      newEaseFactor = Math.min(3.0, easeFactor + 0.1);

      switch (currentStatus) {
        case LearningStatus.SAVED:
        case LearningStatus.NEW:
          // First successful exercise graduates word into active learning
          newStatus = LearningStatus.LEARNING;
          newIntervalDays = 1;
          break;

        case LearningStatus.INCOMPLETE:
          // Requires 2 consecutive correct answers to graduate out of INCOMPLETE
          if (newConsecutiveCorrect >= 2) {
            newStatus = LearningStatus.LEARNING;
            newIntervalDays = 2;
          } else {
            newIntervalDays = 1;
          }
          break;

        case LearningStatus.LEARNING:
          // Interval expands with ease factor: 1 -> 3 -> 7...
          newIntervalDays = Math.max(
            2,
            Math.round(intervalDays * newEaseFactor),
          );
          if (newConsecutiveCorrect >= 3 && newIntervalDays >= 7) {
            newStatus = LearningStatus.PROFICIENT;
          }
          break;

        case LearningStatus.PROFICIENT:
          newIntervalDays = Math.round(intervalDays * newEaseFactor);
          if (newConsecutiveCorrect >= 6 && newIntervalDays >= 30) {
            newStatus = LearningStatus.MASTERED;
          }
          break;

        case LearningStatus.MASTERED:
          // Maintenance review: long-term spacing (60-90 days)
          newIntervalDays = Math.min(
            90,
            Math.round(intervalDays * newEaseFactor),
          );
          break;
      }
    }

    // Calculate continuous Mastery Score (0.0 to 100.0%)
    const newMasteryScore = this.computeMasteryScore(
      newStatus,
      newCorrectAttempts,
      newTotalAttempts,
      newConsecutiveCorrect,
      newIntervalDays,
    );

    // Schedule next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newIntervalDays);

    // Calculate dynamic priority score for queue ordering
    const priorityScore = this.computePriorityScore(
      newStatus,
      newMasteryScore,
      nextReviewAt,
    );

    return {
      newStatus,
      newMasteryScore,
      newConsecutiveCorrect,
      newTotalAttempts,
      newCorrectAttempts,
      newIntervalDays,
      newEaseFactor,
      nextReviewAt,
      priorityScore,
    };
  }

  /**
   * Continuous mastery score calculation (0 - 100).
   */
  public static computeMasteryScore(
    status: LearningStatus,
    correctAttempts: number,
    totalAttempts: number,
    consecutiveCorrect: number,
    intervalDays: number,
  ): number {
    if (totalAttempts === 0) return 0.0;

    const accuracyRate = (correctAttempts / totalAttempts) * 100;
    const streakBonus = Math.min(consecutiveCorrect * 5, 25);
    const intervalBonus = Math.min((intervalDays / 30) * 25, 25);

    let baseScore = accuracyRate * 0.5 + streakBonus + intervalBonus;

    // Apply status guardrails
    switch (status) {
      case LearningStatus.SAVED:
        return 0.0;
      case LearningStatus.NEW:
        return Math.min(baseScore, 20.0);
      case LearningStatus.INCOMPLETE:
        return Math.min(baseScore, 35.0);
      case LearningStatus.LEARNING:
        return Math.min(Math.max(baseScore, 20.0), 65.0);
      case LearningStatus.PROFICIENT:
        return Math.min(Math.max(baseScore, 65.0), 89.0);
      case LearningStatus.MASTERED:
        return Math.min(Math.max(baseScore, 90.0), 100.0);
      default:
        return 0.0;
    }
  }

  /**
   * Dynamic Priority Score calculation for practice sessions.
   * Higher score = placed earlier in the queue.
   */
  public static computePriorityScore(
    status: LearningStatus,
    masteryScore: number,
    nextReviewAt: Date,
  ): number {
    const now = new Date();
    const overdueDays = Math.max(
      0,
      (now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Base weight by status
    const statusWeight: Record<LearningStatus, number> = {
      [LearningStatus.INCOMPLETE]: 60, // Highest priority: retest weak items
      [LearningStatus.NEW]: 40, // Introduce new items
      [LearningStatus.LEARNING]: 30, // Active consolidation
      [LearningStatus.SAVED]: 20,
      [LearningStatus.PROFICIENT]: 10,
      [LearningStatus.MASTERED]: 0,
    };

    const overdueBonus = Math.min(overdueDays * 10, 50);
    const weaknessBonus = (100 - masteryScore) * 0.3;

    return Number(
      (statusWeight[status] + overdueBonus + weaknessBonus).toFixed(2),
    );
  }
}
