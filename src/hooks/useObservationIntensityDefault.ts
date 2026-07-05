import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type IntensitySource = 'pulse-seeded' | 'fallback' | 'manual';

export interface UseObservationIntensityDefaultParams {
  date: string; // yyyy-MM-dd
  subjectType: 'self' | 'relative';
  subjectId: string | null;
}

export interface ObservationIntensityDefaultResult {
  defaultIntensity: number;
  source: 'pulse-seeded' | 'fallback';
  loading: boolean;
  error: Error | null;
}

export const useObservationIntensityDefault = ({
  date,
  subjectType,
  subjectId,
}: UseObservationIntensityDefaultParams): ObservationIntensityDefaultResult => {
  const { user } = useAuth();
  const [defaultIntensity, setDefaultIntensity] = useState<number>(3);
  const [source, setSource] = useState<'pulse-seeded' | 'fallback'>('fallback');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const query = supabase
      .from('mood_pulses')
      .select('level')
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .eq('subject_type', subjectType);

    const finalQuery =
      subjectType === 'relative' && subjectId
        ? query.eq('subject_id', subjectId)
        : query.is('subject_id', null);

    finalQuery
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: dbError }) => {
        if (!isMounted) return;

        if (dbError) {
          console.error('Error fetching mood pulse for default intensity:', dbError);
          setError(new Error(dbError.message));
          setDefaultIntensity(3);
          setSource('fallback');
        } else if (data && typeof data.level === 'number') {
          // Inverse mapping: 1 -> 5, 2 -> 4, 3 -> 3, 4 -> 2, 5 -> 1
          const pulseLevel = data.level;
          const inverted = 6 - pulseLevel;
          // Clamp intensity between 1 and 5
          const clamped = Math.max(1, Math.min(5, inverted));
          setDefaultIntensity(clamped);
          setSource('pulse-seeded');
        } else {
          setDefaultIntensity(3);
          setSource('fallback');
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, date, subjectType, subjectId]);

  return { defaultIntensity, source, loading, error };
};
