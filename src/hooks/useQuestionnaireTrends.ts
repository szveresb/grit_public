import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type QuestionnaireTrend = Database['public']['Tables']['questionnaire_score_trends']['Row'];

interface UseQuestionnaireTrendsParams {
  userId: string | null | undefined;
  subjectType: 'self' | 'relative';
  subjectId: string | null;
  questionnaireId?: string;
  refreshKey?: number;
}

/**
 * useQuestionnaireTrends
 * Fetches pre-calculated score trends (latest score, previous score, delta) 
 * for questionnaires in O(1) from the questionnaire_score_trends table.
 */
export const useQuestionnaireTrends = ({
  userId,
  subjectType,
  subjectId,
  questionnaireId,
  refreshKey,
}: UseQuestionnaireTrendsParams) => {
  const [trends, setTrends] = useState<QuestionnaireTrend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setTrends([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      let query = supabase
        .from('questionnaire_score_trends')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_type', subjectType);

      if (subjectType === 'relative') {
        query = query.eq('subject_id', subjectId);
      } else {
        query = query.is('subject_id', null);
      }

      if (questionnaireId) {
        query = query.eq('questionnaire_id', questionnaireId);
      }

      const { data, error } = await query;
      
      if (cancelled) return;
      if (error) {
        console.error('Error fetching questionnaire trends:', error);
        setTrends([]);
      } else {
        setTrends(data || []);
      }
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, subjectType, subjectId, questionnaireId, refreshKey]);

  return { trends, loading, refresh: () => {} };
};
