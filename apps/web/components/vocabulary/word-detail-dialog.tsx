'use client';

import React from 'react';
import { UserVocabulary } from '@vocabulary/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { STATUS_META } from '@/lib/constants';
import { playWordSpeech } from '@/lib/audio';
import {
  Volume as Volume2,
  ArrowUpRight as ExternalLink,
  Quote,
  Pen as Pencil,
  Bin as Trash2,
  Calendar,
  CircleCheck as CheckCircle2,
  TrendingUp,
  Tag,
  BookOpen,
} from '@keyline-icons/react';

interface WordDetailDialogProps {
  item: UserVocabulary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: UserVocabulary) => void;
  onDelete?: (id: string) => void;
}

export function WordDetailDialog({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: WordDetailDialogProps) {
  if (!item) return null;

  const meta = STATUS_META[item.status] || STATUS_META.SAVED;

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    playWordSpeech(item.word, item.sourceLanguage, item.article || undefined);
  };

  const articleBadgeClass =
    item.article?.toLowerCase() === 'der'
      ? 'badge-article-der'
      : item.article?.toLowerCase() === 'die'
        ? 'badge-article-die'
        : item.article?.toLowerCase() === 'das'
          ? 'badge-article-das'
          : 'bg-muted text-muted-foreground border-border border';

  const nextReviewDate = item.nextReviewAt ? new Date(item.nextReviewAt) : null;
  const isDue = nextReviewDate ? nextReviewDate <= new Date() : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{item.word} Details</DialogTitle>
        </DialogHeader>

        {/* Top Header Banner: Plenty of pr-12 padding so the close button never overlaps */}
        <div className="p-5 pr-12 border-b border-border/70 bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {item.article && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${articleBadgeClass}`}
                  >
                    {item.article}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {item.word}
                </h3>
                <button
                  type="button"
                  onClick={handleSpeak}
                  title="Listen to pronunciation"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>

              {item.partOfSpeech && (
                <p className="text-xs text-muted-foreground italic">
                  {item.partOfSpeech}
                </p>
              )}
            </div>

            <Badge
              variant="outline"
              className={`text-[11px] px-2 py-0.5 shrink-0 ${meta.badgeClass}`}
            >
              {meta.label}
            </Badge>
          </div>

          {/* Primary Translation */}
          {item.translation && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Meaning / Translation
              </div>
              <p className="text-base font-medium text-foreground mt-0.5">
                {item.translation}
              </p>
            </div>
          )}
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 space-y-4 max-h-[62vh] overflow-y-auto">
          {/* German Plural Form */}
          {item.plural && (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                Plural Form & Suffix
              </div>
              <div className="text-sm font-semibold text-foreground font-mono">
                {item.plural}
              </div>
            </div>
          )}

          {/* Definition */}
          {item.definition && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Definition</span>
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                {item.definition}
              </p>
            </div>
          )}

          {/* Context Sentence */}
          {item.contextSentence && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Quote className="h-3.5 w-3.5" />
                  <span>Context Sentence</span>
                </div>
                {item.contextSourceUrl && (
                  <a
                    href={item.contextSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <span>View Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-xs sm:text-sm italic text-foreground/90 border border-border/60">
                "{item.contextSentence}"
              </div>
            </div>
          )}

          {/* Spaced Repetition Mastery Progress */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span>Memory Retention & Mastery</span>
              </div>
              <span className="text-xs font-bold text-foreground">
                {item.masteryScore.toFixed(0)}%
              </span>
            </div>

            <Progress value={item.masteryScore} className="h-2" />

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="rounded-md bg-muted/40 p-2.5 space-y-0.5 border border-border/40">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span>Practice Accuracy</span>
                </div>
                <div className="font-semibold text-foreground">
                  {item.correctAttempts} / {item.totalAttempts}{' '}
                  {item.totalAttempts > 0 &&
                    `(${Math.round((item.correctAttempts / item.totalAttempts) * 100)}%)`}
                </div>
              </div>

              <div className="rounded-md bg-muted/40 p-2.5 space-y-0.5 border border-border/40">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-info" />
                  <span>Next Review</span>
                </div>
                <div
                  className={`font-semibold ${isDue ? 'text-warning font-bold' : 'text-foreground'}`}
                >
                  {isDue
                    ? 'Due Today'
                    : nextReviewDate
                      ? nextReviewDate.toLocaleDateString()
                      : 'Unscheduled'}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span>Tags & Levels</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Personal Notes</div>
              <p className="text-xs text-foreground/80 bg-muted/20 p-2.5 rounded-md border border-border/40 whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}
        </div>

        {/* Clean Footer: Exactly aligned with no negative margins */}
        <div className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-2">
          {onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDelete(item.id);
              }}
              className="text-destructive hover:bg-destructive/10 text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Word
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(item);
                }}
                className="text-xs h-8"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 px-4"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
