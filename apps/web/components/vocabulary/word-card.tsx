'use client';

import React from 'react';
import { UserVocabulary } from '@vocabulary/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STATUS_META } from '@/lib/constants';
import { playWordSpeech } from '@/lib/audio';
import { MoreHorizontal, Bin as Trash2, ArrowUpRight as ExternalLink, Volume as Volume2, Pen as Pencil } from '@keyline-icons/react';

interface WordCardProps {
  item: UserVocabulary;
  onDelete: (id: string) => void;
  onEdit?: (item: UserVocabulary) => void;
  onLookup?: (word: string) => void;
  onClick?: (item: UserVocabulary) => void;
}

export function WordCard({ item, onDelete, onEdit, onLookup, onClick }: WordCardProps) {
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

  return (
    <Card
      onClick={() => onClick?.(item)}
      className="group relative border-border/80 bg-card hover:border-foreground/30 hover:shadow-sm transition-all duration-150 cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2.5">
        {/* Top Header: Word, Article, Speaker, and More Menu */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-1">
            {item.article && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${articleBadgeClass}`}
              >
                {item.article}
              </span>
            )}

            <h4 className="font-semibold text-sm sm:text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
              {item.word}
            </h4>

            <button
              type="button"
              onClick={handleSpeak}
              title="Pronounce word"
              className="p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action Menu */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 -mr-1 -mt-1"
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Word
                  </DropdownMenuItem>
                )}
                {onLookup && (
                  <DropdownMenuItem onClick={() => onLookup(item.word)} className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Lookup Dictionary
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(item.id)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Translation */}
        <div className="space-y-0.5">
          {item.translation ? (
            <p className="text-xs sm:text-sm font-medium text-foreground/90 line-clamp-1">
              {item.translation}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No translation</p>
          )}

          {/* Plural or Part of Speech */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
            {item.partOfSpeech && <span className="italic">{item.partOfSpeech}</span>}
            {item.partOfSpeech && item.plural && <span>•</span>}
            {item.plural && (
              <span className="font-mono text-[10px] text-muted-foreground/80 truncate">
                {item.plural}
              </span>
            )}
          </div>
        </div>

        {/* Footer: Mastery & Status Badge */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
          <Badge
            variant="outline"
            className={`text-[10px] font-normal px-1.5 py-0 rounded ${meta.badgeClass}`}
          >
            {meta.label}
          </Badge>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-foreground/80">
              {item.masteryScore.toFixed(0)}%
            </span>
            <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, item.masteryScore))}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
