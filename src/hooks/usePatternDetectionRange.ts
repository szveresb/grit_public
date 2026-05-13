import { useCallback, useEffect, useMemo, useState } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export type PatternRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface PatternRange {
  preset: PatternRangePreset;
  /** ISO yyyy-MM-dd, only used when preset === 'custom' */
  startDate?: string;
  endDate?: string;
}

export interface ResolvedRange {
  start: Date;
  end: Date;
  days: number;
}

const DEFAULT_RANGE: PatternRange = { preset: '30d' };
const STORAGE_PREFIX = 'grit_pattern_detection_range_';

const presetDays: Record<Exclude<PatternRangePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const safeParse = (raw: string | null): PatternRange => {
  if (!raw) return DEFAULT_RANGE;
  try {
    const parsed = JSON.parse(raw) as PatternRange;
    if (!parsed?.preset) return DEFAULT_RANGE;
    return parsed;
  } catch {
    return DEFAULT_RANGE;
  }
};

const resolve = (range: PatternRange): ResolvedRange => {
  if (range.preset === 'custom' && range.startDate && range.endDate) {
    let start = startOfDay(new Date(range.startDate));
    let end = endOfDay(new Date(range.endDate));
    if (end < start) [start, end] = [endOfDay(new Date(range.endDate)), startOfDay(new Date(range.startDate))];
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    return { start, end, days };
  }
  const days = presetDays[range.preset === 'custom' ? '30d' : range.preset];
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return { start, end, days };
};

export const usePatternDetectionRange = () => {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : null;

  const [range, setRangeState] = useState<PatternRange>(() => {
    if (typeof window === 'undefined' || !storageKey) return DEFAULT_RANGE;
    return safeParse(window.localStorage.getItem(storageKey));
  });

  // Reload when user changes
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    setRangeState(safeParse(window.localStorage.getItem(storageKey)));
  }, [storageKey]);

  const setRange = useCallback(
    (next: PatternRange) => {
      setRangeState(next);
      if (storageKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
    },
    [storageKey],
  );

  const reset = useCallback(() => setRange(DEFAULT_RANGE), [setRange]);

  const resolved = useMemo(() => resolve(range), [range]);

  return { range, setRange, reset, resolved };
};
