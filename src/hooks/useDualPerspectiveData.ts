import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { linearRegression, pearson, pearsonAtLag } from '@/lib/correlation';

export interface CorrelationPoint {
  date: string;
  selfMood: number | null;
  relativeIntensity: number | null;
  observationCount: number;
  moodPulseCount: number;
}

export interface ConceptCorrelation {
  conceptId: string;
  nameHu: string;
  nameEn: string;
  n: number;
  r: number;
  series: Array<{ date: string; selfMood: number; intensity: number }>;
}

export interface DualStats {
  overallR: number | null;
  overlapDays: number;
  totalDays: number;
  bestLag: { lag: number; r: number; n: number } | null;
  regression: { slope: number; intercept: number } | null;
  conceptCorrelations: ConceptCorrelation[];
  scatter: Array<{ date: string; selfMood: number; relativeIntensity: number; observationCount: number }>;
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
  const [obsRows, setObsRows] = useState<Array<{ concept_id: string; intensity: number; logged_at: string }>>([]);
  const [concepts, setConcepts] = useState<Record<string, { name_hu: string; name_en: string }>>({});
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
        .select('level, entry_date, created_at')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .gte('entry_date', startDate);

      // 2. Fetch Relative Observations
      const relativeObsPromise = supabase
        .from('observation_logs')
        .select('concept_id, intensity, logged_at')
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
      const relativeObsRows = (relativeObsRes.data ?? []) as Array<{
        concept_id: string;
        intensity: number;
        logged_at: string;
      }>;

      // Concept name lookup
      const conceptIds = Array.from(new Set(relativeObsRows.map((r) => r.concept_id)));
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
      selfMoodRows.forEach((row) => {
        const d = row.entry_date;
        const rowCreatedAt = row.created_at || '';
        const current = selfLatestMap[d];
        if (!current || rowCreatedAt > current.created_at) {
          selfLatestMap[d] = { level: row.level, created_at: rowCreatedAt };
        }
      });

      // Process observations into a daily map
      const dailyMap: Record<string, { obsSum: number; obsCount: number }> = {};

      relativeObsRows.forEach((row) => {
        if (!dailyMap[row.logged_at]) {
          dailyMap[row.logged_at] = { obsSum: 0, obsCount: 0 };
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
        const selfLatest = selfLatestMap[d];
        points.push({
          date: d,
          selfMood: selfLatest ? selfLatest.level : null,
          relativeIntensity: stats?.obsCount ? stats.obsSum / stats.obsCount : null,
          observationCount: stats?.obsCount || 0,
          moodPulseCount: selfLatest ? 1 : 0,
        });
      }

      setData(points);
      setObsRows(relativeObsRows);
      setConcepts(conceptMap);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, relativeId, days, refreshKey]);

  const stats = useMemo<DualStats>(() => {
    const totalDays = data.length;
    const scatter = data
      .filter((d) => d.selfMood != null && d.relativeIntensity != null)
      .map((d) => ({
        date: d.date,
        selfMood: d.selfMood as number,
        relativeIntensity: d.relativeIntensity as number,
        observationCount: d.observationCount,
      }));
    const overlapDays = scatter.length;

    const xs = scatter.map((s) => s.selfMood);
    const ys = scatter.map((s) => s.relativeIntensity);
    const overallR = pearson(xs, ys);
    const regression = linearRegression(xs, ys);

    // Lead/lag: -3..+3
    let bestLag: DualStats['bestLag'] = null;
    const selfSeries = data.map((d) => d.selfMood);
    const relSeries = data.map((d) => d.relativeIntensity);
    for (let lag = -3; lag <= 3; lag++) {
      const { r, n } = pearsonAtLag(selfSeries, relSeries, lag);
      if (r == null || n < 4) continue;
      if (!bestLag || Math.abs(r) > Math.abs(bestLag.r)) {
        bestLag = { lag, r, n };
      }
    }

    // Per-concept correlation
    const dailySelf: Record<string, number> = {};
    data.forEach((d) => {
      if (d.selfMood != null) dailySelf[d.date] = d.selfMood;
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

    const conceptCorrelations: ConceptCorrelation[] = [];
    Object.entries(byConcept).forEach(([conceptId, dayAggs]) => {
      const series: Array<{ date: string; selfMood: number; intensity: number }> = [];
      dayAggs.forEach((agg) => {
        const selfMood = dailySelf[agg.date];
        if (selfMood == null) return;
        series.push({ date: agg.date, selfMood, intensity: agg.sum / agg.count });
      });
      if (series.length < 4) return;
      const r = pearson(series.map((s) => s.selfMood), series.map((s) => s.intensity));
      if (r == null) return;
      const meta = concepts[conceptId];
      conceptCorrelations.push({
        conceptId,
        nameHu: meta?.name_hu ?? conceptId,
        nameEn: meta?.name_en ?? conceptId,
        n: series.length,
        r,
        series,
      });
    });
    conceptCorrelations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    return {
      overallR,
      overlapDays,
      totalDays,
      bestLag,
      regression,
      conceptCorrelations: conceptCorrelations.slice(0, 5),
      scatter,
    };
  }, [data, obsRows, concepts]);

  return { data, stats, loading };
};
