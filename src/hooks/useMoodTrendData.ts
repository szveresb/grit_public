import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MoodTrendPoint {
  date: string;
  level: number;
}

interface UseMoodTrendDataParams {
  userId: string | null | undefined;
  subjectType: 'self' | 'relative';
  subjectId: string | null;
}

export const useMoodTrendData = ({ userId, subjectType, subjectId }: UseMoodTrendDataParams) => {
  const [data, setData] = useState<MoodTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setData([]);

      let query: any = supabase
        .from('mood_pulses')
        .select('level, entry_date')
        .eq('user_id', userId)
        .eq('subject_type', subjectType);

      if (subjectType === 'relative') {
        query = query.eq('subject_id', subjectId);
      } else {
        query = query.is('subject_id', null);
      }

      const { data: rows } = await query.order('entry_date', { ascending: true });
      if (cancelled) return;

      setData(((rows ?? []) as Array<{ entry_date: string; level: number }>).map((row) => ({
        date: row.entry_date,
        level: row.level,
      })));
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [subjectId, subjectType, userId]);

  return { data, loading };
};
