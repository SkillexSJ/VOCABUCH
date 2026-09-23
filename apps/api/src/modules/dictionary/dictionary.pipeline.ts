import { Injectable, Logger } from '@nestjs/common';
import {
  IDictionaryAdapter,
  DictionaryLookupRequest,
  DictionaryLookupResult,
  TranslationResult,
  DefinitionResult,
} from './adapters/dictionary.adapter.interface';
import { AiRagAdapter } from './adapters/ai-rag.adapter';
import { TranslationMemoryAdapter } from './adapters/translation-memory.adapter';
import { FreeDictionaryAdapter } from './adapters/free-dictionary.adapter';
import { WiktionaryGermanAdapter } from './adapters/wiktionary-german.adapter';

@Injectable()
export class DictionaryPipeline implements IDictionaryAdapter {
  readonly providerName = 'dictionary-pipeline';
  private readonly logger = new Logger(DictionaryPipeline.name);

  constructor(
    private readonly aiRagAdapter: AiRagAdapter,
    private readonly translationMemoryAdapter: TranslationMemoryAdapter,
    private readonly freeDictionaryAdapter: FreeDictionaryAdapter,
    private readonly wiktionaryGermanAdapter: WiktionaryGermanAdapter,
  ) {}

  isAvailable(): boolean {
    return true;
  }

  async lookup(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    this.logger.log(
      `Looking up "${req.word}" (${req.sourceLanguage} → ${req.targetLanguage}) [RAG context: ${req.contextSentence ? 'Yes' : 'No'}]`,
    );

    // 1. Tier 1: Try AI / RAG provider first if configured
    if (this.aiRagAdapter.isAvailable()) {
      try {
        const aiResult = await this.aiRagAdapter.lookup(req);
        if (aiResult && (aiResult.translations.length > 0 || aiResult.definitions.length > 0)) {
          this.logger.log(`Resolved "${req.word}" via AI RAG (${aiResult.sourceProvider})`);
          return aiResult;
        }
      } catch (err: any) {
        this.logger.warn(`AI RAG provider failed, falling back: ${err.message}`);
      }
    }

    // 2. Dispatch adapters concurrently in parallel for minimum response latency
    const isGermanInvolved = req.sourceLanguage === 'de' || req.targetLanguage === 'de';
    const isEnglishInvolved = req.sourceLanguage === 'en' || req.targetLanguage === 'en';

    const [germanResult, tmResult, dictResult] = await Promise.all([
      // German Grammar, Gender & Plural Tier
      isGermanInvolved
        ? this.wiktionaryGermanAdapter.lookup(req).catch((err: any) => {
            this.logger.warn(`Wiktionary German lookup failed: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),

      // Translation Memory Tier (MyMemory / Google)
      this.translationMemoryAdapter.lookup(req).catch((err: any) => {
        this.logger.warn(`Translation memory failed: ${err.message}`);
        return null;
      }),

      // English definitions, audio, and phonetics Tier
      isEnglishInvolved
        ? this.freeDictionaryAdapter.lookup(req).catch((err: any) => {
            this.logger.warn(`FreeDictionary lookup failed: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
    ]);

    // 5. Merge results into a unified response
    const translations: TranslationResult[] = [
      ...(tmResult?.translations || []),
      ...(dictResult?.translations || []),
      ...(germanResult?.translations || []),
    ];

    const definitions: DefinitionResult[] = [
      ...(dictResult?.definitions || []),
      ...(germanResult?.definitions || []),
      ...(tmResult?.definitions || []),
    ];

    if (translations.length === 0 && definitions.length === 0 && !germanResult?.article) {
      return null;
    }

    return {
      word: germanResult?.word || req.word,
      language: req.sourceLanguage,
      article: germanResult?.article,
      plural: germanResult?.plural,
      phonetic: dictResult?.phonetic || tmResult?.phonetic,
      audioUrl: dictResult?.audioUrl || tmResult?.audioUrl,
      partOfSpeech: germanResult?.partOfSpeech || dictResult?.partOfSpeech || tmResult?.partOfSpeech,
      definitions,
      translations,
      sourceProvider: tmResult?.sourceProvider || germanResult?.sourceProvider || dictResult?.sourceProvider || 'pipeline',
    };
  }
}
