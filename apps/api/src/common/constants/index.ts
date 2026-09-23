export const DEFAULT_USER_ID = 'default-user';

export const SUPPORTED_LANGUAGES = {
  GERMAN: 'de',
  ENGLISH: 'en',
  BANGLA: 'bn',
} as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];

export const DEFAULT_LANGUAGE_PAIRS = [
  { source: 'de', target: 'en', label: 'German → English' },
  { source: 'en', target: 'bn', label: 'English → Bangla' },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
