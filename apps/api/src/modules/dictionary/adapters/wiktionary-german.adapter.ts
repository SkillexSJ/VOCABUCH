import { Injectable, Logger } from '@nestjs/common';
import {
  IDictionaryAdapter,
  DictionaryLookupRequest,
  DictionaryLookupResult,
  DefinitionResult,
} from './dictionary.adapter.interface';

@Injectable()
export class WiktionaryGermanAdapter implements IDictionaryAdapter {
  readonly providerName = 'wiktionary-de';
  private readonly logger = new Logger(WiktionaryGermanAdapter.name);

  isAvailable(): boolean {
    return true;
  }

  /**
   * Looks up German word grammar, gender article (der/die/das), and plural suffixes.
   */
  async lookup(
    req: DictionaryLookupRequest,
  ): Promise<DictionaryLookupResult | null> {
    if (req.sourceLanguage !== 'de' && req.targetLanguage !== 'de') {
      return null;
    }

    try {
      // 1. Clean the word: remove leading articles if the user entered "der Hund", "die Katze"
      let cleanWord = req.word.trim();
      let extractedArticle: string | undefined;

      const leadingArticleMatch = cleanWord.match(/^(der|die|das|ein|eine|einen|einem|eines)\s+(.+)$/i);
      if (leadingArticleMatch) {
        const art = leadingArticleMatch[1].toLowerCase();
        if (art === 'der' || art === 'die' || art === 'das') {
          extractedArticle = art;
        } else if (art === 'eine') {
          extractedArticle = 'die';
        }
        cleanWord = leadingArticleMatch[2].trim();
      }

      // German nouns are capitalized in dictionary lookups
      const capitalizedWord =
        cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);

      // 2. Query German Wiktionary API
      const url = `https://de.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(capitalizedWord)}&prop=wikitext&format=json`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VocabularyPlatform/1.0 (educational language learning app)',
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return this.fallbackGrammarInference(cleanWord, extractedArticle);
      }

      const json = await res.json();
      const wikitext = json.parse?.wikitext?.['*'] || '';

      if (!wikitext) {
        return this.fallbackGrammarInference(cleanWord, extractedArticle);
      }

      // 3. Parse Genus (m -> der, f -> die, n -> das)
      let article = extractedArticle;
      const genusMatch =
        wikitext.match(/Genus(?:\s*1)?\s*=\s*([mfn])/i) ||
        wikitext.match(/\{\{Deutsch Substantiv Übersicht[\s\S]*?\|Genus\s*=\s*([mfn])/i);

      if (genusMatch && genusMatch[1]) {
        const g = genusMatch[1].toLowerCase();
        if (g === 'm') article = 'der';
        else if (g === 'f') article = 'die';
        else if (g === 'n') article = 'das';
      }

      // Fallback to German noun suffix rules if genus wasn't found in wikitext
      if (!article) {
        article = this.inferArticleFromSuffix(cleanWord);
      }

      // 4. Parse Nominativ Plural
      let pluralForm: string | undefined;
      const pluralMatch =
        wikitext.match(/Nominativ\s*Plural(?:\s*1)?\s*=\s*([^\|\n\}]+)/i);

      if (pluralMatch && pluralMatch[1]) {
        const rawPlural = pluralMatch[1]
          .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1') // clean [[link|text]] or [[link]]
          .trim();
        // Remove footnotes or qualifiers like (selten)
        pluralForm = rawPlural.replace(/\s*\([^)]*\)/g, '').trim();
      }

      // 5. Compute the German dictionary plural suffix (e.g. -e, ¨-er, -en, -n, ¨-)
      let formattedPlural: string | undefined;
      if (pluralForm && pluralForm !== '—' && pluralForm !== '-') {
        const suffix = this.computePluralSuffix(capitalizedWord, pluralForm);
        formattedPlural = `${suffix} (die ${pluralForm})`;
      }

      // 6. Parse part of speech
      let partOfSpeech = 'noun';
      if (/\{\{Wortart\|Verb\|Deutsch\}\}/i.test(wikitext)) {
        partOfSpeech = 'verb';
      } else if (/\{\{Wortart\|Adjektiv\|Deutsch\}\}/i.test(wikitext)) {
        partOfSpeech = 'adjective';
      } else if (/\{\{Wortart\|Substantiv\|Deutsch\}\}/i.test(wikitext)) {
        partOfSpeech = 'noun';
      }

