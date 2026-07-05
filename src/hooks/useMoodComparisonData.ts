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
        .select('level, entry_date')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .is('subject_id', null)
        .gte('entry_date', startDate);

      // 2. Fetch Selected Relatives Mood Pulses (if any are selected)
      let relativeMoodPromise = null;
      if (compareSubjectIds.length > 0) {
        relativeMoodPromise = supabase
          .from('mood_pulses')
          .select('level, entry_date, subject_id')
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

      // Process daily entries. We bucket multiple entries in the same day and average them.
      const dailyMap: Record<
        string,
        {
          selfSum: number;
          selfCount: number;
          relatives: Record<string, { sum: number; count: number }>;
        }
      > = {};

      const now = new Date();
      // Initialize the daily map for the entire date range to ensure all days are represented
      for (let i = days; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        dailyMap[d] = {
          selfSum: 0,
          selfCount: 0,
          relatives: {},
        };
        compareSubjectIds.forEach((id) => {
          dailyMap[d].relatives[id] = { sum: 0, count: 0 };
        });
      }

      selfMoodRows.forEach((row) => {
        const d = row.entry_date;
        if (dailyMap[d]) {
          dailyMap[d].selfSum += row.level;
          dailyMap[d].selfCount += 1;
        }
      });

      relativeMoodRows.forEach((row) => {
        const d = row.entry_date;
        const id = row.subject_id;
        if (id && dailyMap[d] && dailyMap[d].relatives[id]) {
          dailyMap[d].relatives[id].sum += row.level;
          dailyMap[d].relatives[id].count += 1;
        }
      });

      // Construct dynamic points
      const points: MoodComparisonPoint[] = Object.entries(dailyMap)
        .map(([date, stats]) => {
          const pt: MoodComparisonPoint = {
            date,
            ts: parseISO(date).getTime(),
            self: stats.selfCount > 0 ? stats.selfSum / stats.selfCount : null,
          };
          compareSubjectIds.forEach((id) => {
            const relStats = stats.relatives[id];
            pt[id] = relStats && relStats.count > 0 ? relStats.sum / relStats.count : null;
          });
          return pt;
        })
        .sort((a, b) => a.ts - b.ts);

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
