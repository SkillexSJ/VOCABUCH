'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserVocabulary } from '@vocabulary/types';
import { LanguagePair } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Lightbulb, Check, X, ArrowRight } from '@keyline-icons/react';

interface QuizTrainerProps {
  card: UserVocabulary;
  allCards: UserVocabulary[];
  activePair: LanguagePair;
  onAnswer: (isCorrect: boolean) => Promise<void>;
  submitting: boolean;
}

const FALLBACK_DISTRACTORS: Record<string, string[]> = {
  en: [
    'color', 'clock', 'cloud', 'clown', 'cloth', 'clone', 'clear', 'clean', 'client',
    'decision', 'house', 'water', 'freedom', 'journey', 'silence', 'strength',
    'memory', 'courage', 'bridge', 'garden', 'weather', 'truth', 'river', 'friendship',
    'window', 'mountain', 'forest', 'future', 'resilient', 'wisdom', 'peace', 'storm'
  ],
  de: [
    'die Farbe', 'die Uhr', 'die Wolke', 'der Clown', 'das Tuch', 'der Klon',
    'das Haus', 'die Entscheidung', 'das Wasser', 'die Freiheit', 'die Reise',
    'die Stille', 'die Stärke', 'die Erinnerung', 'der Mut', 'die Brücke',
    'der Garten', 'das Wetter', 'die Wahrheit', 'der Fluss', 'die Freundschaft',
    'das Fenster', 'der Berg', 'der Wald', 'die Zukunft', 'die Weisheit', 'der Frieden'
  ],
  bn: [
    'রং / বর্ণ', 'ঘড়ি', 'মেঘ', 'বিদূষক', 'কাপড় / বস্ত্র', 'প্রতিরূপ',
    'সিদ্ধান্ত', 'বাড়ি', 'জল / পানি', 'মুক্তি / স্বাধীনতা', 'ভ্রমণ', 'নীরবতা', 'শক্তি',
    'স্মৃতি', 'সাহস', 'সেতু', 'বাগান', 'আবহাওয়া', 'সত্য', 'নদী', 'বন্ধুত্ব',
    'জানালা', 'পাহাড়', 'বন', 'ভবিষ্যৎ', 'প্রজ্ঞা', 'শান্তি', 'সহনশীল / স্থিতিস্থাপক'
  ],
};

function getFlagEmoji(langCode: string): string {
  switch (langCode.toLowerCase()) {
    case 'de':
      return '🇩🇪';
    case 'en':
      return '🇬🇧';
    case 'bn':
      return '🇧🇩';
    default:
      return '🌐';
  }
}

function parseGermanArticle(word: string) {
  const match = word.match(/^(der|die|das)\s+(.*)$/i);
  if (match) {
    const article = match[1].toLowerCase();
    const rest = match[2];
    let colorClass = 'text-article-die';
    if (article === 'der') colorClass = 'text-article-der';
    if (article === 'das') colorClass = 'text-article-das';
    return { hasArticle: true, article: match[1], rest, colorClass };
  }
  return { hasArticle: false, article: '', rest: word, colorClass: '' };
}

