import {
  CreateVocabularyDto,
  UserVocabulary,
  UserProgressStats,
  DictionaryEntry,
} from '@vocabulary/types';

export class ExtensionApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ExtensionApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // 1. Route via background script proxy to completely bypass Mixed Content, CSP, and CORS
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'API_PROXY_REQUEST',
            endpoint,
            options,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ fallback: true });
            } else {
              resolve(res);
            }
          },
        );
      });

      if (!response?.fallback) {
        if (response?.success) {
          return response.data as T;
        } else {
          throw new ExtensionApiError(
            response?.status || 0,
            response?.code || 'NETWORK_ERROR',
            response?.error ||
              'Cannot connect to API server at http://localhost:4000/v1. Make sure the backend is running.',
          );
        }
      }
    } catch (e) {
      if (e instanceof ExtensionApiError) throw e;
      // Fallback to direct fetch
    }
  }

  // 2. Direct fetch fallback (for popup or standalone testing)
  return directFetch<T>(endpoint, options);
}

async function directFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrls = ['http://localhost:4000/v1', 'http://127.0.0.1:4000/v1'];
  let lastErr: any = null;

  for (const base of baseUrls) {
    try {
      const res = await fetch(`${base}${endpoint}`, {
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
          // non-JSON
        }
        const err = errorData?.error || {};
        throw new ExtensionApiError(
          res.status,
          err.code || 'API_ERROR',
          err.message || `Request failed with status ${res.status}`,
          err.details,
        );
      }

      if (res.status === 204) return {} as T;
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (err: any) {
      lastErr = err;
      if (err instanceof ExtensionApiError) throw err;
    }
  }

  throw new ExtensionApiError(
    0,
    'NETWORK_ERROR',
    'Cannot connect to API server at http://localhost:4000/v1. Make sure the backend is running.',
  );
}

export const extensionApi = {
  checkWord: (word: string, sourceLanguage = 'de') => {
    const q = new URLSearchParams({ word, sourceLanguage });
    return request<{ exists: boolean; vocabulary?: UserVocabulary }>(
      `/vocabulary/check?${q.toString()}`,
    );
  },

  saveWord: (dto: CreateVocabularyDto) =>
    request<UserVocabulary>('/vocabulary', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  lookupWord: (
    word: string,
    language = 'de',
    targetLanguage = 'en',
    contextSentence?: string,
  ) => {
    const q = new URLSearchParams({
      word,
      language,
      targetLanguage,
      ...(contextSentence ? { contextSentence } : {}),
    });
    return request<DictionaryEntry>(`/dictionary/lookup?${q.toString()}`);
  },

  getStats: (sourceLanguage?: string, targetLanguage?: string) => {
    const q = new URLSearchParams();
    if (sourceLanguage) q.set('sourceLanguage', sourceLanguage);
    if (targetLanguage) q.set('targetLanguage', targetLanguage);
    return request<UserProgressStats>(`/practice/stats?${q.toString()}`);
  },
};
