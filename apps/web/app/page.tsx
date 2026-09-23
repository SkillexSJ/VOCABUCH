'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/lib/use-debounce';
import { UserVocabulary, UserProgressStats, CreateVocabularyDto, UpdateVocabularyDto } from '@vocabulary/types';
import { api } from '@/lib/api';
import { useLanguagePair } from '@/lib/use-language-pair';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/header';
import { StatsBar } from '@/components/layout/stats-bar';
import { VocabularyList } from '@/components/vocabulary/vocabulary-list';

// Dynamically code-split modal dialogs to shrink initial JS bundle
const AddWordDialog = dynamic(
  () => import('@/components/vocabulary/add-word-dialog').then((m) => m.AddWordDialog),
  { ssr: false },
);
const EditWordDialog = dynamic(
  () => import('@/components/vocabulary/edit-word-dialog').then((m) => m.EditWordDialog),
  { ssr: false },
);

export default function DashboardPage() {
  const { activePair, setActivePair } = useLanguagePair();

  // Vocabulary list state
  const [items, setItems] = useState<UserVocabulary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400); // only hits API after 400ms pause
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [listLoading, setListLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState<UserProgressStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserVocabulary | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Load stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.practice.getStats(activePair.source, activePair.target);
      setStats(res);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [activePair]);

  // Load vocabulary list — uses debouncedSearch so the API is only called
  // after the user pauses typing (not on every keystroke).
  const fetchVocabulary = useCallback(async () => {
    try {
      setListLoading(true);
      const res = await api.vocabulary.list({
        sourceLanguage: activePair.source,
        targetLanguage: activePair.target,
        status: statusFilter,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      });
      setItems(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load vocabulary:', err);
    } finally {
      setListLoading(false);
    }
  }, [activePair, statusFilter, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  // Handle word creation with parallel data refresh
  const handleAddWord = async (dto: CreateVocabularyDto) => {
    await api.vocabulary.create(dto);
    await Promise.all([fetchVocabulary(), fetchStats()]);
  };

  // Handle word update with parallel data refresh
  const handleUpdateWord = async (id: string, dto: UpdateVocabularyDto) => {
    await api.vocabulary.update(id, dto);
    await Promise.all([fetchVocabulary(), fetchStats()]);
  };

  // Handle word deletion with parallel data refresh
  const handleDeleteWord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this word?')) return;
    try {
      await api.vocabulary.delete(id);
      await Promise.all([fetchVocabulary(), fetchStats()]);
    } catch (err) {
      console.error('Failed to delete word:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <Header
        activePair={activePair}
        onSelectPair={(pair) => {
          setActivePair(pair);
          setPage(1);
        }}
        onOpenAddModal={() => setIsAddOpen(true)}
        practiceDueCount={stats?.exercisesDueToday || 0}
      />

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top Stats Overview */}
        <StatsBar stats={stats} loading={statsLoading} />

        {/* Vocabulary Library Section */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {activePair.label} Vocabulary
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage words, review sentences, and track mastery stages.
              </p>
            </div>
          </div>

          <VocabularyList
            items={items}
            total={total}
            page={page}
            limit={limit}
            search={search}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(st) => {
              setStatusFilter(st);
              setPage(1);
            }}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            onDelete={handleDeleteWord}
            onEdit={(item) => {
              setEditingItem(item);
              setIsEditOpen(true);
            }}
            loading={listLoading}
          />
        </section>
      </main>

      {/* Add Word Modal */}
      <AddWordDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        activePair={activePair}
        onSubmit={handleAddWord}
      />

      {/* Edit Word Modal */}
      <EditWordDialog
        item={editingItem}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSubmit={handleUpdateWord}
      />
    </div>
  );
}
