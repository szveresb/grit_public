import { useEffect, useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export const useGlobalInactivity = (userId: string | null | undefined) => {
  const [daysSinceLastActivity, setDaysSinceLastActivity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchLastActivity = async () => {
      if (!userId) {
        setDaysSinceLastActivity(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [journalRes, moodRes, obsRes, responseRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('entry_date')
          .eq('user_id', userId)
          .order('entry_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('mood_pulses')
          .select('entry_date')
          .eq('user_id', userId)
          .order('entry_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('observation_logs')
          .select('logged_at')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('questionnaire_responses')
          .select('completed_at')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const dates: Date[] = [];

      if (journalRes.data?.entry_date) {
        dates.push(parseISO(journalRes.data.entry_date));
      }
      if (moodRes.data?.entry_date) {
        dates.push(parseISO(moodRes.data.entry_date));
      }
      if (obsRes.data?.logged_at) {
        dates.push(parseISO(obsRes.data.logged_at));
      }
      if (responseRes.data?.completed_at) {
        dates.push(parseISO(responseRes.data.completed_at));
      }

      if (dates.length === 0) {
        setDaysSinceLastActivity(null);
      } else {
        const lastActivity = new Date(Math.max(...dates.map(d => d.getTime())));
        setDaysSinceLastActivity(differenceInDays(new Date(), lastActivity));
      }

      setLoading(false);
    };

    fetchLastActivity();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { daysSinceLastActivity, loading };
};
