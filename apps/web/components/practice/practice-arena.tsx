"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserVocabulary } from "@vocabulary/types";
import { LanguagePair } from "@/lib/constants";
import { api } from "@/lib/api";
import { Flashcard } from "./flashcard";
import { QuizTrainer } from "./quiz-trainer";
import { ArticleTrainer } from "./article-trainer";
import { SessionSummary } from "./session-summary";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  X,
  Loader as Loader2,
  ListCheck as Target,
  Layers,
  Bookmark as BookMarked,
  ArrowLeft,
  RotateCcw,
} from "@keyline-icons/react";

interface PracticeArenaProps {
  activePair: LanguagePair;
  onReturnToLibrary: () => void;
  onSessionComplete?: () => void;
}

export type PracticeMode = "trainer" | "flashcard" | "article";

interface SavedPracticeSession {
  pairId: string;
  mode: PracticeMode;
  queue: UserVocabulary[];
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  timestamp: number;
}

export function PracticeArena({
  activePair,
  onReturnToLibrary,
  onSessionComplete,
}: PracticeArenaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const sessionKey = `vocab_practice_session_${activePair.id}`;

  const [mode, setMode] = useState<PracticeMode>("trainer");
  const [queue, setQueue] = useState<UserVocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  // Session tallies
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [, setLastFeedback] = useState<{
    word: string;
    isCorrect: boolean;
    newStatus: string;
  } | null>(null);

  // Helper to persist current session to sessionStorage
  const persistSession = useCallback(
    (
      newIndex: number,
      newCorrect: number,
      newWrong: number,
      newQueue: UserVocabulary[],
      newMode: PracticeMode
    ) => {
      if (typeof window === "undefined") return;
      try {
        const payload: SavedPracticeSession = {
          pairId: activePair.id,
          mode: newMode,
          queue: newQueue,
          currentIndex: newIndex,
          correctCount: newCorrect,
          wrongCount: newWrong,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(sessionKey, JSON.stringify(payload));
      } catch (err) {
        console.warn("Failed to persist practice session:", err);
      }
    },
    [sessionKey, activePair.id]
  );

  // Helper to clear saved session
  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(sessionKey);
    } catch (err) {
      console.warn("Failed to clear practice session:", err);
    }
  }, [sessionKey]);

  // Load queue or restore session
  const initSession = useCallback(async () => {
    try {
      setLoading(true);
      setCompleted(false);

      const urlModeParam = searchParams.get("mode") as PracticeMode | null;
      const initialMode: PracticeMode =
        urlModeParam && ["trainer", "flashcard", "article"].includes(urlModeParam)
          ? urlModeParam
          : "trainer";

      // 1. Try to restore active session from sessionStorage
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) {
          try {
            const parsed: SavedPracticeSession = JSON.parse(raw);
            const isValidPair = parsed.pairId === activePair.id;
            const hasCards = Array.isArray(parsed.queue) && parsed.queue.length > 0;
            const notExpired = Date.now() - (parsed.timestamp || 0) < 1000 * 60 * 60 * 4;
            const notFinished = parsed.currentIndex < parsed.queue.length;
            const isMatchingMode = parsed.mode === initialMode;

            // Only restore if saved session matches the requested mode (don't load trainer deck into article mode)
            if (isValidPair && hasCards && notExpired && notFinished && isMatchingMode) {
              setQueue(parsed.queue);
              setCurrentIndex(parsed.currentIndex || 0);
              setCorrectCount(parsed.correctCount || 0);
              setWrongCount(parsed.wrongCount || 0);
              setMode(urlModeParam || parsed.mode || initialMode);
              setIsRevealed(false);
              setLoading(false);
              return;
            }
          } catch {
            // Invalid JSON, fallback to API
          }
        }
      }

      // 2. No valid saved session: fetch fresh review queue from API
      setMode(initialMode);
      setCurrentIndex(0);
      setIsRevealed(false);
      setCorrectCount(0);
      setWrongCount(0);
      setLastFeedback(null);

      const items = await api.practice.getQueue(
        {
          sourceLanguage: activePair.source,
          targetLanguage: activePair.target,
          limit: 20,
          exerciseType: initialMode === "article" ? "ARTICLE_GUESS" : undefined,
        },
        true // bypassCache to ensure fresh randomized unique words every session
      );

      const newQueue = items || [];
      setQueue(newQueue);

      if (newQueue.length > 0) {
        persistSession(0, 0, 0, newQueue, initialMode);
      }
    } catch (err) {
      console.error("Failed to load practice queue:", err);
    } finally {
      setLoading(false);
    }
  }, [activePair, sessionKey, searchParams, persistSession]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Handle switching practice modes (Multiple Choice, Flashcards, Article)
  const handleModeChange = async (newMode: PracticeMode) => {
    setMode(newMode);
    setCurrentIndex(0);
    setIsRevealed(false);

    // Sync mode into URL without reloading
    startTransition(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        params.set("mode", newMode);
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch {
        // Ignore router errors
      }
    });

    // When switching into or out of Article mode, fetch a dedicated queue for that mode
    if (newMode === "article" || mode === "article") {
      try {
        setLoading(true);
        setCompleted(false);
        setCorrectCount(0);
        setWrongCount(0);
        setLastFeedback(null);

        const items = await api.practice.getQueue(
          {
            sourceLanguage: activePair.source,
            targetLanguage: activePair.target,
            limit: 20,
            exerciseType: newMode === "article" ? "ARTICLE_GUESS" : undefined,
          },
          true
        );

        const newQueue = items || [];
        setQueue(newQueue);
        if (newQueue.length > 0) {
          persistSession(0, 0, 0, newQueue, newMode);
        }
      } catch (err) {
        console.error("Failed to load queue for new mode:", err);
      } finally {
        setLoading(false);
      }
    } else {
      persistSession(0, correctCount, wrongCount, queue, newMode);
    }
  };

  // Restart session with fresh queue from server
  const handleRestart = async () => {
    clearSession();
    try {
      setLoading(true);
      setCompleted(false);
      setCurrentIndex(0);
      setIsRevealed(false);
      setCorrectCount(0);
      setWrongCount(0);
      setLastFeedback(null);

      const items = await api.practice.getQueue(
        {
          sourceLanguage: activePair.source,
          targetLanguage: activePair.target,
          limit: 20,
          exerciseType: mode === "article" ? "ARTICLE_GUESS" : undefined,
        },
        true // bypassCache to fetch fresh cards
      );

      const newQueue = items || [];
      setQueue(newQueue);
      if (newQueue.length > 0) {
        persistSession(0, 0, 0, newQueue, mode);
      }
    } catch (err) {
      console.error("Failed to restart practice queue:", err);
    } finally {
      setLoading(false);
    }
  };

  // Gracefully return to library and clear in-flight session
  const handleReturnToLibrary = () => {
    clearSession();
    onReturnToLibrary();
  };

  // Compute active deck based on mode
  const activeDeck =
    mode === "article" ? queue.filter((item) => !!item.article) : queue;

  // Submit answer with zero-latency optimistic progression
  const handleAnswer = (isCorrect: boolean) => {
    const currentCard = activeDeck[currentIndex];
    if (!currentCard) return;

    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    const nextWrong = !isCorrect ? wrongCount + 1 : wrongCount;

    if (isCorrect) {
      setCorrectCount(nextCorrect);
    } else {
      setWrongCount(nextWrong);
    }

    setLastFeedback({
      word: currentCard.word,
      isCorrect,
      newStatus: currentCard.status,
    });

    // 1. Non-blocking asynchronous background sync to API
    const exerciseType =
      mode === "trainer"
        ? "MULTIPLE_CHOICE"
        : mode === "article"
          ? "ARTICLE_GUESS"
          : "FLASHCARD";

    api.practice
      .submitAttempt({
        userVocabularyId: currentCard.id,
        exerciseType,
        isCorrect,
      })
      .catch((err) => {
        console.warn("Background practice attempt sync failed:", err);
      });

    // 2. Instant optimistic advancement to next card (0ms latency!)
    const nextIndex = currentIndex + 1;

    if (nextIndex >= activeDeck.length) {
      setCompleted(true);
      clearSession();
      if (onSessionComplete) onSessionComplete();
    } else {
      setCurrentIndex(nextIndex);
      setIsRevealed(false);
      persistSession(nextIndex, nextCorrect, nextWrong, queue, mode);
    }
  };

  // Keyboard navigation for Flashcard mode only
  useEffect(() => {
    if (mode !== "flashcard") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (completed || activeDeck.length === 0) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsRevealed((prev) => !prev);
      } else if (e.key === "1") {
        e.preventDefault();
        handleAnswer(false);
      } else if (e.key === "2") {
        e.preventDefault();
        handleAnswer(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, completed, activeDeck, currentIndex, isRevealed, submitting]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs">
          Preparing practice queue for {activePair.label}...
        </span>
      </div>
    );
  }

  if (completed) {
    return (
      <SessionSummary
        totalReviewed={correctCount + wrongCount}
        correctCount={correctCount}
        wrongCount={wrongCount}
        onRestart={handleRestart}
        onReturnToLibrary={handleReturnToLibrary}
      />
    );
  }

  if (queue.length === 0) {
    return (
      <div className="max-w-md mx-auto rounded-xl border border-dashed border-border p-12 text-center space-y-4">
        <h3 className="font-semibold text-base text-foreground">
          No practice cards due
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You are all caught up on your {activePair.label} vocabulary reviews.
          Add new words to practice them!
        </p>
        <Button size="sm" onClick={handleReturnToLibrary} className="text-xs">
          Return to Library
        </Button>
      </div>
    );
  }

  // If in article mode but no words have an article
  if (mode === "article" && activeDeck.length === 0) {
    return (
      <div className="max-w-md mx-auto rounded-xl border border-dashed border-border p-8 text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-article-der-muted text-article-der border border-article-der-border mx-auto flex items-center justify-center font-bold">
          der
        </div>
        <h3 className="font-semibold text-base text-foreground">
          No German Nouns with Articles in Queue
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          None of the words in your current review deck have German articles
          (der, die, das) assigned. Use the other practice modes, or add
          articles to your nouns in the Library!
        </p>
        <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleRestart}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Load German Nouns
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleModeChange("trainer")}
            className="text-xs"
          >
            Switch to Multiple Choice
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReturnToLibrary} className="text-xs">
            Return to Library
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = activeDeck[currentIndex];
  const progressPercent = Math.round((currentIndex / activeDeck.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Mode Switcher & Progress Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        {/* Practice Mode Selector */}
        <div className="inline-flex p-1 rounded-lg bg-muted/70 border border-border/60 flex-wrap gap-1">
          {/* Multiple Choice Trainer */}
          <button
            type="button"
            onClick={() => handleModeChange("trainer")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              mode === "trainer"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Multiple Choice</span>
          </button>

          {/* Flashcards */}
          <button
            type="button"
            onClick={() => handleModeChange("flashcard")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              mode === "flashcard"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Flashcards</span>
          </button>

          {/* German Article Trainer (der / die / das) */}
          {activePair.source === "de" && (
            <button
              type="button"
              onClick={() => handleModeChange("article")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                mode === "article"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookMarked className="h-3.5 w-3.5 text-article-der" />
              <span>Article Trainer (der/die/das)</span>
            </button>
          )}
        </div>

        {/* Card Progress & Exit Action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Card {currentIndex + 1} of {activeDeck.length}
            </span>
            <div className="w-20 sm:w-28">
              <Progress value={progressPercent} className="h-1.5" />
            </div>
            <span className="font-mono text-[11px]">{progressPercent}%</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReturnToLibrary}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="Exit session and return to Library"
          >
            <ArrowLeft className="h-3 w-3" />
            Exit
          </Button>
        </div>
      </div>

      {/* Mode 1: Multiple Choice Guessing Trainer */}
      {mode === "trainer" ? (
        <QuizTrainer
          key={`quiz-${currentCard.id}`}
          card={currentCard}
          allCards={activeDeck}
          activePair={activePair}
          onAnswer={handleAnswer}
          submitting={submitting}
        />
      ) : mode === "article" ? (
        /* Mode 2: German Article Trainer (der / die / das) */
        <ArticleTrainer
          key={`article-${currentCard.id}`}
          card={currentCard}
          onAnswer={handleAnswer}
          submitting={submitting}
        />
      ) : (
        /* Mode 3: Flashcard Review Arena */
        <div className="space-y-5">
          <Flashcard
            key={`flashcard-${currentCard.id}`}
            card={currentCard}
            isRevealed={isRevealed}
            onToggleReveal={() => setIsRevealed((v) => !v)}
          />

          {/* Flashcard Answer Controls */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Wrong Button */}
              <Button
                variant="outline"
                onClick={() => handleAnswer(false)}
                disabled={submitting}
                className="h-12 border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Wrong / Forgot</div>
                  <div className="text-[10px] opacity-75 font-normal">
                    Press 1
                  </div>
                </div>
              </Button>

              {/* Correct Button */}
              <Button
                onClick={() => handleAnswer(true)}
                disabled={submitting}
                className="h-12 border-success/30 text-primary-foreground flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs font-semibold">
                    Correct / Remembered
                  </div>
                  <div className="text-[10px] opacity-75 font-normal">
                    Press 2
                  </div>
                </div>
              </Button>
            </div>

            {/* Keyboard hints footer */}
            <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-4">
              <span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 border border-border">
                  Space
                </kbd>{" "}
                Flip
              </span>
              <span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 border border-border">
                  1
                </kbd>{" "}
                Wrong
              </span>
              <span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 border border-border">
                  2
                </kbd>{" "}
                Correct
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
