export interface DefinitionResult {
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface TranslationResult {
  targetLanguage: string;
  translation: string;
  matchQuality?: number;
  contextNote?: string;
}

export interface DictionaryLookupRequest {
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
  contextSentence?: string;
  contextSourceUrl?: string;
}

export interface DictionaryLookupResult {
  word: string;
  language: string;
  article?: string; // 'der' | 'die' | 'das'
  plural?: string;  // e.g. '-e (die Hunde)', '¨-er'
  phonetic?: string;
  audioUrl?: string;
  partOfSpeech?: string;
  definitions: DefinitionResult[];
  translations: TranslationResult[];
  sourceProvider: string;
  aiGrammarNote?: string;
  aiMnemonic?: string;
}

export interface IDictionaryAdapter {
  readonly providerName: string;
  isAvailable(): boolean;
  lookup(req: DictionaryLookupRequest): Promise<DictionaryLookupResult | null>;
}

export const DICTIONARY_ADAPTER = Symbol('DICTIONARY_ADAPTER');
export const DICTIONARY_PIPELINE = Symbol('DICTIONARY_PIPELINE');
