import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  IDictionaryAdapter,
  DictionaryLookupRequest,
} from './adapters/dictionary.adapter.interface';
import { DICTIONARY_PIPELINE } from './adapters/dictionary.adapter.interface';

interface L1CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);
  // High-performance in-memory L1 cache (word + source + target -> entry)
  private readonly l1Cache = new Map<string, L1CacheEntry>();
  private readonly L1_TTL_MS = 1000 * 60 * 60; // 1 hour TTL
  private readonly MAX_L1_ENTRIES = 5000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DICTIONARY_PIPELINE)
    private readonly pipeline: IDictionaryAdapter,
  ) {}

  private getL1(key: string): any | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.l1Cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setL1(key: string, data: any) {
    if (this.l1Cache.size >= this.MAX_L1_ENTRIES) {
      // Evict oldest 20% entries when capacity is reached
      const keysToDelete = Array.from(this.l1Cache.keys()).slice(0, 1000);
      keysToDelete.forEach((k) => this.l1Cache.delete(k));
    }
    this.l1Cache.set(key, {
      data,
      expiresAt: Date.now() + this.L1_TTL_MS,
    });
  }

  /**
   * Looks up a word definition & translation with multi-tier caching (L1 Memory -> L2 DB -> Pipeline).
   */
  async lookup(req: DictionaryLookupRequest) {
    const rawWord = req.word.trim();
    const normalizedWord = rawWord.toLowerCase();
    const sourceLanguage = req.sourceLanguage || 'de';
    const targetLanguage = req.targetLanguage || 'en';
    const cacheKey = `${normalizedWord}:${sourceLanguage}:${targetLanguage}`;

    // 1. Check ultra-fast in-memory L1 cache (< 1ms)
    if (!req.contextSentence) {
      const l1Cached = this.getL1(cacheKey);
      if (l1Cached) {
        return l1Cached;
      }
    }

    // 2. Check Neon database L2 cache
    const cached = await this.prisma.dictionaryEntry.findUnique({
      where: { word: normalizedWord },
    });

    if (cached) {
      const existingTranslations = (cached.translations as any[]) || [];
      const hasTargetTranslation = existingTranslations.some(
        (t) => t.targetLanguage === targetLanguage,
      );

      // If L2 cache has the required target language translation, cache in L1 and return immediately
      if (hasTargetTranslation && !req.contextSentence) {
        this.setL1(cacheKey, cached);
        return cached;
      }
    }

    // 2. Query through the multi-tier pipeline (AI RAG -> Translation Memory -> Dictionary)
    const result = await this.pipeline.lookup({
      word: rawWord,
      sourceLanguage,
      targetLanguage,
      contextSentence: req.contextSentence,
      contextSourceUrl: req.contextSourceUrl,
    });

    if (!result) {
      return cached || null;
    }

    // 3. Cache or update in NeonDB
    try {
      if (cached) {
        const mergedTranslations = [
          ...((cached.translations as any[]) || []),
          ...result.translations,
        ];
        // Deduplicate translations by targetLanguage + translation string
        const uniqueTranslations = mergedTranslations.filter(
          (t, idx, self) =>
            idx ===
            self.findIndex(
              (other) =>
                other.targetLanguage === t.targetLanguage &&
                other.translation?.toLowerCase() === t.translation?.toLowerCase(),
            ),
        );

        const updated = await this.prisma.dictionaryEntry.update({
          where: { id: cached.id },
          data: {
            article: result.article || cached.article,
            plural: result.plural || cached.plural,
            translations: uniqueTranslations,
            definitions:
              result.definitions.length > 0
                ? (result.definitions as any)
                : cached.definitions,
            sourceProvider: result.sourceProvider,
          },
        });
        this.setL1(cacheKey, updated);
        return updated;
      }

      const created = await this.prisma.dictionaryEntry.create({
        data: {
          word: normalizedWord,
          language: sourceLanguage,
          article: result.article,
          plural: result.plural,
          phonetic: result.phonetic,
          audioUrl: result.audioUrl,
          definitions: result.definitions as any,
          translations: result.translations as any,
          sourceProvider: result.sourceProvider,
        },
      });
      this.setL1(cacheKey, created);
      return created;
    } catch (err: any) {
      this.logger.warn(`Failed to cache dictionary entry for "${rawWord}": ${err.message}`);
      return result;
    }
  }
}
