import { z } from 'zod';

export { z, ZodSchema, ZodError } from 'zod';

// ==========================================
// Pagination & Common Schemas
// ==========================================
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().trim().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

// ==========================================
// Authentication Schemas (Ready for future use)
// ==========================================
export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(100),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  nativeLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ==========================================
// Dictionary & Lookup Schemas
// ==========================================
export const lookupWordSchema = z.object({
  word: z.string().trim().min(1, 'Word cannot be empty').max(100),
  language: z.string().min(2).max(10).default('de'),
  targetLanguage: z.string().min(2).max(10).default('en'),
  contextSentence: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type LookupWordInput = z.infer<typeof lookupWordSchema>;

// ==========================================
// 6-Tier Learning Status & Vocabulary Schemas
// ==========================================
export const learningStatusSchema = z.enum([
  'SAVED',
  'NEW',
  'LEARNING',
  'INCOMPLETE',
  'PROFICIENT',
  'MASTERED',
]);

export const createVocabularySchema = z.object({
  word: z.string().trim().min(1, 'Word is required').max(100, 'Word must be 100 characters or fewer'),
  sourceLanguage: z.string().trim().min(2, 'Source language must be at least 2 characters').max(10).default('de'),
  targetLanguage: z.string().trim().min(2, 'Target language must be at least 2 characters').max(10).default('en'),
  article: z.string().trim().max(10).optional().or(z.literal('')),
  plural: z.string().trim().max(100).optional().or(z.literal('')),
  translation: z.string().trim().max(500).optional().or(z.literal('')),
  definition: z.string().trim().max(1000).optional().or(z.literal('')),
  partOfSpeech: z.string().trim().max(50).optional().or(z.literal('')),
  contextSentence: z.string().trim().max(2000).optional().or(z.literal('')),
  contextSourceUrl: z
    .string()
    .trim()
    .url('Source URL must be a valid web link starting with http:// or https://')
    .max(2048)
    .optional()
    .or(z.literal('')),
  tags: z.array(z.string().trim().max(50)).max(20).default([]),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  dictionaryEntryId: z.string().uuid().optional().or(z.literal('')),
});

export type CreateVocabularyInput = z.infer<typeof createVocabularySchema>;

export const updateVocabularySchema = z.object({
  word: z.string().trim().min(1, 'Word cannot be empty').max(100, 'Word must be 100 characters or fewer').optional(),
  sourceLanguage: z.string().trim().min(2).max(10).optional(),
  targetLanguage: z.string().trim().min(2).max(10).optional(),
  article: z.string().trim().max(10).optional().or(z.literal('')),
  plural: z.string().trim().max(100).optional().or(z.literal('')),
  translation: z.string().trim().max(500).optional().or(z.literal('')),
  definition: z.string().trim().max(1000).optional().or(z.literal('')),
  partOfSpeech: z.string().trim().max(50).optional().or(z.literal('')),
  contextSentence: z.string().trim().max(2000).optional().or(z.literal('')),
  contextSourceUrl: z
    .string()
    .trim()
    .url('Source URL must be a valid web link starting with http:// or https://')
    .max(2048)
    .optional()
    .or(z.literal('')),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  status: learningStatusSchema.optional(),
});

export type UpdateVocabularyInput = z.infer<typeof updateVocabularySchema>;

export const queryVocabularySchema = paginationQuerySchema.extend({
  sourceLanguage: z.string().trim().min(2).max(10).optional(),
  targetLanguage: z.string().trim().min(2).max(10).optional(),
  status: learningStatusSchema.optional(),
  tag: z.string().trim().optional(),
  minMastery: z.coerce.number().min(0).max(100).optional(),
  maxMastery: z.coerce.number().min(0).max(100).optional(),
});

export type QueryVocabularyInput = z.infer<typeof queryVocabularySchema>;

// ==========================================
// Exercise & Practice Schemas
// ==========================================
export const exerciseTypeSchema = z.enum([
  'FLASHCARD',
  'MULTIPLE_CHOICE',
  'TYPING',
  'CLOZE',
  'ARTICLE_GUESS',
]);

export const submitExerciseSchema = z.object({
  userVocabularyId: z.string().uuid('Invalid vocabulary ID'),
  exerciseType: exerciseTypeSchema,
  isCorrect: z.boolean(),
  userResponse: z.string().trim().max(500).optional(),
  timeSpentMs: z.number().int().nonnegative().optional(),
});

export type SubmitExerciseInput = z.infer<typeof submitExerciseSchema>;

export const practiceQueueQuerySchema = z.object({
  sourceLanguage: z.string().trim().min(2).max(10).optional(),
  targetLanguage: z.string().trim().min(2).max(10).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  includeIncomplete: z.coerce.boolean().default(true),
  exerciseType: exerciseTypeSchema.optional(),
});

export type PracticeQueueQueryInput = z.infer<typeof practiceQueueQuerySchema>;
