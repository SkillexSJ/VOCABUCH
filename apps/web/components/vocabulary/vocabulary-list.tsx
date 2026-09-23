'use client';

import React, { useState } from 'react';
import { UserVocabulary } from '@vocabulary/types';
import { WordCard } from './word-card';
import { WordDetailDialog } from './word-detail-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ChevronsLeft,
  ChevronsRight,
} from '@keyline-icons/react';

interface VocabularyListProps {
  items: UserVocabulary[];
  total: number;
  page: number;
  limit: number;
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter?: string;
  onStatusFilterChange: (status?: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: UserVocabulary) => void;
  onLookup?: (word: string) => void;
  loading?: boolean;
}

const FILTER_TABS = [
  { id: '', label: 'All' },
  { id: 'INCOMPLETE', label: 'Needs Attention' },
  { id: 'LEARNING', label: 'Learning' },
  { id: 'NEW', label: 'New' },
  { id: 'PROFICIENT', label: 'Proficient' },
  { id: 'MASTERED', label: 'Mastered' },
  { id: 'SAVED', label: 'Saved' },
];

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export function VocabularyList({
  items,
  total,
  page,
  limit,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onLimitChange,
  onDelete,
  onEdit,
  onLookup,
  loading,
}: VocabularyListProps) {
  const [selectedWord, setSelectedWord] = useState<UserVocabulary | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Compute pagination range with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const handleCardClick = (item: UserVocabulary) => {
    setSelectedWord(item);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search word, meaning, or sentence..."
            className="pl-8 text-xs h-8"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isSelected = (statusFilter || '') === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onStatusFilterChange(tab.id || undefined)}
                className={`rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Content Area: 4 Columns on Large Displays, 3 on Medium, 2 on Small */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(limit > 24 ? 12 : limit)].map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-border bg-card/40 space-y-3 h-32 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-9 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 rounded" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-3.5 w-12 rounded" />
                <Skeleton className="h-2 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <h3 className="font-medium text-sm text-foreground">
            No vocabulary found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {search || statusFilter
              ? 'Try clearing your search query or status filter.'
              : 'Add your first word using the button above to start your learning deck.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <WordCard
              key={item.id}
              item={item}
              onDelete={onDelete}
              onEdit={onEdit}
              onLookup={onLookup}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Enhanced Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/80 text-xs text-muted-foreground">
        {/* Left: Summary & Page Size Selector */}
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-foreground">{total === 0 ? 0 : (page - 1) * limit + 1}</strong>–
            <strong className="text-foreground">{Math.min(page * limit, total)}</strong> of{' '}
            <strong className="text-foreground">{total}</strong> words
          </span>

          {onLimitChange && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <span className="text-[11px]">Per page:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="h-6 rounded border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Numeric Page Navigation Buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={page <= 1 || loading}
              className="h-7 w-7 p-0"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="h-7 w-7 p-0"
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Numbered Page Buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers().map((p, idx) =>
                typeof p === 'number' ? (
                  <Button
                    key={idx}
                    variant={p === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(p)}
                    disabled={loading}
                    className="h-7 w-7 p-0 text-xs"
                  >
                    {p}
                  </Button>
                ) : (
                  <span key={idx} className="px-1 text-muted-foreground/60 select-none">
                    ...
                  </span>
                )
              )}
            </div>

            {/* Mobile simplified indicator */}
            <span className="sm:hidden px-2 text-xs">
              {page} / {totalPages}
            </span>

            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="h-7 w-7 p-0"
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>

            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages || loading}
              className="h-7 w-7 p-0"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Word Detail Modal View */}
      <WordDetailDialog
        item={selectedWord}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
