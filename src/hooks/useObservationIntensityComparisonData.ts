import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';

export interface ObservationIntensityPoint {
  date: string;
  ts: number;
  [conceptId: string]: number | null | string;
}

export interface ConceptMetadata {
  id: string;
  name_hu: string;
  name_en: string;
}

export interface UseObservationIntensityComparisonDataResult {
  data: ObservationIntensityPoint[];
  loading: boolean;
  concepts: ConceptMetadata[];
  defaultSelectedConceptIds: string[];
  conceptHasData: Record<string, boolean>;
}

interface UseObservationIntensityComparisonDataParams {
  userId: string | null | undefined;
  days?: number;
  refreshKey?: number;
}

export const useObservationIntensityComparisonData = ({
  userId,
  days = 30,
  refreshKey = 0,
}: UseObservationIntensityComparisonDataParams): UseObservationIntensityComparisonDataResult => {
  const [data, setData] = useState<ObservationIntensityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState<ConceptMetadata[]>([]);
  const [defaultSelectedConceptIds, setDefaultSelectedConceptIds] = useState<string[]>([]);
  const [conceptHasData, setConceptHasData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setData([]);
        setConcepts([]);
        setDefaultSelectedConceptIds([]);
        setConceptHasData({});
        setLoading(false);
        return;
      }

      setLoading(true);
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch Self Observations within the active days range
      const { data: obsLogsRes, error } = await supabase
        .from('observation_logs')
        .select('concept_id, intensity, logged_at')
        .eq('user_id', userId)
        .eq('subject_type', 'self')
        .is('subject_id', null)
        .gte('logged_at', startDate);

      if (cancelled) return;

      if (error || !obsLogsRes || obsLogsRes.length === 0) {
        setData([]);
        setConcepts([]);
        setDefaultSelectedConceptIds([]);
        setConceptHasData({});
        setLoading(false);
        return;
      }

      // Extract unique concept IDs
      const uniqueConceptIds = Array.from(new Set(obsLogsRes.map((r) => r.concept_id)));

      // Fetch concept metadata
      const { data: conceptsRes } = await supabase
        .from('observation_concepts')
        .select('id, name_hu, name_en')
        .in('id', uniqueConceptIds);

      if (cancelled) return;

      const conceptList: ConceptMetadata[] = (conceptsRes ?? []).map((c) => ({
        id: c.id,
        name_hu: c.name_hu,
        name_en: c.name_en,
      }));

      // Map to quickly find concept details
      const conceptMap = new Map<string, ConceptMetadata>();
      conceptList.forEach((c) => conceptMap.set(c.id, c));

      // Filter out any logs that don't have matching concepts metadata (safety check)
      const validLogs = obsLogsRes.filter((log) => conceptMap.has(log.concept_id));

      // Aggregate repeated logs for the same concept on the same day by taking the highest intensity
      // key: date_conceptId -> max intensity
      const dailyConceptIntensity: Record<string, number> = {};
      validLogs.forEach((log) => {
        const key = `${log.logged_at}_${log.concept_id}`;
        if (dailyConceptIntensity[key] === undefined) {
          dailyConceptIntensity[key] = log.intensity;
        } else {
          dailyConceptIntensity[key] = Math.max(dailyConceptIntensity[key], log.intensity);
        }
      });

      // Find the most recent activity date for each concept to determine defaults
      const conceptRecentDates: Record<string, string> = {};
      validLogs.forEach((log) => {
        const currentMax = conceptRecentDates[log.concept_id];
        if (!currentMax || log.logged_at > currentMax) {
          conceptRecentDates[log.concept_id] = log.logged_at;
        }
      });

      // Sort unique concept IDs by most recent logged date descending
      const sortedConceptIds = Object.keys(conceptRecentDates).sort((a, b) => {
        const dateA = conceptRecentDates[a];
        const dateB = conceptRecentDates[b];
        return dateB.localeCompare(dateA);
      });

      const defaultIds = sortedConceptIds.slice(0, 3);

      // Build daily per-concept series
      const now = new Date();
      const points: ObservationIntensityPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        const point: ObservationIntensityPoint = {
          date: d,
          ts: parseISO(d).getTime(),
        };
        // Populate intensities for each concept
        conceptList.forEach((c) => {
          const key = `${d}_${c.id}`;
          point[c.id] = dailyConceptIntensity[key] !== undefined ? dailyConceptIntensity[key] : null;
        });
        points.push(point);
      }

      // Check if each concept has data (should be true for all in range, but match contract)
      const hasDataMap: Record<string, boolean> = {};
      conceptList.forEach((c) => {
        hasDataMap[c.id] = points.some((p) => p[c.id] !== null);
      });

      setData(points);
      setConcepts(conceptList);
      setDefaultSelectedConceptIds(defaultIds);
      setConceptHasData(hasDataMap);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, days, refreshKey]);

  return { data, loading, concepts, defaultSelectedConceptIds, conceptHasData };
};
