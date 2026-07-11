import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { linearRegression, pearson } from '@/lib/correlation';
import type { QuestionnaireTrend } from './useQuestionnaireTrends';

export interface SelfAnalyticsPoint {
  date: string;
  selfMood: number | null;
  selfObservationIntensity: number | null;
  selfObservationCount: number;
  moodPulseCount: number;
}

export interface SelfOverlapStats {
  overallR: number | null;
  overlapDays: number;
  totalDays: number;
  regression: { slope: number; intercept: number } | null;
}

export interface SelfConceptCorrelation {
  conceptId: string;
  nameHu: string;
  nameEn: string;
  n: number;
  r: number;
  series: Array<{ date: string; selfMood: number; intensity: number }>;
}

export interface QuestionnaireTrendWithTitle extends QuestionnaireTrend {
  questionnaires: {
    title: string;
    title_localized: Record<string, string> | null;
  } | null;
}

interface UseSelfAnalyticsDataParams {
  userId: string | null | undefined;
  days?: number;
  refreshKey?: number;
}

export const useSelfAnalyticsData = ({
  userId,
  days = 30,
  refreshKey = 0,
}: UseSelfAnalyticsDataParams) => {
  const [dailySeries, setDailySeries] = useState<SelfAnalyticsPoint[]>([]);
  const [obsRows, setObsRows] = useState<Array<{ concept_id: string; intensity: number; logged_at: string }>>([]);
  const [concepts, setConcepts] = useState<Record<string, { name_hu: string; name_en: string }>>({});
  const [questionnaireTrends, setQuestionnaireTrends] = useState<QuestionnaireTrendWithTitle[]>([]);
  const [questionnaireFillsCount, setQuestionnaireFillsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setDailySeries([]);
        setObsRows([]);
        setConcepts({});
        setQuestionnaireTrends([]);
        setQuestionnaireFillsCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // 1. Fetch Self Mood Pulses
      const moodPromise = supabase
        .from('mood_pulses')
        .select('level, entry_date, created_at')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .is('subject_id', null)
        .gte('entry_date', startDate);

      // 2. Fetch Self Observations
      const obsPromise = supabase
        .from('observation_logs')
        .select('concept_id, intensity, logged_at')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .is('subject_id', null)
        .gte('logged_at', startDate);

      // 3. Fetch Self Questionnaire Responses for Trends
      const responsesPromise = supabase
        .from('questionnaire_responses')
        .select('id, questionnaire_id, total_score, completed_at, questionnaires(title, title_localized)')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .is('subject_id', null)
        .not('total_score', 'is', null)
        .order('completed_at', { ascending: true });

      const [moodRes, obsRes, responsesRes] = await Promise.all([
        moodPromise,
        obsPromise,
        responsesPromise,
      ]);

      if (cancelled) return;

      const moodRows = moodRes.data ?? [];
      const selfObsRows = (obsRes.data ?? []) as Array<{
        concept_id: string;
        intensity: number;
        logged_at: string;
      }>;
      
      const responsesRows = responsesRes.data ?? [];
      const questionnaireFillsCountVal = responsesRows.filter((r) => r.completed_at >= startDate).length;
      
      const scoredResponses = responsesRows.filter((r) => r.total_score !== null);
      const trendsMap = new Map<string, any[]>();
      
      scoredResponses.forEach((row) => {
        if (!trendsMap.has(row.questionnaire_id)) {
          trendsMap.set(row.questionnaire_id, []);
        }
        trendsMap.get(row.questionnaire_id)!.push(row);
      });

      const trendsRows: QuestionnaireTrendWithTitle[] = [];

      for (const [qId, rs] of trendsMap.entries()) {
        const inWindow = rs.filter((r) => r.completed_at >= startDate);
        if (inWindow.length === 0) continue;

        const latest = rs[rs.length - 1];
        const prev = rs.length > 1 ? rs[rs.length - 2] : null;

        trendsRows.push({
          id: latest.id,
          user_id: userId as string,
          questionnaire_id: qId,
          subject_type: 'self',
          subject_id: null,
          latest_response_id: latest.id,
          latest_score: latest.total_score,
          previous_score: prev ? prev.total_score : null,
          trend_delta: prev ? latest.total_score - prev.total_score : 0,
          last_updated_at: latest.completed_at,
          questionnaires: latest.questionnaires as any,
          completion_count: rs.length,
          ordered_entries: rs.map((r) => ({ date: r.completed_at, score: r.total_score })),
          in_window_scores: inWindow.map((r) => r.total_score),
        } as any);
      }

      trendsRows.sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());

      // Fetch concept metadata
      const conceptIds = Array.from(new Set(selfObsRows.map((r) => r.concept_id)));
      const conceptMap: Record<string, { name_hu: string; name_en: string }> = {};
      if (conceptIds.length > 0) {
        const { data: cRows } = await supabase
          .from('observation_concepts')
          .select('id, name_hu, name_en')
          .in('id', conceptIds);
        (cRows ?? []).forEach((c: any) => {
          conceptMap[c.id] = { name_hu: c.name_hu, name_en: c.name_en };
        });
      }

      if (cancelled) return;

      // Map to track the newest pulse per date
      const selfLatestMap: Record<string, { level: number; created_at: string }> = {};
      moodRows.forEach((row) => {
        const d = row.entry_date;
        const rowCreatedAt = row.created_at || '';
        const current = selfLatestMap[d];
        if (!current || rowCreatedAt > current.created_at) {
          selfLatestMap[d] = { level: row.level, created_at: rowCreatedAt };
        }
      });

      // Process observations into a daily map
      const dailyMap: Record<string, { obsSum: number; obsCount: number }> = {};

      selfObsRows.forEach((row) => {
        if (!dailyMap[row.logged_at]) {
          dailyMap[row.logged_at] = { obsSum: 0, obsCount: 0 };
        }
        dailyMap[row.logged_at].obsSum += row.intensity;
        dailyMap[row.logged_at].obsCount += 1;
      });

      // Generate the time series
      const points: SelfAnalyticsPoint[] = [];
      const now = new Date();
      for (let i = days; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        const stats = dailyMap[d];
        const selfLatest = selfLatestMap[d];
        points.push({
          date: d,
          selfMood: selfLatest ? selfLatest.level : null,
          selfObservationIntensity: stats?.obsCount ? stats.obsSum / stats.obsCount : null,
          selfObservationCount: stats?.obsCount || 0,
          moodPulseCount: selfLatest ? 1 : 0,
        });
      }

      setDailySeries(points);
      setObsRows(selfObsRows);
      setConcepts(conceptMap);
      setQuestionnaireTrends(trendsRows);
      setQuestionnaireFillsCount(questionnaireFillsCountVal);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, days, refreshKey]);

  const { overlapStats, conceptCorrelations } = useMemo(() => {
    const totalDays = dailySeries.length;
    const scatter = dailySeries
      .filter((d) => d.selfMood != null && d.selfObservationIntensity != null)
      .map((d) => ({
        date: d.date,
        selfMood: d.selfMood as number,
        selfObservationIntensity: d.selfObservationIntensity as number,
        selfObservationCount: d.selfObservationCount,
      }));
    const overlapDays = scatter.length;

    const xs = scatter.map((s) => s.selfMood);
    const ys = scatter.map((s) => s.selfObservationIntensity);
    const overallR = pearson(xs, ys);
    const regression = linearRegression(xs, ys);

    const overlapStats: SelfOverlapStats = {
      overallR,
      overlapDays,
      totalDays,
      regression,
    };

    // Per-concept correlation against self mood
    const dailySelfMood: Record<string, number> = {};
    dailySeries.forEach((d) => {
      if (d.selfMood != null) dailySelfMood[d.date] = d.selfMood;
    });

    const byConcept: Record<string, { sum: number; count: number; date: string }[]> = {};
    obsRows.forEach((row) => {
      if (!byConcept[row.concept_id]) byConcept[row.concept_id] = [];
      const arr = byConcept[row.concept_id];
      const existing = arr.find((x) => x.date === row.logged_at);
      if (existing) {
        existing.sum += row.intensity;
        existing.count += 1;
      } else {
        arr.push({ sum: row.intensity, count: 1, date: row.logged_at });
      }
    });

    const correlations: SelfConceptCorrelation[] = [];
    Object.entries(byConcept).forEach(([conceptId, dayAggs]) => {
      const series: Array<{ date: string; selfMood: number; intensity: number }> = [];
      dayAggs.forEach((agg) => {
        const selfMood = dailySelfMood[agg.date];
        if (selfMood == null) return;
        series.push({ date: agg.date, selfMood, intensity: agg.sum / agg.count });
      });
      if (series.length < 4) return;
      const r = pearson(series.map((s) => s.selfMood), series.map((s) => s.intensity));
      if (r == null) return;
      const meta = concepts[conceptId];
      correlations.push({
        conceptId,
        nameHu: meta?.name_hu ?? conceptId,
        nameEn: meta?.name_en ?? conceptId,
        n: series.length,
        r,
        series,
      });
    });
    correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    return {
      overlapStats,
      conceptCorrelations: correlations.slice(0, 5),
    };
  }, [dailySeries, obsRows, concepts]);

  return {
    dailySeries,
    overlapStats,
    conceptCorrelations,
    questionnaireTrends,
    questionnaireFillsCount,
    loading,
  };
};
