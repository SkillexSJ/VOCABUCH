import {
  UserVocabulary,
  CreateVocabularyDto,
  UpdateVocabularyDto,
  PaginatedResponse,
  SubmitExerciseDto,
  UserProgressStats,
  DictionaryEntry,
} from '@vocabulary/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

export interface ApiIssue {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  public issues: ApiIssue[] = [];

  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    let userFriendlyMessage = message;
    const issues: ApiIssue[] = [];

    if (Array.isArray(details) && details.length > 0) {
      for (const item of details) {
        if (typeof item === 'object' && item !== null) {
          const field = item.field;
          const msg = item.message || 'Invalid value';
          issues.push({ field, message: msg });
        }
      }

      if (issues.length > 0) {
        userFriendlyMessage = issues
          .map((i) => (i.field ? `${i.field}: ${i.message}` : i.message))
          .join('. ');
      }
    }

    super(userFriendlyMessage);
    this.name = 'ApiError';
    this.issues = issues;
  }
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory client cache for zero-latency UI rendering and tab switching
const clientCache = new Map<string, CacheEntry<any>>();

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) {
      clientCache.delete(key);
    }
  }
}

interface FetcherOptions extends RequestInit {
  cacheTtlMs?: number; // Optional cache TTL in milliseconds
  bypassCache?: boolean;
}

async function fetcher<T>(endpoint: string, options?: FetcherOptions): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const ttl = options?.cacheTtlMs;
  const shouldCache = isGet && !options?.bypassCache && ttl !== undefined && ttl > 0;

  // 1. Check client-side memory cache (< 1ms instant response)
  if (shouldCache) {
    const cached = clientCache.get(endpoint);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorData: any = {};
      try {
        errorData = await res.json();
      } catch {
        // non-JSON response
      }

      const err = errorData?.error || {};
      throw new ApiError(
        res.status,
        err.code || 'API_ERROR',
        err.message || `Request failed with status ${res.status}`,
        err.details,
      );
    }

    if (res.status === 204) {
      return {} as T;
    }

    const json = await res.json();
    const result: T = json.data !== undefined ? json.data : json;

    // 2. Store in cache if enabled
    if (shouldCache) {
      clientCache.set(endpoint, {
        data: result,
        expiresAt: Date.now() + ttl,
      });
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Cannot connect to API server at ${API_BASE}. Make sure the backend is running.`,
    );
  }
}

export const api = {
  vocabulary: {
    list: (
      params?: {
        sourceLanguage?: string;
        targetLanguage?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
      },
      bypassCache = false,
    ) => {
      const q = new URLSearchParams();
      if (params?.sourceLanguage) q.set('sourceLanguage', params.sourceLanguage);
      if (params?.targetLanguage) q.set('targetLanguage', params.targetLanguage);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return fetcher<PaginatedResponse<UserVocabulary>>(`/vocabulary?${q.toString()}`, {
        cacheTtlMs: 30_000, // 30s cache for fast tab toggling
        bypassCache,
      });
    },

    get: (id: string, bypassCache = false) =>
      fetcher<UserVocabulary>(`/vocabulary/${id}`, {
        cacheTtlMs: 60_000,
        bypassCache,
      }),

    check: (word: string, sourceLanguage = 'de') => {
      const q = new URLSearchParams({ word, sourceLanguage });
      return fetcher<{ exists: boolean; vocabulary?: UserVocabulary }>(
        `/vocabulary/check?${q.toString()}`,
        { cacheTtlMs: 300_000 }, // 5 min cache for duplicate checks
      );
    },

    create: async (dto: CreateVocabularyDto) => {
      const result = await fetcher<UserVocabulary>('/vocabulary', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      // Invalidate vocabulary and stats caches immediately
      invalidateCache('/vocabulary');
      invalidateCache('/practice');
      return result;
    },

    update: async (id: string, dto: UpdateVocabularyDto) => {
      const result = await fetcher<UserVocabulary>(`/vocabulary/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
      // Invalidate vocabulary and stats caches immediately
      invalidateCache('/vocabulary');
      invalidateCache('/practice');
      return result;
    },

    delete: async (id: string) => {
      const result = await fetcher<void>(`/vocabulary/${id}`, {
        method: 'DELETE',
      });
      // Invalidate vocabulary and stats caches immediately
      invalidateCache('/vocabulary');
      invalidateCache('/practice');
      return result;
    },
  },

  practice: {
    getQueue: (
      params?: {
        sourceLanguage?: string;
        targetLanguage?: string;
        limit?: number;
      },
      bypassCache = false,
    ) => {
      const q = new URLSearchParams();
      if (params?.sourceLanguage) q.set('sourceLanguage', params.sourceLanguage);
      if (params?.targetLanguage) q.set('targetLanguage', params.targetLanguage);
      if (params?.limit) q.set('limit', String(params.limit));
      return fetcher<UserVocabulary[]>(`/practice/queue?${q.toString()}`, {
        cacheTtlMs: 15_000,
        bypassCache,
      });
    },

    submitAttempt: async (dto: SubmitExerciseDto) => {
      const result = await fetcher<{
        attemptId: string;
        vocabularyId: string;
        word: string;
        isCorrect: boolean;
        previousStatus: string;
        newStatus: string;
        previousMasteryScore: number;
        newMasteryScore: number;
        nextReviewAt: string;
        statusChanged: boolean;
      }>('/practice/attempt', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      // Submission updates stats and vocabulary mastery
      invalidateCache('/practice');
      invalidateCache('/vocabulary');
      return result;
    },

    getStats: (
      sourceLanguage?: string,
      targetLanguage?: string,
      bypassCache = false,
    ) => {
      const q = new URLSearchParams();
      if (sourceLanguage) q.set('sourceLanguage', sourceLanguage);
      if (targetLanguage) q.set('targetLanguage', targetLanguage);
      return fetcher<UserProgressStats>(`/practice/stats?${q.toString()}`, {
        cacheTtlMs: 30_000, // 30s cache
        bypassCache,
      });
    },
  },

  dictionary: {
    lookup: (
      word: string,
      language = 'en',
      targetLanguage = 'en',
      contextSentence?: string,
    ) => {
      const q = new URLSearchParams({ word, language, targetLanguage });
      if (contextSentence) q.set('contextSentence', contextSentence);
      return fetcher<DictionaryEntry>(`/dictionary/lookup?${q.toString()}`, {
        cacheTtlMs: 1000 * 60 * 60 * 2, // 2-hour client cache for definitions & articles
      });
    },
  },
};
