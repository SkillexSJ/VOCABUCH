import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IDictionaryAdapter,
  DictionaryLookupRequest,
  DictionaryLookupResult,
} from './dictionary.adapter.interface';

@Injectable()
export class AiRagAdapter implements IDictionaryAdapter {
  readonly providerName = 'ai-rag';
  private readonly logger = new Logger(AiRagAdapter.name);
  private readonly geminiApiKey: string | undefined;
  private readonly openaiApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;
    this.openaiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      process.env.OPENAI_API_KEY;
  }

  isAvailable(): boolean {
    return Boolean(this.geminiApiKey || this.openaiApiKey);
  }

  async lookup(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    if (!this.isAvailable()) return null;

    try {
      if (this.geminiApiKey) {
        return await this.queryGemini(req);
      } else if (this.openaiApiKey) {
        return await this.queryOpenAi(req);
      }
      return null;
    } catch (err: any) {
      this.logger.error(
        `AI RAG lookup failed for "${req.word}": ${err.message}`,
        err.stack,
      );
      // Gracefully fall back to next provider in pipeline
      return null;
    }
  }

  /**
   * Queries Google Gemini with context sentence for precise RAG translation.
   */
  private async queryGemini(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    const prompt = this.buildPrompt(req);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return this.parseAiResponse(req, rawText, 'gemini-rag');
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
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) return null;

    return this.parseAiResponse(req, rawText, 'openai-rag');
  }

  private buildPrompt(req: DictionaryLookupRequest): string {
    return `You are a professional lexicographer and language teacher.
Analyze the word "${req.word}" translating from ${req.sourceLanguage} to ${req.targetLanguage}.
${req.contextSentence ? `Context Sentence where word appeared: "${req.contextSentence}"` : ''}

Respond ONLY with a JSON object matching this exact schema:
{
  "translation": "primary contextual translation in ${req.targetLanguage}",
  "partOfSpeech": "noun / verb / adjective / adverb / phrase",
  "definition": "concise explanation of this specific meaning in ${req.targetLanguage}",
  "aiGrammarNote": "brief grammar note or CEFR level (A1-C2)",
  "aiMnemonic": "short, memorable tip or mnemonic to remember this word"
}`;
  }

  private parseAiResponse(
    req: DictionaryLookupRequest,
    rawJson: string,
    provider: string,
  ): DictionaryLookupResult | null {
    try {
      const parsed = JSON.parse(rawJson);
      return {
        word: req.word,
        language: req.sourceLanguage,
        partOfSpeech: parsed.partOfSpeech,
        definitions: parsed.definition
          ? [
              {
                partOfSpeech: parsed.partOfSpeech || 'general',
                definition: parsed.definition,
              },
            ]
          : [],
        translations: parsed.translation
          ? [
              {
                targetLanguage: req.targetLanguage,
                translation: parsed.translation,
                matchQuality: 98,
                contextNote: parsed.aiGrammarNote,
              },
            ]
          : [],
        sourceProvider: provider,
        aiGrammarNote: parsed.aiGrammarNote,
        aiMnemonic: parsed.aiMnemonic,
      };
    } catch {
      return null;
    }
  }
}
