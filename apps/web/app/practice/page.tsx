'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserProgressStats, CreateVocabularyDto } from '@vocabulary/types';
import { api } from '@/lib/api';
import { useLanguagePair } from '@/lib/use-language-pair';
import { Header } from '@/components/layout/header';
import { PracticeArena } from '@/components/practice/practice-arena';
import { AddWordDialog } from '@/components/vocabulary/add-word-dialog';
import { ArrowLeft, Loader as Loader2 } from '@keyline-icons/react';

function PracticeContent() {
  const router = useRouter();
  const { activePair, setActivePair } = useLanguagePair();

  // Header stats state
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Load stats to show practice badge in Header
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.practice.getStats(activePair.source, activePair.target);
      setStats(res);
    } catch (err) {
      console.error('Failed to load stats in Practice page:', err);
    }
  }, [activePair]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle adding words while in practice
  const handleAddWord = async (dto: CreateVocabularyDto) => {
    await api.vocabulary.create(dto);
    await fetchStats();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <Header
        activePair={activePair}
        onSelectPair={setActivePair}
        onOpenAddModal={() => setIsAddOpen(true)}
        practiceDueCount={stats?.exercisesDueToday || 0}
      />

      {/* Main Practice Workspace */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb / Deck Context */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Library
          </Link>
          <div className="text-xs text-muted-foreground">
            Language Pair: <span className="font-semibold text-foreground">{activePair.label}</span>
          </div>
        </div>

        {/* Practice Arena */}
        <PracticeArena
          activePair={activePair}
          onReturnToLibrary={() => router.push('/')}
          onSessionComplete={fetchStats}
        />
      </main>

      {/* Add Word Modal */}
      <AddWordDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        activePair={activePair}
        onSubmit={handleAddWord}
      />
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Loading Practice Arena...</span>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
