import React, { useState, useEffect, useCallback } from 'react';
import { extensionApi } from '../../src/lib/api';
import { UserProgressStats } from '@vocabulary/types';
import {
  Sparkles,
  ArrowUpRight,
  Loader,
  Check,
  Sun,
  Moon,
  Monitor,
  CircleAlert,
} from '@keyline-icons/react';
import { cn } from '../../src/lib/utils';

type ThemeMode = 'system' | 'light' | 'dark';

export function App() {
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // Theme Management
  const [theme, setTheme] = useState<ThemeMode>('system');

  const applyTheme = useCallback((mode: ThemeMode) => {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('vocab_theme') as ThemeMode) || 'system';
      setTheme(saved);
      applyTheme(saved);
    } catch {
      applyTheme('system');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const current = (localStorage.getItem('vocab_theme') as ThemeMode) || 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [applyTheme]);

  const toggleTheme = () => {
    const next: ThemeMode =
      theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem('vocab_theme', next);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ vocab_theme: next });
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Quick Add State
  const [word, setWord] = useState('');
  const [article, setArticle] = useState<'der' | 'die' | 'das' | ''>('');
  const [plural, setPlural] = useState('');
  const [translation, setTranslation] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [tags] = useState<string[]>(['A2']);
  const [notes] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<'de' | 'en'>('de');
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'bn'>('en');

  const [autofilling, setAutofilling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats on load
  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingStats(true);
        const res = await extensionApi.getStats(sourceLanguage, targetLanguage);
        setStats(res);
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, [sourceLanguage, targetLanguage]);

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

  // Autofill
  const handleAutofill = async () => {
    if (!word.trim()) return;
    try {
      setAutofilling(true);
      setMessage(null);
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
        setMessage('Autofilled from dictionary!');
      } else {
        setMessage('No dictionary match found.');
      }
    } catch {
      setMessage('Dictionary lookup unavailable.');
    } finally {
      setAutofilling(false);
    }
  };

  // Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    if (duplicateWarning) {
      setError(duplicateWarning);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setMessage(null);

      await extensionApi.saveWord({
        word: word.trim(),
        sourceLanguage,
        targetLanguage,
        article: article || undefined,
        plural: plural.trim() || undefined,
        translation: translation.trim() || undefined,
        partOfSpeech: partOfSpeech.trim() || undefined,
        tags,
        notes: notes.trim() || undefined,
      });

      setMessage('Word saved to vocabulary!');
      setWord('');
      setArticle('');
      setPlural('');
      setTranslation('');
      setPartOfSpeech('');
      setDuplicateWarning(null);

      // Refresh stats
      const newStats = await extensionApi.getStats(sourceLanguage, targetLanguage);
      setStats(newStats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save word.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'http://localhost:3000' });
    } else {
      window.open('http://localhost:3000', '_blank');
    }
  };

  return (
    <div className="w-[370px] p-4 bg-background text-foreground font-sans text-xs selection:bg-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
            V
          </div>
          <div>
            <div className="font-semibold text-foreground text-xs tracking-tight">
              VocabPlatform
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  backendOnline ? 'bg-emerald-500' : 'bg-destructive'
                )}
              />
              <span>{backendOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={`Current theme: ${theme} (click to toggle)`}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            {theme === 'light' ? (
              <Sun className="h-3.5 w-3.5" />
            ) : theme === 'dark' ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Monitor className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Web Dashboard Link */}
          <button
            type="button"
            onClick={openDashboard}
            title="Open Web Dashboard"
            className="flex items-center gap-1 border border-border/80 bg-background hover:bg-muted/60 text-foreground px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
          >
            <span>Dashboard</span>
            <ArrowUpRight className="h-3 w-3 opacity-70" />
          </button>
        </div>
      </div>

      {/* Language Pair Selector */}
      <div className="flex p-1 rounded-lg bg-muted/60 border border-border/60 gap-1 mb-3">
        <button
          type="button"
          onClick={() => {
            setSourceLanguage('de');
            setTargetLanguage('en');
          }}
          className={cn(
            'flex-1 py-1 px-2 rounded-md text-[11px] transition-all cursor-pointer font-medium',
            sourceLanguage === 'de'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          🇩🇪 German → 🇬🇧 English
        </button>
        <button
          type="button"
          onClick={() => {
            setSourceLanguage('en');
            setTargetLanguage('bn');
          }}
          className={cn(
            'flex-1 py-1 px-2 rounded-md text-[11px] transition-all cursor-pointer font-medium',
            sourceLanguage === 'en'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          🇬🇧 English → 🇧🇩 Bangla
        </button>
      </div>

      {/* Stats Summary Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-3 gap-2 mb-3 animate-pulse">
          <div className="h-14 rounded-xl bg-card border border-border" />
          <div className="h-14 rounded-xl bg-card border border-border" />
          <div className="h-14 rounded-xl bg-card border border-border" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 bg-card border border-border rounded-xl text-center shadow-xs">
            <div className="text-sm font-bold text-foreground">{stats.totalWords}</div>
            <div className="text-[10px] text-muted-foreground">Total Words</div>
          </div>
          <div className="p-2 bg-card border border-border rounded-xl text-center shadow-xs">
            <div className="text-sm font-bold text-primary">{stats.exercisesDueToday}</div>
            <div className="text-[10px] text-muted-foreground">Due Today</div>
          </div>
          <div className="p-2 bg-card border border-border rounded-xl text-center shadow-xs">
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round(stats.averageMasteryScore)}%
            </div>
            <div className="text-[10px] text-muted-foreground">Mastery</div>
          </div>
        </div>
      ) : null}

      {/* Quick Add Form Section */}
      <div className="border-t border-border/80 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-foreground text-xs">Quick Capture</span>
          <button
            type="button"
            onClick={handleAutofill}
            disabled={autofilling || !word.trim()}
            className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {autofilling ? (
              <Loader className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span>{autofilling ? 'Looking up...' : 'Autofill'}</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {duplicateWarning && (
          <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
            <CircleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {message && (
          <div className="mb-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-[11px] flex items-center gap-1.5">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-2.5">
          {/* German Article Picker (der / die / das) */}
          {sourceLanguage === 'de' && (
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setArticle(article === 'der' ? '' : 'der')}
                className={cn(
                  'flex-1 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer',
                  article === 'der'
                    ? 'bg-article-der text-white border-article-der shadow-xs'
                    : 'bg-card hover:bg-article-der-muted text-article-der border-article-der-border/70'
                )}
              >
                der
              </button>
              <button
                type="button"
                onClick={() => setArticle(article === 'die' ? '' : 'die')}
                className={cn(
                  'flex-1 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer',
                  article === 'die'
                    ? 'bg-article-die text-white border-article-die shadow-xs'
                    : 'bg-card hover:bg-article-die-muted text-article-die border-article-die-border/70'
                )}
              >
                die
              </button>
              <button
                type="button"
                onClick={() => setArticle(article === 'das' ? '' : 'das')}
                className={cn(
                  'flex-1 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer',
                  article === 'das'
                    ? 'bg-article-das text-white border-article-das shadow-xs'
                    : 'bg-card hover:bg-article-das-muted text-article-das border-article-das-border/70'
                )}
              >
                das
              </button>
              <button
                type="button"
                onClick={() => setArticle('')}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] transition-colors border cursor-pointer',
                  article === ''
                    ? 'bg-muted text-foreground border-border font-semibold'
                    : 'bg-background text-muted-foreground border-border/60 hover:text-foreground'
                )}
              >
                None
              </button>
            </div>
          )}

          {/* Word & Part of Speech inputs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Word / Term *"
                required
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="noun/verb"
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>

          {/* Plural Form for German */}
          {sourceLanguage === 'de' && (
            <input
              type="text"
              value={plural}
              onChange={(e) => setPlural(e.target.value)}
              placeholder="Plural: e.g. -e (die Hunde), ¨-er"
              className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
          )}

          {/* Translation */}
          <input
            type="text"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder={targetLanguage === 'en' ? 'Translation / Meaning' : 'অনুবাদ / অর্থ'}
            className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting || !word.trim() || !!duplicateWarning}
            className={cn(
              'w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer',
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
                <span>Saving Word...</span>
              </>
            ) : (
              <span>Save Word</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
