import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IDictionaryAdapter,
  DictionaryLookupRequest,
  DictionaryLookupResult,
} from './dictionary.adapter.interface';

@Injectable()
export class AiRagAdapter implements IDictionaryAdapter {
  readonly providerName = 'openrouter-ai';
  private readonly logger = new Logger(AiRagAdapter.name);

  private readonly openrouterApiKey: string | undefined;
  private readonly geminiApiKey: string | undefined;
  private readonly openaiApiKey: string | undefined;

  // Curated list of high-quality free models on OpenRouter, with qwen3.8-27b:free prioritized as requested
  private readonly FREE_MODELS = [
    'qwen/qwen3.8-27b:free',
    'nvidia/nemotron-3.5-lightning:free',
    'inclusionai/ling-3.0-flash-fin:free',
    'google/gemma-4-26b-a4b-it:free',
    'openrouter/free',
  ];

  constructor(private readonly configService: ConfigService) {
    this.openrouterApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ||
      process.env.OPENROUTER_API_KEY;
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;
    this.openaiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      process.env.OPENAI_API_KEY;
  }

  isAvailable(): boolean {
    return Boolean(
      this.openrouterApiKey || this.geminiApiKey || this.openaiApiKey,
    );
  }

  async lookup(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    if (!this.isAvailable()) return null;

    // 1. Priority 1: Direct Google Gemini API (Google AI Studio Key)
    // Fastest (<500ms) with dedicated personal free tier (15 RPM / 1,500 RPD)
    if (this.geminiApiKey) {
      try {
        const result = await this.queryGemini(req);
        if (
          result &&
          (result.translations.length > 0 || result.definitions.length > 0)
        ) {
          return result;
        }
      } catch (err: any) {
        this.logger.warn(
          `Google Gemini API failed for "${req.word}" (${err.message}). Cascading to OpenRouter...`,
        );
      }
    }

    // 2. Priority 2: OpenRouter with cascading free model array
    // (qwen3.8-27b:free -> nemotron-3.5-lightning:free -> ling-3.0-flash-fin:free -> gemma)
    if (this.openrouterApiKey) {
      try {
        const result = await this.queryOpenRouter(req);
        if (
          result &&
          (result.translations.length > 0 || result.definitions.length > 0)
        ) {
          return result;
        }
      } catch (err: any) {
        this.logger.warn(
          `OpenRouter lookup failed for "${req.word}" (${err.message}). Cascading to backup AI or safe fallback...`,
        );
      }
    }

    // 3. Priority 3: Direct OpenAI API if configured
    if (this.openaiApiKey) {
      try {
        const result = await this.queryOpenAi(req);
        if (
          result &&
          (result.translations.length > 0 || result.definitions.length > 0)
        ) {
          return result;
        }
      } catch (err: any) {
        this.logger.warn(
          `OpenAI backup failed for "${req.word}": ${err.message}`,
        );
      }
    }

    // Return null to allow DictionaryPipeline to cascade down to Wiktionary + MyMemory + FreeDictionary
    return null;
  }

