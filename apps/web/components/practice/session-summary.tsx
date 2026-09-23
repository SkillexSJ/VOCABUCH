'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, RotateCcw, BookOpen, CircleCheck as CheckCircle2, CircleAlert as AlertCircle } from '@keyline-icons/react';

interface SessionSummaryProps {
  totalReviewed: number;
  correctCount: number;
  wrongCount: number;
  onRestart: () => void;
  onReturnToLibrary: () => void;
}

export function SessionSummary({
  totalReviewed,
  correctCount,
  wrongCount,
  onRestart,
  onReturnToLibrary,
}: SessionSummaryProps) {
  const accuracy = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;

  return (
    <Card className="max-w-md mx-auto border-border text-center shadow-xs">
      <CardContent className="p-8 space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Award className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            Session Completed
          </h3>
          <p className="text-xs text-muted-foreground">
            Your mastery scores and review schedules have been updated.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 rounded-lg border border-border bg-muted/20 p-3.5 text-xs">
          <div>
            <div className="text-muted-foreground">Reviewed</div>
            <div className="text-lg font-semibold text-foreground mt-0.5">
              {totalReviewed}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-success">
              <CheckCircle2 className="h-3 w-3" /> Correct
            </div>
            <div className="text-lg font-semibold text-foreground mt-0.5">
              {correctCount}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" /> Weak
            </div>
            <div className="text-lg font-semibold text-foreground mt-0.5">
              {wrongCount}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onReturnToLibrary} className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Return to Library
          </Button>
          <Button size="sm" onClick={onRestart} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Practice More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
