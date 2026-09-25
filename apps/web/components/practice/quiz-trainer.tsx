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
  onAnswer: (isCorrect: boolean) => Promise<void> | void;
  submitting: boolean;
}

const FALLBACK_DISTRACTORS: Record<string, string[]> = {
  en: [
    'apple', 'bread', 'bridge', 'candle', 'castle', 'circle', 'cloud', 'courage',
    'dancer', 'decision', 'desert', 'diamond', 'dream', 'eagle', 'echo', 'engine',
    'family', 'feather', 'flower', 'forest', 'freedom', 'friendship', 'garden',
    'harbor', 'history', 'horizon', 'island', 'journey', 'jungle', 'kitchen',
    'ladder', 'lantern', 'meadow', 'memory', 'mirror', 'mountain', 'music', 'nature',
    'ocean', 'palace', 'pathway', 'peace', 'planet', 'puzzle', 'rainbow', 'river',
    'rocket', 'shadow', 'silence', 'silver', 'soldier', 'spark', 'starlight',
    'statue', 'storm', 'stream', 'strength', 'sunrise', 'sunset', 'temple',
    'thunder', 'treasure', 'valley', 'village', 'volcano', 'voyage', 'waterfall',
    'weather', 'whisper', 'window', 'wisdom', 'wonder', 'writer', 'adventure', 'breeze',
  ],
  de: [
    'der Apfel', 'das Brot', 'die Brücke', 'die Kerze', 'das Schloss', 'der Kreis',
    'die Wolke', 'der Mut', 'der Tänzer', 'die Entscheidung', 'die Wüste', 'der Diamant',
    'der Traum', 'der Adler', 'das Echo', 'der Motor', 'die Familie', 'die Feder',
    'die Blume', 'der Wald', 'die Freiheit', 'die Freundschaft', 'der Garten',
    'der Hafen', 'die Geschichte', 'der Horizont', 'die Insel', 'die Reise',
    'der Dschungel', 'die Küche', 'die Leiter', 'die Laterne', 'die Wiese',
    'die Erinnerung', 'der Spiegel', 'der Berg', 'die Musik', 'die Natur',
    'der Ozean', 'der Palast', 'der Pfad', 'der Frieden', 'der Planet', 'das Rätsel',
    'der Regenbogen', 'der Fluss', 'die Rakete', 'der Schatten', 'die Stille',
    'das Silber', 'der Soldat', 'der Funke', 'das Sternenlicht', 'die Statue',
    'der Sturm', 'der Bach', 'die Stärke', 'der Sonnenaufgang', 'der Sonnenuntergang',
    'der Tempel', 'der Donner', 'der Schatz', 'das Tal', 'das Dorf', 'der Vulkan',
    'die Seereise', 'der Wasserfall', 'das Wetter', 'das Flüstern', 'das Fenster',
    'die Weisheit', 'das Wunder', 'der Schriftsteller', 'das Abenteuer', 'die Brise',
  ],
  bn: [
    'আপেল', 'রুটি', 'সেতু', 'মোমবাতি', 'প্রাসাদ', 'বৃত্ত', 'মেঘ', 'সাহস',
    'নৃত্যশিল্পী', 'সিদ্ধান্ত', 'মরুভূমি', 'হীরা', 'স্বপ্ন', 'ঈগল', 'প্রতিধ্বনি',
    'ইঞ্জিন', 'পরিবার', 'পালক', 'ফুল', 'বন', 'স্বাধীনতা', 'বন্ধুত্ব', 'বাগান',
    'বন্দর', 'ইতিহাস', 'দিগন্ত', 'দ্বীপ', 'ভ্রমণ', 'জঙ্গল', 'রান্নাঘর', 'মই',
    'লণ্ঠন', 'তৃণভূমি', 'স্মৃতি', 'আয়না', 'পাহাড়', 'সঙ্গীত', 'প্রকৃতি', 'মহাসাগর',
    'মহল', 'পথ', 'শান্তি', 'গ্রহ', 'ধাঁধা', 'রংধনু', 'নদী', 'রকেট', 'ছায়া',
    'নীরবতা', 'রুপা', 'সৈনিক', 'স্ফুলিঙ্গ', 'নক্ষত্রালোক', 'মূর্তি', 'ঝড়', 'ঝর্ণা',
    'শক্তি', 'সূর্যোদয়', 'সূর্যাস্ত', 'মন্দির', 'বজ্রপাত', 'গুপ্তধন', 'উপত্যকা',
    'গ্রাম', 'আগ্নেয়গিরি', 'জলপ্রপাত', 'আবহাওয়া', 'ফিসফিস', 'জানালা', 'জ্ঞান',
    'বিস্ময়', 'লেখক', 'অভিযান', 'বাতাস',
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
  const [answeredIncorrectly, setAnsweredIncorrectly] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Synchronously reset state during render when card or direction changes to eliminate any flash/glitch
  const [prevCardId, setPrevCardId] = useState(card.id);
  const [prevDirection, setPrevDirection] = useState(direction);
  if (card.id !== prevCardId || direction !== prevDirection) {
    setPrevCardId(card.id);
    setPrevDirection(direction);
    setSelectedIndex(null);
    setIsAnswered(false);
    setAnsweredIncorrectly(false);
    setIsTransitioning(false);
  }

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

    // True Fisher-Yates random shuffle of the entire distractor pool to ensure unique, unpredictable choices
    for (let i = poolArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolArray[i], poolArray[j]] = [poolArray[j], poolArray[i]];
    }

    // Select 5 unique random distractors
    const chosenDistractors = poolArray.slice(0, 5);

    // Combine with correct answer and shuffle final 6 choices
    const combined = [correctAnswer, ...chosenDistractors];
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
    setAnsweredIncorrectly(false);
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

      if (isCorrect) {
        setAnsweredIncorrectly(false);
        // Automatically proceed after snappy 300ms visual feedback
        setIsTransitioning(true);
        setTimeout(() => {
          onAnswer(true);
          setIsTransitioning(false);
        }, 300);
      } else {
        // For wrong answers, show Continue button and allow reviewing the correct answer
        setAnsweredIncorrectly(true);
      }
    },
    [
      isAnswered,
      submitting,
      isTransitioning,
      correctOptionIndex,
      onAnswer,
    ],
  );

  // Manual proceed for incorrect answer review
  const handleProceedAfterWrong = useCallback(() => {
    if (submitting || isTransitioning) return;
    setIsTransitioning(true);
    onAnswer(false);
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
      } else if (answeredIncorrectly && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleProceedAfterWrong();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnswered,
    answeredIncorrectly,
    handleSelectOption,
    handleProceedAfterWrong,
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

          {/* Continue button shown ONLY on incorrect answer review */}
          {answeredIncorrectly && !isTransitioning && (
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
