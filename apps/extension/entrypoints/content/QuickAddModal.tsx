import React, { useState, useEffect } from 'react';
import { extensionApi } from '../../src/lib/api';
import {
  Sparkles,
  X,
  Check,
  Loader,
  ArrowUpRight,
  CircleAlert,
} from '@keyline-icons/react';
import { cn } from '../../src/lib/utils';

interface QuickAddModalProps {
  initialWord: string;
  initialSentence: string;
  sourceUrl: string;
  onClose: () => void;
  onSaved?: () => void;
  isDark?: boolean;
}

const CEFR_TAGS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PRESET_TAGS = ['English', 'German', 'Bangla', 'Daily', 'Academic', 'Work'];
const COMMON_POS = ['noun', 'verb', 'adjective', 'adverb', 'phrase'];

export function QuickAddModal({
  initialWord,
  initialSentence,
  sourceUrl,
  onClose,
  onSaved,
  isDark = false,
}: QuickAddModalProps) {
  const [word, setWord] = useState(initialWord);
  const [sourceLanguage, setSourceLanguage] = useState<'de' | 'en'>('de');
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'bn'>('en');
  const [translation, setTranslation] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [contextSentence, setContextSentence] = useState(initialSentence);
  const [tags, setTags] = useState<string[]>(['A2']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [notes] = useState('');

  // German noun article & plural states
  const [article, setArticle] = useState<'der' | 'die' | 'das' | ''>('');
  const [plural, setPlural] = useState('');

  const [autofilling, setAutofilling] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync state if initialWord changes
  useEffect(() => {
    let w = initialWord;
    if (sourceLanguage === 'de') {
      const match = initialWord.match(/^(der|die|das)\s+(.+)$/i);
      if (match) {
        setArticle(match[1].toLowerCase() as 'der' | 'die' | 'das');
        w = match[2];
      }
    }
    setWord(w);
    setContextSentence(initialSentence);
  }, [initialWord, initialSentence, sourceLanguage]);

  // Debounced duplicate check
  useEffect(() => {
    const trimmed = word.trim();
    if (!trimmed) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await extensionApi.checkWord(trimmed, sourceLanguage);
        if (res.exists && res.vocabulary) {
          setDuplicateWarning(
            `"${trimmed}" is already in your vocabulary (Mastery: ${Math.round(res.vocabulary.masteryScore)}%).`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Silently ignore check error
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [word, sourceLanguage]);

  // Toggle tag
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Add custom tag
  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTagInput('');
    }
  };

  // Dictionary lookup / Autofill
  const handleAutofill = async () => {
    if (!word.trim()) return;
    try {
      setAutofilling(true);
      setAutofillMessage(null);
      setError(null);
      const entry = await extensionApi.lookupWord(
        word.trim(),
        sourceLanguage,
        targetLanguage
      );

      if (entry) {
        if (entry.article) setArticle(entry.article.toLowerCase() as 'der' | 'die' | 'das');
        if (entry.plural) setPlural(entry.plural);

        if (entry.translations && entry.translations.length > 0) {
          const match = entry.translations.find((t: { targetLanguage?: string; translation?: string }) => t.targetLanguage === targetLanguage);
          setTranslation(match?.translation || entry.translations[0]?.translation || '');
        }
        if (entry.definitions && entry.definitions.length > 0) {
          if (entry.definitions[0].partOfSpeech) setPartOfSpeech(entry.definitions[0].partOfSpeech);
        }
        setAutofillMessage('Autofilled from dictionary match!');
      } else {
        setAutofillMessage('No exact dictionary match found.');
      }
    } catch {
      setAutofillMessage('Dictionary lookup unavailable.');
    } finally {
      setAutofilling(false);
    }
  };

  // Submit save word
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    if (duplicateWarning) {
      setError(duplicateWarning);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setAutofillMessage(null);

      await extensionApi.saveWord({
        word: word.trim(),
        sourceLanguage,
        targetLanguage,
        article: article || undefined,
        plural: plural.trim() || undefined,
        translation: translation.trim() || undefined,
        partOfSpeech: partOfSpeech.trim() || undefined,
        contextSentence: contextSentence.trim() || undefined,
        contextSourceUrl: sourceUrl.trim() || undefined,
        tags,
        notes: notes.trim() || undefined,
      });

      setSuccess(true);
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to save word. Please verify backend is running.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(isDark && 'dark')}>
      <div
        className={cn(
          'fixed top-6 right-6 w-[420px] max-w-[calc(100vw-48px)] max-h-[90vh] overflow-y-auto',
          'bg-card text-card-foreground border border-border/80 rounded-2xl shadow-2xl p-5 z-[2147483647]',
          'font-sans text-xs selection:bg-primary/20 space-y-4'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shadow-xs">
              V
            </div>
            <div>
              <div className="font-bold text-foreground text-sm tracking-tight">
                Add to Vocabulary
              </div>
              <div className="text-[10px] text-muted-foreground">
                Capture with page context
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Language selector & Autofill button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex p-1 rounded-lg bg-muted/60 border border-border/60 gap-1 flex-1">
            <button
              type="button"
              onClick={() => {
                setSourceLanguage('de');
                setTargetLanguage('en');
              }}
              className={cn(
                'flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                sourceLanguage === 'de'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              🇩🇪 DE → 🇬🇧 EN
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceLanguage('en');
                setTargetLanguage('bn');
              }}
              className={cn(
                'flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                sourceLanguage === 'en'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              🇬🇧 EN → 🇧🇩 BN
            </button>
          </div>

          <button
            type="button"
            onClick={handleAutofill}
            disabled={autofilling || !word.trim()}
            className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {autofilling ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{autofilling ? 'Looking up...' : 'Autofill'}</span>
          </button>
        </div>

        {/* Notification / Feedback Banners */}
        {autofillMessage && (
          <div className="p-2 rounded-lg bg-muted/60 border border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{autofillMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-[11px] flex items-center gap-1.5">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1.5 font-medium">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>Word saved successfully to your vocabulary list!</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
            <CircleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* German Article Picker */}
          {sourceLanguage === 'de' && (
            <div className="bg-muted/30 p-2.5 rounded-xl border border-border/70 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-foreground">German Article</span>
                <span className="text-[10px] text-muted-foreground">der (m) · die (f) · das (n)</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setArticle(article === 'der' ? '' : 'der')}
                  className={cn(
                    'flex-1 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer',
                    article === 'der'
                      ? 'bg-article-der text-white border-article-der shadow-xs'
                      : 'bg-background hover:bg-article-der-muted text-article-der border-article-der-border/70'
                  )}
                >
                  der
                </button>
                <button
                  type="button"
                  onClick={() => setArticle(article === 'die' ? '' : 'die')}
                  className={cn(
                    'flex-1 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer',
                    article === 'die'
                      ? 'bg-article-die text-white border-article-die shadow-xs'
                      : 'bg-background hover:bg-article-die-muted text-article-die border-article-die-border/70'
                  )}
                >
                  die
                </button>
                <button
                  type="button"
                  onClick={() => setArticle(article === 'das' ? '' : 'das')}
                  className={cn(
                    'flex-1 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer',
                    article === 'das'
                      ? 'bg-article-das text-white border-article-das shadow-xs'
                      : 'bg-background hover:bg-article-das-muted text-article-das border-article-das-border/70'
                  )}
                >
                  das
                </button>
                <button
                  type="button"
                  onClick={() => setArticle('')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] transition-colors border cursor-pointer',
                    article === ''
                      ? 'bg-muted text-foreground border-border font-semibold'
                      : 'bg-background text-muted-foreground border-border/60 hover:text-foreground'
                  )}
                >
                  None
                </button>
              </div>
            </div>
          )}

          {/* Word & Part of Speech */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="block text-[11px] font-medium text-foreground">
                Word / Term <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                required
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-foreground">
                Part of Speech
              </label>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="noun / verb"
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>

          {/* Plural Form & Suffix for German */}
          {sourceLanguage === 'de' && (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-foreground">
                Plural Form & Suffix{' '}
                <span className="text-[10px] text-muted-foreground font-normal">(e.g. -e (die Hunde), ¨-er)</span>
              </label>
              <input
                type="text"
                value={plural}
                onChange={(e) => setPlural(e.target.value)}
                placeholder="e.g. -e (die Hunde) or ¨-er"
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          )}

          {/* Quick Part of Speech Pills */}
          <div className="flex gap-1.5 flex-wrap">
            {COMMON_POS.map((pos) => {
              const active = partOfSpeech.toLowerCase() === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPartOfSpeech(pos)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer border',
                    active
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground'
                  )}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          {/* Translation */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-foreground">
              Translation / Meaning <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={targetLanguage === 'en' ? 'e.g. to decide / resolve' : 'অনুবাদ / অর্থ'}
              required
              className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
          </div>

          {/* Context Sentence */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-foreground">
              Context Sentence (captured from page)
            </label>
            <textarea
              value={contextSentence}
              onChange={(e) => setContextSentence(e.target.value)}
              rows={2}
              placeholder="The sentence where you encountered this word..."
              className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-vertical font-sans"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-foreground">Tags</label>

            {/* Quick CEFR & Preset Tag Pills */}
            <div className="flex gap-1.5 flex-wrap">
              {CEFR_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border cursor-pointer',
                      active
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/50 text-muted-foreground border-border/60 hover:text-foreground'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}

              {PRESET_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border cursor-pointer',
                      active
                        ? 'bg-foreground text-background border-foreground font-semibold'
                        : 'bg-card text-muted-foreground border-border/60 hover:text-foreground'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Add custom tag (Enter)..."
                className="flex-1 bg-background border border-input rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-2.5 py-1 rounded-lg border border-border/80 bg-muted/50 hover:bg-muted text-foreground text-xs font-medium cursor-pointer transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Source URL Preview */}
          {sourceUrl && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate pt-0.5">
              <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">Source: {sourceUrl}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-lg border border-border/80 bg-background hover:bg-muted/60 text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success || !!duplicateWarning}
              className={cn(
                'flex-[2] py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer',
                duplicateWarning
                  ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50'
              )}
            >
              {duplicateWarning ? (
                <span>Already in Vocabulary</span>
              ) : submitting ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Word</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