  /**
   * Queries OpenRouter with sequential fallback across high-quality free models.
   * If a model is temporarily rate-limited upstream (HTTP 429), it immediately
   * cascades to the next active free model before ever failing over to scrapers.
   */
  private async queryOpenRouter(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    const configuredModel =
      this.configService.get<string>('OPENROUTER_MODEL') ||
      process.env.OPENROUTER_MODEL;

    // Build ordered list of candidate models
    const candidateModels = configuredModel
      ? [
          configuredModel,
          ...this.FREE_MODELS.filter((m) => m !== configuredModel),
        ]
      : this.FREE_MODELS;

    const prompt = this.buildPrompt(req);

    for (const model of candidateModels) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vocabuch.local',
            'X-Title': 'Vocabuch Learning Platform',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert bilingual lexicographer, translator, and language teacher. Output strictly a valid, raw JSON object matching the requested schema. Do not output markdown code blocks (```json) or conversational text.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
          }),
          signal: AbortSignal.timeout(6000), // 6s timeout per model
        });

        if (res.status === 429 || res.status === 503) {
          this.logger.warn(
            `OpenRouter model "${model}" rate-limited (${res.status}), trying next free model...`,
          );
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          this.logger.warn(
            `OpenRouter model "${model}" returned HTTP ${res.status}: ${errBody.slice(0, 100)}`,
          );
          continue;
        }

        const data = await res.json();
        const rawContent = data?.choices?.[0]?.message?.content;
        if (!rawContent) continue;

        const resolvedModel = data?.model || model;
        this.logger.log(
          `Resolved "${req.word}" via OpenRouter model: ${resolvedModel}`,
        );

        const result = this.parseAiResponse(req, rawContent, resolvedModel);
        if (
          result &&
          (result.translations.length > 0 || result.definitions.length > 0)
        ) {
          return result;
        }
      } catch (err: any) {
        this.logger.warn(
          `OpenRouter attempt for "${model}" failed: ${err.message}. Trying next model...`,
        );
      }
    }

    return null;
  }

  /**
   * Queries Google Gemini directly via Google AI Studio API key.
   * Leverages Gemini's native structured JSON mode (responseMimeType: "application/json").
   */
  private async queryGemini(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    const configuredModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-2.0-flash';

    // Model fallback chain for Google AI Studio
    const geminiCandidates = [
      configuredModel,
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const prompt = this.buildPrompt(req);

    for (const model of geminiCandidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(6000), // 6s timeout
        });

        if (res.status === 429) {
          this.logger.warn(`Google Gemini model "${model}" rate-limited (429).`);
          break; // Stop Gemini attempts and cascade to OpenRouter
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          this.logger.warn(
            `Google Gemini model "${model}" returned HTTP ${res.status}: ${errBody.slice(0, 100)}`,
          );
          continue;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        this.logger.log(`Resolved "${req.word}" via Google Gemini model: ${model}`);
        const result = this.parseAiResponse(req, rawText, model);
        if (
          result &&
          (result.translations.length > 0 || result.definitions.length > 0)
        ) {
          return result;
        }
      } catch (err: any) {
        this.logger.warn(`Google Gemini attempt for "${model}" failed: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Queries OpenAI with context sentence for precise RAG translation.
   */
  private async queryOpenAi(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    const prompt = this.buildPrompt(req);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) return null;

    return this.parseAiResponse(req, rawText, 'openai-gpt-4o-mini');
  }

  private buildPrompt(req: DictionaryLookupRequest): string {
    const isGerman = req.sourceLanguage === 'de';
    return `Analyze the vocabulary word "${req.word}" translating from language "${req.sourceLanguage}" to "${req.targetLanguage}".
${req.contextSentence ? `Context Sentence: "${req.contextSentence}"` : ''}

MANDATORY RULES:
1. "word": The base lemma without leading articles (e.g. "Hund", NOT "der Hund").
2. "article": ${
      isGerman
        ? 'For German nouns, MUST be strictly "der", "die", or "das". For non-nouns (verbs, adjectives, adverbs) or other languages, MUST be null.'
        : 'MUST be null.'
    }
3. "plural": ${
      isGerman
        ? 'For German nouns, MUST be the plural suffix or form (e.g. "-e (die Hunde)", "¨-er", "-n", "-nen", "-s"). For non-nouns, MUST be null.'
        : 'MUST be null.'
    }
4. "partOfSpeech": One of: "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase".
5. "translation": The most accurate and natural primary translation in language "${req.targetLanguage}".
6. "definition": A concise, clear definition or explanation of the meaning in language "${req.targetLanguage}".
7. "example": A practical, natural example sentence in language "${req.sourceLanguage}" using the word "${req.word}".
8. "grammarNote": Optional brief CEFR level tag (A1-C2) or grammar note (e.g. "A1 / Masculine noun").

Return ONLY a raw, valid JSON object matching this schema:
{
  "word": "${req.word}",
  "article": ${isGerman ? '"der" | "die" | "das" | null' : 'null'},
  "plural": ${isGerman ? 'string | null' : 'null'},
  "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "phrase",
  "translation": "string",
  "definition": "string",
  "example": "string",
  "grammarNote": "string | null"
}`;
  }

  private parseAiResponse(
    req: DictionaryLookupRequest,
    rawText: string,
    provider: string,
  ): DictionaryLookupResult | null {
    try {
      // 1. Remove markdown backtick wrappers if model included them
      let cleaned = rawText
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();

      // 2. Extract content between first '{' and last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleaned);

      // Sanitize article
      let article: string | undefined;
      if (typeof parsed.article === 'string') {
        const art = parsed.article.toLowerCase().trim();
        if (art === 'der' || art === 'die' || art === 'das') {
          article = art;
        }
      }

      // Sanitize plural
      const plural =
        typeof parsed.plural === 'string' && parsed.plural.trim().length > 0
          ? parsed.plural.trim()
          : undefined;

      // Sanitize part of speech
      const partOfSpeech =
        typeof parsed.partOfSpeech === 'string'
          ? parsed.partOfSpeech.toLowerCase().trim()
          : undefined;

      // Sanitize translation
      const translation =
        typeof parsed.translation === 'string'
          ? parsed.translation.trim()
          : undefined;

      // Sanitize definition
      const definition =
        typeof parsed.definition === 'string'
          ? parsed.definition.trim()
          : undefined;

      // Sanitize example sentence
      const example =
        typeof parsed.example === 'string' ? parsed.example.trim() : undefined;

      const grammarNote =
        typeof parsed.grammarNote === 'string'
          ? parsed.grammarNote.trim()
          : typeof parsed.aiGrammarNote === 'string'
            ? parsed.aiGrammarNote.trim()
            : undefined;

      return {
        word: parsed.word || req.word,
        language: req.sourceLanguage,
        article,
        plural,
        partOfSpeech,
        definitions: definition
          ? [
              {
                partOfSpeech: partOfSpeech || 'general',
                definition,
                example,
              },
            ]
          : [],
        translations: translation
          ? [
              {
                targetLanguage: req.targetLanguage,
                translation,
                matchQuality: 98,
                contextNote: grammarNote,
              },
            ]
          : [],
        sourceProvider: provider,
        aiGrammarNote: grammarNote,
      };
    } catch (err: any) {
      this.logger.warn(
        `Failed to parse AI response for "${req.word}": ${err.message}`,
      );
      return null;
    }
  }
}
