import { Injectable, Logger } from '@nestjs/common';
import {
  IDictionaryAdapter,
  DictionaryLookupRequest,
  DictionaryLookupResult,
  TranslationResult,
} from './dictionary.adapter.interface';

@Injectable()
export class TranslationMemoryAdapter implements IDictionaryAdapter {
  readonly providerName = 'translation-memory';
  private readonly logger = new Logger(TranslationMemoryAdapter.name);

  isAvailable(): boolean {
    return true;
  }

  async lookup(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    const rawWord = req.word.trim();
    if (!rawWord) return null;

    // Clean German article if present for better dictionary matching
    const cleanWord = rawWord.replace(/^(der|die|das)\s+/i, '').trim();

    // 1. Try MyMemory Translation Memory API
    const myMemoryResult = await this.queryMyMemory(
      cleanWord,
      req.sourceLanguage,
      req.targetLanguage,
    );

    if (myMemoryResult && myMemoryResult.length > 0) {
      return {
        word: rawWord,
        language: req.sourceLanguage,
        definitions: [],
        translations: myMemoryResult,
        sourceProvider: 'mymemory',
      };
    }

    // 2. Fallback to Google Translate public endpoint
    const googleResult = await this.queryGoogleTranslate(
      cleanWord,
      req.sourceLanguage,
      req.targetLanguage,
    );

    if (googleResult) {
      return {
        word: rawWord,
        language: req.sourceLanguage,
        definitions: [],
        translations: [
          {
            targetLanguage: req.targetLanguage,
            translation: googleResult,
            matchQuality: 90,
          },
        ],
        sourceProvider: 'google-translate',
      };
    }

    return null;
  }

  /**
   * Queries MyMemory Translation Memory API.
   */
  private async queryMyMemory(
    word: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResult[] | null> {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${sourceLang}|${targetLang}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) return null;
      const data = await res.json();

      if (
        data?.responseData?.translatedText &&
        !data.responseData.translatedText.startsWith('MYMEMORY WARNING')
      ) {
        const primaryTranslation = data.responseData.translatedText.trim();
        const results: TranslationResult[] = [
          {
            targetLanguage: targetLang,
            translation: primaryTranslation,
            matchQuality: Math.round(data.responseData.match || 100),
          },
        ];

        // Add additional matches if available
        if (Array.isArray(data.matches)) {
          for (const m of data.matches) {
            const text = m.translation?.trim();
            if (
              text &&
              text.toLowerCase() !== primaryTranslation.toLowerCase() &&
              !text.startsWith('MYMEMORY WARNING') &&
              !results.some((r) => r.translation.toLowerCase() === text.toLowerCase())
            ) {
              results.push({
                targetLanguage: targetLang,
                translation: text,
                matchQuality: Math.round(m.quality || 70),
              });
              if (results.length >= 3) break;
            }
          }
        }

        return results;
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`MyMemory query failed for "${word}": ${err.message}`);
      return null;
    }
  }

  /**
   * Queries Google Translate public single translation endpoint as high-availability fallback.
   */
  private async queryGoogleTranslate(
    word: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string | null> {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) return null;
      const data = await res.json();

      if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]?.[0]) {
        return data[0][0][0].trim();
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`Google Translate query failed for "${word}": ${err.message}`);
      return null;
    }
  }
}