      // 7. Parse definitions from {{Bedeutungen}}
      const definitions: DefinitionResult[] = [];
      const bedeutungenMatch = wikitext.match(/\{\{Bedeutungen\}\}([\s\S]*?)(?=\{\{|\n\n|\n==)/);
      if (bedeutungenMatch && bedeutungenMatch[1]) {
        const rawLines = bedeutungenMatch[1].split('\n');
        for (const line of rawLines) {
          const match = line.match(/^:\[\d+\]\s*(.+)$/);
          if (match && match[1]) {
            const cleanDef = match[1]
              .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
              .replace(/''+/g, '')
              .trim();
            if (cleanDef && cleanDef.length > 2) {
              definitions.push({
                partOfSpeech,
                definition: cleanDef,
              });
              if (definitions.length >= 3) break;
            }
          }
        }
      }

      return {
        word: cleanWord,
        language: 'de',
        article,
        plural: formattedPlural,
        partOfSpeech,
        definitions,
        translations: [],
        sourceProvider: this.providerName,
      };
    } catch (err: any) {
      this.logger.warn(`German Wiktionary lookup failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Computes the German dictionary plural suffix (e.g. -e, ¨-er, -en, -n, ¨-).
   */
  private computePluralSuffix(singular: string, plural: string): string {
    const s = singular.trim();
    const p = plural.trim().replace(/^die\s+/i, '');

    if (s.toLowerCase() === p.toLowerCase()) {
      return '-'; // No ending change (e.g. das Fenster -> die Fenster)
    }

    const hasUmlautInSingular = /[äöüÄÖÜ]/.test(s);
    const hasUmlautInPlural = /[äöüÄÖÜ]/.test(p);
    const gainedUmlaut = !hasUmlautInSingular && hasUmlautInPlural;
    const umlautPrefix = gainedUmlaut ? '¨' : '';

    if (p.endsWith('en') && (s.endsWith('e') || !s.endsWith('en'))) {
      const suffix = s.endsWith('e') ? '-n' : '-en';
      return `${umlautPrefix}${suffix}`;
    }

    if (p.endsWith('n') && s.endsWith('e')) {
      return `${umlautPrefix}-n`;
    }

    if (p.endsWith('er') && !s.endsWith('er')) {
      return `${umlautPrefix}-er`;
    }

    if (p.endsWith('e') && !s.endsWith('e')) {
      return `${umlautPrefix}-e`;
    }

    if (p.endsWith('s') && !s.endsWith('s')) {
      return `${umlautPrefix}-s`;
    }

    if (gainedUmlaut) {
      return '¨-';
    }

    return p;
  }

  /**
   * German noun grammatical gender rules by suffix.
   */
  private inferArticleFromSuffix(word: string): string | undefined {
    const lower = word.toLowerCase();

    // 100% Feminine suffixes
    if (
      lower.endsWith('ung') ||
      lower.endsWith('heit') ||
      lower.endsWith('keit') ||
      lower.endsWith('schaft') ||
      lower.endsWith('tion') ||
      lower.endsWith('tät') ||
      lower.endsWith('ik') ||
      lower.endsWith('ie') ||
      lower.endsWith('enz') ||
      lower.endsWith('anz') ||
      lower.endsWith('ur')
    ) {
      return 'die';
    }

    // 100% Neuter suffixes
    if (
      lower.endsWith('chen') ||
      lower.endsWith('lein') ||
      lower.endsWith('ment') ||
      lower.endsWith('um') ||
      lower.endsWith('tum')
    ) {
      return 'das';
    }

    // High probability Masculine suffixes
    if (
      lower.endsWith('ismus') ||
      lower.endsWith('ant') ||
      lower.endsWith('ent') ||
      lower.endsWith('ist') ||
      lower.endsWith('or') ||
      lower.endsWith('ling')
    ) {
      return 'der';
    }

    return undefined;
  }

  /**
   * Fallback grammar inference if network request is blocked.
   */
  private fallbackGrammarInference(
    word: string,
    extractedArticle?: string,
  ): DictionaryLookupResult {
    const article = extractedArticle || this.inferArticleFromSuffix(word);
    return {
      word,
      language: 'de',
      article,
      partOfSpeech: article ? 'noun' : undefined,
      definitions: [],
      translations: [],
      sourceProvider: 'lexical-rules',
    };
  }
}
