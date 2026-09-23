'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UserProgressStats } from '@vocabulary/types';
import { CircleAlert as AlertCircle, BookCheck, Clock, Award } from '@keyline-icons/react';

interface StatsBarProps {
  stats: UserProgressStats | null;
  loading?: boolean;
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-border bg-card/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Vocabulary */}
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Words</span>
              <BookCheck className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {stats.totalWords}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention (INCOMPLETE weak items) */}
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-destructive font-medium">
              <span>Needs Attention</span>
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {stats.incompleteWords}
            </div>
          </CardContent>
        </Card>

        {/* In Active Learning */}
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>In Learning</span>
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {stats.learningWords}
            </div>
          </CardContent>
        </Card>

        {/* Mastered Words */}
        <Card className="border-border/80 shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-success font-medium">
              <span>Mastered</span>
              <Award className="h-3.5 w-3.5 text-success" />
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {stats.masteredWords}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Mastery Bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2 text-xs">
        <span className="text-muted-foreground whitespace-nowrap">
          Overall Mastery:
        </span>
        <div className="flex-1">
          <Progress value={stats.averageMasteryScore} className="h-1.5" />
        </div>
        <span className="font-semibold text-foreground">
          {stats.averageMasteryScore}%
        </span>
      </div>
    </div>
  );
}
