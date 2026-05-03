import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfDay, subDays } from 'date-fns';

export interface CorrelationPoint {
  date: string;
  selfMood: number | null;
  relativeIntensity: number | null;
  observationCount: number;
}

interface UseDualPerspectiveDataParams {
  userId: string | null | undefined;
  relativeId: string | null;
  days?: number;
  refreshKey?: number;
}

export const useDualPerspectiveData = ({
  userId,
  relativeId,
  days = 30,
  refreshKey = 0,
}: UseDualPerspectiveDataParams) => {
  const [data, setData] = useState<CorrelationPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId || !relativeId) {
        setData([]);
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
        .gte('entry_date', startDate);

      // 2. Fetch Relative Observations
      const relativeObsPromise = supabase
        .from('observation_logs')
        .select('intensity, logged_at')
        .eq('user_id', userId)
        .eq('subject_type', 'relative')
        .eq('subject_id', relativeId)
        .gte('logged_at', startDate);

      const [selfMoodRes, relativeObsRes] = await Promise.all([
        selfMoodPromise,
        relativeObsPromise,
      ]);

      if (cancelled) return;

      const selfMoodRows = selfMoodRes.data ?? [];
      const relativeObsRows = relativeObsRes.data ?? [];

      // Process into a daily map
      const dailyMap: Record<string, { moodSum: number; moodCount: number; obsSum: number; obsCount: number }> = {};

      selfMoodRows.forEach((row) => {
        if (!dailyMap[row.entry_date]) {
          dailyMap[row.entry_date] = { moodSum: 0, moodCount: 0, obsSum: 0, obsCount: 0 };
        }
        dailyMap[row.entry_date].moodSum += row.level;
        dailyMap[row.entry_date].moodCount += 1;
      });

      relativeObsRows.forEach((row) => {
        if (!dailyMap[row.logged_at]) {
          dailyMap[row.logged_at] = { moodSum: 0, moodCount: 0, obsSum: 0, obsCount: 0 };
        }
        dailyMap[row.logged_at].obsSum += row.intensity;
        dailyMap[row.logged_at].obsCount += 1;
      });

      // Generate the time series
      const points: CorrelationPoint[] = [];
      const now = new Date();
      for (let i = days; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        const stats = dailyMap[d];
        points.push({
          date: d,
          selfMood: stats?.moodCount ? stats.moodSum / stats.moodCount : null,
          relativeIntensity: stats?.obsCount ? stats.obsSum / stats.obsCount : null,
          observationCount: stats?.obsCount || 0,
        });
      }

      setData(points);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, relativeId, days, refreshKey]);

  return { data, loading };
};
