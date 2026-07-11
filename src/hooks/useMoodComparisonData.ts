import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';

export interface MoodComparisonPoint {
  date: string;
  ts: number;
  self: number | null;
  [subjectId: string]: number | null | string;
}

export interface UseMoodComparisonDataResult {
  data: MoodComparisonPoint[];
  loading: boolean;
  subjectHasData: Record<string, boolean>;
}

interface UseMoodComparisonDataParams {
  userId: string | null | undefined;
  compareSubjectIds: string[];
  days?: number;
  refreshKey?: number;
}

export const useMoodComparisonData = ({
  userId,
  compareSubjectIds,
  days = 30,
  refreshKey = 0,
}: UseMoodComparisonDataParams): UseMoodComparisonDataResult => {
  const [data, setData] = useState<MoodComparisonPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjectHasData, setSubjectHasData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setData([]);
        setSubjectHasData({});
        setLoading(false);
        return;
      }

      setLoading(true);
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // 1. Fetch Self Mood Pulses
      const selfMoodPromise = supabase
        .from('mood_pulses')
        .select('level, entry_date, created_at')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .is('subject_id', null)
        .gte('entry_date', startDate);

      // 2. Fetch Selected Relatives Mood Pulses (if any are selected)
      let relativeMoodPromise = null;
      if (compareSubjectIds.length > 0) {
        relativeMoodPromise = supabase
          .from('mood_pulses')
          .select('level, entry_date, subject_id, created_at')
          .eq('user_id', userId)
          .eq('subject_type', 'relative')
          .in('subject_id', compareSubjectIds)
          .gte('entry_date', startDate);
      }

      const [selfMoodRes, relativeMoodRes] = await Promise.all([
        selfMoodPromise,
        relativeMoodPromise ?? Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;

      const selfMoodRows = selfMoodRes.data ?? [];
      const relativeMoodRows = relativeMoodRes?.data ?? [];

      // Maps to track the newest pulse per date per subject
      const selfLatestMap: Record<string, { level: number; created_at: string }> = {};
      const relativeLatestMap: Record<string, Record<string, { level: number; created_at: string }>> = {};

      selfMoodRows.forEach((row) => {
        const d = row.entry_date;
        const rowCreatedAt = row.created_at || '';
        const current = selfLatestMap[d];
        if (!current || rowCreatedAt > current.created_at) {
          selfLatestMap[d] = { level: row.level, created_at: rowCreatedAt };
        }
      });

      relativeMoodRows.forEach((row) => {
        const d = row.entry_date;
        const id = row.subject_id;
        const rowCreatedAt = row.created_at || '';
        if (id) {
          if (!relativeLatestMap[d]) {
            relativeLatestMap[d] = {};
          }
          const current = relativeLatestMap[d][id];
          if (!current || rowCreatedAt > current.created_at) {
            relativeLatestMap[d][id] = { level: row.level, created_at: rowCreatedAt };
          }
        }
      });

      const now = new Date();
      // Initialize the daily list for the entire date range to ensure all days are represented
      const points: MoodComparisonPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        const selfLatest = selfLatestMap[d];
        const pt: MoodComparisonPoint = {
          date: d,
          ts: parseISO(d).getTime(),
          self: selfLatest ? selfLatest.level : null,
        };
        compareSubjectIds.forEach((id) => {
          const relLatest = relativeLatestMap[d]?.[id];
          pt[id] = relLatest ? relLatest.level : null;
        });
        points.push(pt);
      }

      points.sort((a, b) => a.ts - b.ts);

      // Track if each selected subject actually has data in the active window
      const hasDataMap: Record<string, boolean> = {};
      compareSubjectIds.forEach((id) => {
        hasDataMap[id] = points.some((p) => p[id] !== null);
      });

      setData(points);
      setSubjectHasData(hasDataMap);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, compareSubjectIds, days, refreshKey]);

  return { data, loading, subjectHasData };
};
