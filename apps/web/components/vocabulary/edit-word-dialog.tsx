'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UserVocabulary, UpdateVocabularyDto } from '@vocabulary/types';
import { api } from '@/lib/api';
import { Sparkles, Loader as Loader2 } from '@keyline-icons/react';

interface EditWordDialogProps {
  item: UserVocabulary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, dto: UpdateVocabularyDto) => Promise<void>;
}

const CEFR_TAGS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PRESET_TAGS = ['Daily', 'Academic', 'Work', 'Grammar'];

export function EditWordDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
}: EditWordDialogProps) {
  const [word, setWord] = useState('');
  const [article, setArticle] = useState<'der' | 'die' | 'das' | ''>('');
  const [plural, setPlural] = useState('');
  const [translation, setTranslation] = useState('');
  const [contextSentence, setContextSentence] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [contextSourceUrl, setContextSourceUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [notes, setNotes] = useState('');

  const [autofilling, setAutofilling] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setWord(item.word || '');
      setArticle((item.article?.toLowerCase() as any) || '');
      setPlural(item.plural || '');
      setTranslation(item.translation || '');
      setContextSentence(item.contextSentence || '');
      setPartOfSpeech(item.partOfSpeech || '');
      setContextSourceUrl(item.contextSourceUrl || '');
      setTags(item.tags || []);
      setNotes(item.notes || '');
      setAutofillMessage(null);
      setError(null);
      setFieldErrors({});
    }
  }, [item]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) setError(null);
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleAutofill = async () => {
    if (!word.trim() || !item) return;
    try {
      setAutofilling(true);
      setAutofillMessage(null);
      setError(null);

      const entry = await api.dictionary.lookup(
        word.trim(),
        item.sourceLanguage,
        item.targetLanguage,
        contextSentence.trim() || undefined,
      );

      if (entry) {
        let count = 0;

        if (entry.article) {
          setArticle(entry.article.toLowerCase() as any);
          count++;
        }

        if (entry.plural) {
          setPlural(entry.plural);
          count++;
        }

        if (entry.translations && Array.isArray(entry.translations) && entry.translations.length > 0) {
          const match = entry.translations.find((t: any) => t.targetLanguage === item.targetLanguage);
          if (match && match.translation) {
            setTranslation(match.translation);
            count++;
          } else if (entry.translations[0]?.translation) {
            setTranslation(entry.translations[0].translation);
            count++;
          }
        }

        if (entry.definitions && Array.isArray(entry.definitions) && entry.definitions.length > 0) {
          const first = entry.definitions[0];
          if (first.partOfSpeech && !partOfSpeech) {
            setPartOfSpeech(first.partOfSpeech);
            count++;
          }
          if (first.definition && !notes) {
            setNotes(first.definition);
            count++;
          }
        }

        setAutofillMessage(
          count > 0
            ? 'Autofilled from dictionary (article & plural included)!'
            : 'Dictionary entry found, please fill translation.',
        );
      } else {
        setAutofillMessage('No dictionary match found. Please fill manually.');
      }
    } catch {
      setAutofillMessage('Dictionary lookup unavailable.');
    } finally {
      setAutofilling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const trimmedWord = word.trim();
    if (!trimmedWord) {
      setFieldErrors({ word: 'Word is required' });
      setError('Please enter a word.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFieldErrors({});

      let cleanUrl = contextSourceUrl.trim();
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      await onSubmit(item.id, {
        word: trimmedWord,
        article: article || undefined,
        plural: plural.trim() || undefined,
        translation: translation.trim() || undefined,
        contextSentence: contextSentence.trim() || undefined,
        partOfSpeech: partOfSpeech.trim() || undefined,
        contextSourceUrl: cleanUrl || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: any) {
      if (err.issues && Array.isArray(err.issues)) {
        const map: Record<string, string> = {};
        for (const issue of err.issues) {
          if (issue.field) map[issue.field] = issue.message;
        }
        setFieldErrors(map);
      }
      setError(err.message || 'Failed to update word. Please check your input.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header Banner: Clean pr-12 to prevent close button collision */}
          <div className="p-5 pr-12 border-b border-border/70 bg-muted/20">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                Edit Word
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update word details, German article, plural suffix, and CEFR tags.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-5 space-y-3.5 max-h-[62vh] overflow-y-auto">
            {autofillMessage && (
              <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground border border-border/60">
                {autofillMessage}
              </div>
            )}

            {error && (
              <div className="rounded-md banner-destructive p-2.5 text-xs leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-3 text-xs">
            {/* German Article Selector */}
            {item.sourceLanguage === 'de' && (
              <div className="space-y-1.5 p-2 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground text-[11px]">
                    German Article (Grammatical Gender)
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    der (m) · die (f) · das (n)
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setArticle(article === 'der' ? '' : 'der')}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs border transition-all ${
                      article === 'der' ? 'btn-article-der-active' : 'btn-article-der-inactive'
                    }`}
                  >
                    der
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticle(article === 'die' ? '' : 'die')}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs border transition-all ${
                      article === 'die' ? 'btn-article-die-active' : 'btn-article-die-inactive'
                    }`}
                  >
                    die
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticle(article === 'das' ? '' : 'das')}
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs border transition-all ${
                      article === 'das' ? 'btn-article-das-active' : 'btn-article-das-inactive'
                    }`}
                  >
                    das
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticle('')}
                    className={`py-1 px-2 rounded-md text-[11px] border transition-all ${
                      article === ''
                        ? 'bg-muted text-muted-foreground border-border font-medium'
                        : 'bg-background text-muted-foreground hover:bg-muted border-border/60'
                    }`}
                  >
                    None
                  </button>
                </div>
              </div>
            )}

            {/* Word & Part of Speech */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground text-xs">
                    Word / Term *
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAutofill}
                    disabled={autofilling || !word.trim()}
                    className="h-5 text-[11px] px-1.5 gap-1 font-medium text-primary hover:text-primary/80 -mr-1"
                  >
                    {autofilling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-warning" />
                    )}
                    <span>{autofilling ? 'Looking up...' : 'Autofill'}</span>
                  </Button>
                </div>
                <Input
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value);
                    clearFieldError('word');
                  }}
                  required
                  className={`text-xs h-8 ${fieldErrors.word ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {fieldErrors.word && (
                  <p className="text-[11px] text-destructive font-medium">
                    {fieldErrors.word}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Part of Speech
                </label>
                <Input
                  value={partOfSpeech}
                  onChange={(e) => {
                    setPartOfSpeech(e.target.value);
                    clearFieldError('partOfSpeech');
                  }}
                  placeholder="verb / noun"
                  className={`text-xs h-8 ${fieldErrors.partOfSpeech ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {fieldErrors.partOfSpeech && (
                  <p className="text-[11px] text-destructive font-medium">
                    {fieldErrors.partOfSpeech}
                  </p>
                )}
              </div>
            </div>

            {/* Plural Form & Suffixes */}
            {item.sourceLanguage === 'de' && (
              <div className="space-y-1">
                <label className="font-medium text-foreground flex items-center justify-between">
                  <span>Plural Form & Suffix</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    e.g. -e (die Hunde), ¨-er (die Bücher)
                  </span>
                </label>
                <Input
                  value={plural}
                  onChange={(e) => setPlural(e.target.value)}
                  placeholder="e.g. -e (die Hunde) or ¨-er"
                  className="text-xs h-8"
                />
              </div>
            )}

            {/* Translation */}
            <div className="space-y-1">
              <label className="font-medium text-foreground">
                Translation / Meaning
              </label>
              <Input
                value={translation}
                onChange={(e) => {
                  setTranslation(e.target.value);
                  clearFieldError('translation');
                }}
                className={`text-xs h-8 ${fieldErrors.translation ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {fieldErrors.translation && (
                <p className="text-[11px] text-destructive font-medium">
                  {fieldErrors.translation}
                </p>
              )}
            </div>

            {/* Context sentence */}
            <div className="space-y-1">
              <label className="font-medium text-foreground">
                Context Sentence
              </label>
              <Textarea
                value={contextSentence}
                onChange={(e) => {
                  setContextSentence(e.target.value);
                  clearFieldError('contextSentence');
                }}
                placeholder="The sentence where you encountered this word..."
                rows={2}
                className={`text-xs resize-none ${fieldErrors.contextSentence ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {fieldErrors.contextSentence && (
                <p className="text-[11px] text-destructive font-medium">
                  {fieldErrors.contextSentence}
                </p>
              )}
            </div>

            {/* Tags (CEFR & Topics) */}
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Tags (CEFR & Topics)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CEFR_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        active
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
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
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        active
                          ? 'bg-foreground text-background'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <Input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={handleAddCustomTag}
                  placeholder="Add custom tag (press Enter)..."
                  className="text-xs h-7"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomTag}
                  className="h-7 text-xs px-2.5"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Source URL */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">
                Source URL (optional)
              </label>
              <Input
                value={contextSourceUrl}
                onChange={(e) => {
                  setContextSourceUrl(e.target.value);
                  clearFieldError('contextSourceUrl');
                }}
                placeholder="https://..."
                type="url"
                className={`text-xs h-8 ${fieldErrors.contextSourceUrl ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {fieldErrors.contextSourceUrl && (
                <p className="text-[11px] text-destructive font-medium">
                  {fieldErrors.contextSourceUrl}
                </p>
              )}
            </div>

            {/* Notes / Definition */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">
                Notes / Definition (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, mnemonics, or definitions..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>
        </div>

        {/* Pinned Modal Footer */}
          <div className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs h-8 px-4"
            >
              {submitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
