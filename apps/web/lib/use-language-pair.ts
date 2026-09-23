'use client';

import { useState, useEffect, useCallback } from 'react';
import { LANGUAGE_PAIRS, LanguagePair } from '@/lib/constants';

const STORAGE_KEY = 'vocab_active_pair_id';

export function useLanguagePair() {
  const [activePair, setActivePairState] = useState<LanguagePair>(LANGUAGE_PAIRS[0]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = LANGUAGE_PAIRS.find((p) => p.id === savedId);
        if (found) {
          setActivePairState(found);
        }
      }
    } catch {
      // Ignore storage errors in restricted contexts
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setActivePair = useCallback((pair: LanguagePair) => {
    setActivePairState(pair);
    try {
      localStorage.setItem(STORAGE_KEY, pair.id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return { activePair, setActivePair, isInitialized };
}