export function QuizTrainer({
  card,
  allCards,
  activePair,
  onAnswer,
  submitting,
}: QuizTrainerProps) {
  // Mode: 'passive' (Prompt in Source -> Guess Target) vs 'active' (Prompt in Target -> Guess Source)
  const [direction, setDirection] = useState<'passive' | 'active'>('passive');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Determine correct answer based on active direction
  const correctAnswer = useMemo(() => {
    if (direction === 'passive') {
      return card.translation || card.word;
    } else {
      return card.word;
    }
  }, [direction, card]);

  // Target language for the 6 options
  const optionsLanguage = direction === 'passive' ? activePair.target : activePair.source;

  // Build the 6 options (1 correct answer + 5 unique distractors)
  const options = useMemo(() => {
    const pool = new Set<string>();

    // 1. Add options from other vocabulary cards
    for (const c of allCards) {
      if (c.id !== card.id) {
        const val = direction === 'passive' ? c.translation : c.word;
        if (val && val.trim().toLowerCase() !== correctAnswer.trim().toLowerCase()) {
          pool.add(val.trim());
        }
      }
    }

    // 2. Supplement from fallback pool
    const fallbacks = FALLBACK_DISTRACTORS[optionsLanguage] || FALLBACK_DISTRACTORS.en;
    for (const fb of fallbacks) {
      if (fb.toLowerCase() !== correctAnswer.toLowerCase()) {
        pool.add(fb);
      }
    }

    // Convert to array and filter out the exact correct answer
    const poolArray = Array.from(pool).filter(
      (item) => item.toLowerCase() !== correctAnswer.toLowerCase(),
    );

    // Prefer words that share prefix letters for smart distractors (e.g. clone, clown, cloth for color)
    const targetPrefix = correctAnswer.slice(0, 2).toLowerCase();
    const sortedPool = [...poolArray].sort((a, b) => {
      const aMatches = a.toLowerCase().startsWith(targetPrefix) ? 1 : 0;
      const bMatches = b.toLowerCase().startsWith(targetPrefix) ? 1 : 0;
      return bMatches - aMatches || Math.random() - 0.5;
    });

    // Select 5 distractors
    const chosenDistractors = sortedPool.slice(0, 5);

    // Combine with correct answer and shuffle
    const combined = [correctAnswer, ...chosenDistractors];
    // Fisher-Yates shuffle
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined;
  }, [card.id, correctAnswer, direction, allCards, optionsLanguage]);

  // Find index of the correct answer among options
  const correctOptionIndex = useMemo(() => {
    return options.findIndex(
      (opt) => opt.toLowerCase() === correctAnswer.toLowerCase(),
    );
  }, [options, correctAnswer]);

  // Reset answer state when target card or direction changes
  useEffect(() => {
    setSelectedIndex(null);
    setIsAnswered(false);
    setIsTransitioning(false);
  }, [card.id, direction]);

  // Play audio speech synthesis
  const handlePlayAudio = useCallback((textToSpeak: string, lang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (lang === 'de') utterance.lang = 'de-DE';
      else if (lang === 'en') utterance.lang = 'en-US';
      else if (lang === 'bn') utterance.lang = 'bn-BD';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('SpeechSynthesis error:', e);
    }
  }, []);

  // Handle option selection
  const handleSelectOption = useCallback(
    async (index: number) => {
      if (isAnswered || submitting || isTransitioning) return;

      setSelectedIndex(index);
      setIsAnswered(true);

      const isCorrect = index === correctOptionIndex;

      // Play pronunciation of target word upon answering
      if (direction === 'passive') {
        handlePlayAudio(card.word, activePair.source);
      } else {
        handlePlayAudio(card.word, activePair.source);
      }

      if (isCorrect) {
        // Automatically proceed after short visual feedback
        setIsTransitioning(true);
        setTimeout(async () => {
          await onAnswer(true);
          setIsTransitioning(false);
        }, 750);
      } else {
        // For wrong answers, don't auto-advance immediately so the user can see what the right answer was
      }
    },
    [
      isAnswered,
      submitting,
      isTransitioning,
      correctOptionIndex,
      direction,
      card.word,
      activePair.source,
      handlePlayAudio,
      onAnswer,
    ],
  );

  // Manual proceed for incorrect answer review
  const handleProceedAfterWrong = useCallback(async () => {
    if (submitting || isTransitioning) return;
    setIsTransitioning(true);
    await onAnswer(false);
    setIsTransitioning(false);
  }, [submitting, isTransitioning, onAnswer]);

  // Keyboard navigation: Keys 1 to 6 and Space/Enter to advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6 && !isAnswered) {
        e.preventDefault();
        handleSelectOption(num - 1);
      } else if (isAnswered && (e.code === 'Space' || e.code === 'Enter')) {
        if (selectedIndex !== correctOptionIndex) {
          e.preventDefault();
          handleProceedAfterWrong();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnswered,
    handleSelectOption,
    handleProceedAfterWrong,
    selectedIndex,
    correctOptionIndex,
  ]);

  // Word prompt display
  const promptWord = direction === 'passive' ? card.word : (card.translation || card.word);
  const germanArticleInfo = activePair.source === 'de' && direction === 'passive'
    ? parseGermanArticle(promptWord)
    : null;

  const sourceFlag = direction === 'passive' ? getFlagEmoji(activePair.source) : getFlagEmoji(activePair.target);
  const targetFlag = direction === 'passive' ? getFlagEmoji(activePair.target) : getFlagEmoji(activePair.source);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-in fade-in-50 duration-200">
      {/* Top Header & Mode Toggle: Passive vs Active */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {activePair.source === 'de' ? 'German' : 'English'} Vocabulary Trainer
        </h1>

        <div className="inline-flex p-1 rounded-full bg-muted/80 border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDirection('passive')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
              direction === 'passive'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Passive vocabulary
          </button>
          <button
            type="button"
            onClick={() => setDirection('active')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
              direction === 'active'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active vocabulary
          </button>
        </div>
      </div>

      {/* Main Practice Card */}
      <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-6 sm:p-10 space-y-7">
          {/* Target Word & Audio */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center justify-center gap-3 flex-wrap">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {germanArticleInfo && germanArticleInfo.hasArticle ? (
                  <>
                    <span className={germanArticleInfo.colorClass}>
                      {germanArticleInfo.article}
                    </span>{' '}
                    <span>{germanArticleInfo.rest}</span>
                  </>
                ) : (
                  promptWord
                )}
              </h2>

              <button
                type="button"
                onClick={() => handlePlayAudio(promptWord, direction === 'passive' ? activePair.source : activePair.target)}
                title="Listen to pronunciation"
                className="h-8 w-8 rounded-full border border-border/80 flex items-center justify-center hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              </button>
            </div>

            {/* Part of Speech */}
            {card.partOfSpeech && (
              <div>
                <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {card.partOfSpeech}
                </span>
              </div>
            )}
          </div>

          {/* Context Example Banner */}
          {card.contextSentence && (
            <div className="max-w-xl mx-auto rounded-full border border-warning-border bg-warning-muted px-4 py-2 flex items-center justify-between gap-2.5 text-xs text-foreground">
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                <Lightbulb className="h-4 w-4 shrink-0 text-warning" />
                <span className="truncate">
                  <strong className="font-semibold">Example:</strong>{' '}
                  <span className="italic">{card.contextSentence}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handlePlayAudio(card.contextSentence || '', activePair.source)}
                title="Play example audio"
                className="h-6 w-6 shrink-0 rounded-full border border-warning-border flex items-center justify-center hover:bg-warning/20 text-warning transition-colors"
              >
                <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
              </button>
            </div>
          )}

          {/* Language Direction Flag Pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground font-medium">
              <span>{sourceFlag}</span>
              <span>→</span>
              <span>{targetFlag}</span>
            </div>
          </div>

          {/* 6 Multiple Choice Options (2 Columns x 3 Rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {options.map((option, idx) => {
              const optionNumber = idx + 1;
              const isSelected = selectedIndex === idx;
              const isCorrectAnswer = idx === correctOptionIndex;

              let cardStyle =
                'border-border/80 bg-card hover:border-foreground/30 hover:bg-muted/30 text-foreground';
              let badgeStyle =
                'border-border/80 bg-muted/50 text-muted-foreground';

              if (isAnswered) {
                if (isCorrectAnswer) {
                  // Highlight correct option in green
                  cardStyle =
                    'border-success-border bg-success-muted text-success-foreground font-semibold shadow-xs';
                  badgeStyle =
                    'border-success bg-success text-primary-foreground font-bold';
                } else if (isSelected && !isCorrectAnswer) {
                  // Highlight wrong chosen option in red
                  cardStyle =
                    'border-destructive/40 bg-destructive/10 text-destructive font-semibold shadow-xs';
                  badgeStyle =
                    'border-destructive bg-destructive text-destructive-foreground font-bold';
                } else {
                  // Other unselected options fade
                  cardStyle = 'opacity-50 border-border/40 bg-muted/20 text-muted-foreground';
                }
              }

              return (
                <button
                  key={`${card.id}-${option}-${idx}`}
                  type="button"
                  disabled={isAnswered || submitting}
                  onClick={() => handleSelectOption(idx)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left font-medium text-sm group ${cardStyle}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-7 w-7 shrink-0 rounded-lg border flex items-center justify-center text-xs transition-colors ${badgeStyle}`}
                    >
                      {optionNumber}
                    </span>
                    <span className="truncate text-sm">{option}</span>
                  </div>

                  {isAnswered && isCorrectAnswer && (
                    <Check className="h-4 w-4 text-success shrink-0 ml-2" />
                  )}
                  {isAnswered && isSelected && !isCorrectAnswer && (
                    <X className="h-4 w-4 text-destructive shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Continue button shown on incorrect answer review */}
          {isAnswered && selectedIndex !== correctOptionIndex && (
            <div className="pt-2 text-center animate-in fade-in-50 duration-150">
              <Button
                onClick={handleProceedAfterWrong}
                disabled={submitting || isTransitioning}
                size="sm"
                className="gap-2 px-5 text-xs font-medium"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="text-[10px] opacity-70 border border-current/40 rounded px-1 ml-1">
                  Enter / Space
                </span>
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer info: Keyboard shortcut hints */}
        <div className="border-t border-border/60 bg-muted/20 px-6 py-3 text-right">
          <span className="text-xs text-muted-foreground">
            Without mouse: press keys 1–6 to answer.
          </span>
        </div>
      </Card>
    </div>
  );
}
