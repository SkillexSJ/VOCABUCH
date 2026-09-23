// ==========================================
// Vocabulary Platform Core Domain Types
// ==========================================

// --- Common & API Envelopes ---
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// --- Auth & User ---
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  nativeLanguage?: string;
  targetLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  role: UserRole;
}

// --- Dictionary Domain ---
export interface DefinitionItem {
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface TranslationItem {
  targetLanguage: string;
  translation: string;
  provider?: string;
}

export interface PronunciationItem {
  audioUrl?: string;
  phonetic?: string;
  accent?: string;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  language: string;
  article?: string; // 'der' | 'die' | 'das' for German nouns
  plural?: string;  // e.g. 'die Hunde', '-e', '¨-er (die Bücher)'
  phonetic?: string;
  audioUrl?: string;
  definitions: DefinitionItem[];
  translations?: TranslationItem[];
  sourceProvider: string;
  createdAt: string;
  updatedAt: string;
}

// --- 6-Tier Learning Status & Vocabulary Domain ---
// SAVED: Captured from text/browser, not yet practiced.
// NEW: Queued for first exercise introduction.
// LEARNING: Actively building initial recall.
// INCOMPLETE: Struggled / answered incorrectly, high priority retest.
// PROFICIENT: Consistent correct recall across multiple intervals.
// MASTERED: Solidified long-term memory retention.
export type LearningStatus =
  | 'SAVED'
  | 'NEW'
  | 'LEARNING'
  | 'INCOMPLETE'
  | 'PROFICIENT'
  | 'MASTERED';

export interface UserVocabulary {
  id: string;
  userId: string;
  dictionaryEntryId?: string;
  word: string;
  sourceLanguage: string; // e.g. 'de' (German) or 'en' (English)
  targetLanguage: string; // e.g. 'en' (English) or 'bn' (Bangla)
  article?: string; // 'der' | 'die' | 'das'
  plural?: string;  // e.g. 'die Hunde', '-e', '¨-er'
  translation?: string;
  definition?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  contextSourceUrl?: string;
  tags: string[];
  notes?: string;
  status: LearningStatus;
  masteryScore: number; // 0 to 100 percentage
  consecutiveCorrect: number;
  totalAttempts: number;
  correctAttempts: number;
  priorityScore: number; // Higher score = higher priority in practice queue
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVocabularyDto {
  word: string;
  sourceLanguage?: string; // defaults to 'de' if not provided
  targetLanguage?: string; // defaults to 'en' if not provided
  article?: string; // 'der' | 'die' | 'das'
  plural?: string;  // e.g. '-e (die Hunde)', '¨-er'
  translation?: string;
  definition?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  contextSourceUrl?: string;
  tags?: string[];
  notes?: string;
  dictionaryEntryId?: string;
}

export interface UpdateVocabularyDto {
  word?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  article?: string;
  plural?: string;
  translation?: string;
  definition?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  contextSourceUrl?: string;
  tags?: string[];
  notes?: string;
  status?: LearningStatus;
}

// --- Exercises & Practice Domain ---
export type ExerciseType =
  | 'FLASHCARD'
  | 'MULTIPLE_CHOICE'
  | 'TYPING'
  | 'CLOZE'
  | 'ARTICLE_GUESS';

export interface ExerciseAttempt {
  id: string;
  userId: string;
  userVocabularyId: string;
  exerciseType: ExerciseType;
  isCorrect: boolean;
  userResponse?: string;
  timeSpentMs?: number;
  previousStatus: LearningStatus;
  newStatus: LearningStatus;
  previousMasteryScore: number;
  newMasteryScore: number;
  attemptedAt: string;
}

export interface SubmitExerciseDto {
  userVocabularyId: string;
  exerciseType: ExerciseType;
  isCorrect: boolean;
  userResponse?: string;
  timeSpentMs?: number;
}

// --- Statistics Domain ---
export interface UserProgressStats {
  sourceLanguage?: string;
  targetLanguage?: string;
  totalWords: number;
  savedWords: number;
  newWords: number;
  learningWords: number;
  incompleteWords: number;
  proficientWords: number;
  masteredWords: number;
  averageMasteryScore: number;
  currentStreakDays: number;
  longestStreakDays: number;
  exercisesDueToday: number;
  totalExercisesCompleted: number;
}
