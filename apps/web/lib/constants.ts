import { LearningStatus } from '@vocabulary/types';

export interface LanguagePair {
  id: string;
  source: string;
  target: string;
  label: string;
  flag: string;
}

export const LANGUAGE_PAIRS: LanguagePair[] = [
  {
    id: 'de-en',
    source: 'de',
    target: 'en',
    label: 'German → English',
    flag: 'DE / EN',
  },
  {
    id: 'en-bn',
    source: 'en',
    target: 'bn',
    label: 'English → Bangla',
    flag: 'EN / BN',
  },
];

export interface StatusMeta {
  label: string;
  description: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  badgeClass: string;
}

export const STATUS_META: Record<LearningStatus, StatusMeta> = {
  SAVED: {
    label: 'Saved',
    description: 'Captured from text, awaiting practice',
    variant: 'outline',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
  NEW: {
    label: 'New',
    description: 'Queued for first introduction',
    variant: 'secondary',
    badgeClass: 'bg-info-muted text-info-foreground border-info-border',
  },
  LEARNING: {
    label: 'Learning',
    description: 'Actively being consolidated',
    variant: 'secondary',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  INCOMPLETE: {
    label: 'Needs Attention',
    description: 'Failed recent exercise; high-priority weak item',
    variant: 'destructive',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  PROFICIENT: {
    label: 'Proficient',
    description: 'Consistent correct recall across intervals',
    variant: 'default',
    badgeClass: 'bg-success-muted text-success-foreground border-success-border',
  },
  MASTERED: {
    label: 'Mastered',
    description: 'Solidified long-term memory retention',
    variant: 'default',
    badgeClass: 'bg-success-muted text-success-foreground border-success-border font-semibold',
  },
};
