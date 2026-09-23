'use client';

import React from 'react';
import { UserVocabulary } from '@vocabulary/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/constants';
import { Quote, Eye, EyeOff } from '@keyline-icons/react';

interface FlashcardProps {
  card: UserVocabulary;
  isRevealed: boolean;
  onToggleReveal: () => void;
}

export function Flashcard({ card, isRevealed, onToggleReveal }: FlashcardProps) {
  const meta = STATUS_META[card.status] || STATUS_META.SAVED;

  return (
    <Card className="border-border shadow-xs hover:border-border/80 transition-all">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Card Header: Language & Status Indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-foreground">
              {card.sourceLanguage.toUpperCase()}
            </span>
            <span>→</span>
            <span className="font-semibold uppercase tracking-wider text-foreground">
              {card.targetLanguage.toUpperCase()}
            </span>
          </div>

          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${meta.badgeClass}`}>
            {meta.label}
          </Badge>
        </div>

        {/* Prompt: The Target Word */}
        <div className="text-center py-4 space-y-2">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            {card.word}
          </h2>
          {card.partOfSpeech && (
            <span className="text-xs text-muted-foreground italic">
              {card.partOfSpeech}
            </span>
          )}
        </div>

        {/* Context Sentence in Learning Language */}
        {card.contextSentence && (
          <div className="rounded-lg bg-muted/40 p-3.5 text-xs sm:text-sm text-muted-foreground border border-border/50 text-center">
            <Quote className="inline-block h-3.5 w-3.5 text-muted-foreground/60 mr-1.5 -mt-1" />
            <span className="italic">"{card.contextSentence}"</span>
          </div>
        )}

        {/* Revealed Section (Translation & Meaning) */}
        {isRevealed ? (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-center animate-in fade-in-50 duration-150">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Meaning
            </div>
            <div className="text-lg font-medium text-foreground">
              {card.translation || 'No translation provided'}
            </div>
            {card.definition && (
              <p className="text-xs text-muted-foreground max-w-md mx-auto pt-1 border-t border-border/40">
                {card.definition}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={onToggleReveal}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-md border border-dashed border-border hover:border-foreground/40"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Reveal Meaning (Press Space)</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
