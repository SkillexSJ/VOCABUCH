import { Injectable, Logger } from '@nestjs/common';
import {
  IDictionaryAdapter,
  DictionaryLookupRequest,
  DictionaryLookupResult,
  DefinitionResult,
} from './dictionary.adapter.interface';

@Injectable()
export class FreeDictionaryAdapter implements IDictionaryAdapter {
  readonly providerName = 'free-dictionary';
  private readonly logger = new Logger(FreeDictionaryAdapter.name);

  isAvailable(): boolean {
    return true;
  }

  async lookup(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    try {
      // Only query English words (either source or target is English)
      const wordToQuery = req.sourceLanguage === 'en' ? req.word : '';
      if (!wordToQuery) return null;

      const encodedWord = encodeURIComponent(wordToQuery.trim().toLowerCase());
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodedWord}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const firstEntry = data[0];
      const definitions: DefinitionResult[] = [];
      let audioUrl: string | undefined = undefined;
      let phonetic: string | undefined = firstEntry.phonetic;
      let mainPartOfSpeech: string | undefined = undefined;

      if (Array.isArray(firstEntry.phonetics)) {
        for (const p of firstEntry.phonetics) {
          if (!audioUrl && p.audio) {
            audioUrl = p.audio;
          }
          if (!phonetic && p.text) {
            phonetic = p.text;
          }
        }
      }

      if (Array.isArray(firstEntry.meanings)) {
        for (const meaning of firstEntry.meanings) {
          const pos = meaning.partOfSpeech || 'general';
          if (!mainPartOfSpeech) mainPartOfSpeech = pos;

          if (Array.isArray(meaning.definitions)) {
            for (const def of meaning.definitions) {
              definitions.push({
                partOfSpeech: pos,
                definition: def.definition,
                example: def.example,
                synonyms: def.synonyms || [],
                antonyms: def.antonyms || [],
              });
            }
          }
        }
      }

      return {
        word: firstEntry.word || req.word,
        language: 'en',
        phonetic,
        audioUrl,
        partOfSpeech: mainPartOfSpeech,
        definitions,
        translations: [],
        sourceProvider: 'free-dictionary-api',
      };
    } catch (error) {
      this.logger.warn(
        `FreeDictionary lookup failed for "${req.word}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
