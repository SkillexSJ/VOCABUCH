'use client';

import React, { useState, useEffect } from 'react';
import { UserVocabulary } from '@vocabulary/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { playGermanAudio } from '@/lib/audio';
import { CircleCheck as CheckCircle2, CircleX as XCircle, ArrowRight, Volume as Volume2, Sparkles, Quote, CircleQuestion as HelpCircle } from '@keyline-icons/react';

interface ArticleTrainerProps {
  card: UserVocabulary;
  onAnswer: (isCorrect: boolean) => void;
  submitting: boolean;
}

const ARTICLES = [
  {
    id: 'der',
    label: 'der',
    gender: 'Masculine (m)',
    key: '1',
    colorClass: 'bg-article-der text-primary-foreground border-article-der',
    outlineClass: 'border-article-der-border text-article-der hover:bg-article-der-muted',
    badgeClass: 'badge-article-der',
  },
  {
    id: 'die',
    label: 'die',
    gender: 'Feminine (f)',
    key: '2',
    colorClass: 'bg-article-die text-primary-foreground border-article-die',
    outlineClass: 'border-article-die-border text-article-die hover:bg-article-die-muted',
    badgeClass: 'badge-article-die',
  },
  {
    id: 'das',
    label: 'das',
    gender: 'Neuter (n)',
    key: '3',
    colorClass: 'bg-article-das text-primary-foreground border-article-das',
    outlineClass: 'border-article-das-border text-article-das hover:bg-article-das-muted',
    badgeClass: 'badge-article-das',
  },
];

export function ArticleTrainer({
  card,
  onAnswer,
  submitting,
}: ArticleTrainerProps) {
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const correctArticle = card.article?.toLowerCase() || '';

  // Reset state when card changes
  useEffect(() => {
    setSelectedArticle(null);
    setHasAnswered(false);
    setShowHint(false);
  }, [card.id]);

  const handleSelect = (articleId: string) => {
    if (hasAnswered || submitting) return;
    setSelectedArticle(articleId);
    setHasAnswered(true);
  };

  const handleContinue = () => {
    if (!selectedArticle) return;
    const isCorrect = selectedArticle.toLowerCase() === correctArticle.toLowerCase();
    onAnswer(isCorrect);
  };

  // Keyboard navigation: 1 for der, 2 for die, 3 for das, Enter/Space to continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!hasAnswered) {
        if (e.key === '1') {
          e.preventDefault();
          handleSelect('der');
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelect('die');
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelect('das');
        }
      } else {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleContinue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAnswered, selectedArticle, correctArticle, submitting]);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    playGermanAudio(card.word, correctArticle || undefined);
  };

  const isCorrect = selectedArticle?.toLowerCase() === correctArticle.toLowerCase();

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-xs overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Top Word Display */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Guess the German Article
              </span>
              <button
                type="button"
                onClick={handleSpeak}
                title="Listen to pronunciation"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              {/* Question: ___ [Word] */}
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="text-muted-foreground font-mono">
                  {hasAnswered ? (
                    <span
                      className={`px-2 py-0.5 rounded border text-lg sm:text-xl font-bold ${
                        isCorrect
                          ? 'banner-success'
                          : 'banner-destructive'
                      }`}
                    >
                      {correctArticle || '?'}
                    </span>
                  ) : (
                    '[ ? ]'
                  )}
                </span>
                <span>{card.word}</span>
              </div>
            </div>

            {/* Translation / Hint */}
            <div className="pt-1">
              {showHint || hasAnswered ? (
                <p className="text-sm text-foreground/80 font-normal">
                  Meaning: <span className="font-medium">{card.translation || 'No translation provided'}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Show meaning hint</span>
                </button>
              )}
            </div>

            {/* Context sentence if available */}
            {card.contextSentence && (
              <div className="mt-3 flex items-start justify-center gap-2 text-xs text-muted-foreground italic max-w-md mx-auto">
                <Quote className="h-3 w-3 shrink-0 mt-0.5 opacity-60" />
                <span>"{card.contextSentence}"</span>
              </div>
            )}
          </div>

          {/* 3 Article Option Buttons */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
            {ARTICLES.map((art) => {
              const isSelected = selectedArticle === art.id;
              const isTarget = correctArticle === art.id;

              let btnStyle = art.outlineClass;

              if (hasAnswered) {
                if (isTarget) {
                  btnStyle = 'bg-success text-primary-foreground border-success shadow-md ring-2 ring-success/30';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-destructive text-destructive-foreground border-destructive shadow-xs';
                } else {
                  btnStyle = 'opacity-40 border-border text-muted-foreground';
                }
              }

              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => handleSelect(art.id)}
                  disabled={hasAnswered || submitting}
                  className={`py-4 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${btnStyle}`}
                >
                  <span className="text-xl font-bold tracking-tight">{art.label}</span>
                  <span className="text-[10px] opacity-80">{art.gender}</span>
                  <span className="text-[9px] font-mono opacity-60 border px-1.5 py-0.2 rounded mt-1">
                    Key {art.key}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Post-Answer Feedback & Plural Information */}
          {hasAnswered && (
            <div className="space-y-4 pt-3 border-t border-border/60 animate-in fade-in-50 duration-200">
              <div
                className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                  isCorrect
                    ? 'banner-success'
                    : 'banner-destructive'
                }`}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                )}

                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-sm">
                    {isCorrect
                      ? `Correct! ${correctArticle} ${card.word}`
                      : `Incorrect. The correct article is ${correctArticle} ${card.word}`}
                  </div>

                  {card.plural && (
                    <div className="font-medium pt-0.5">
                      Plural form: <span className="font-mono font-semibold">{card.plural}</span>
                    </div>
                  )}

                  {card.notes && (
                    <div className="text-muted-foreground text-[11px] pt-1">
                      {card.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleContinue}
                  disabled={submitting}
                  className="gap-2 text-xs"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
