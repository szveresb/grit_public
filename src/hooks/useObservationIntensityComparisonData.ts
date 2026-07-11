import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';
import { fetchConceptResolver } from '@/lib/observationResolver';

export interface ObservationIntensityPoint {
  date: string;
  ts: number;
  [conceptId: string]: number | null | string;
}

export interface ConceptMetadata {
  id: string;
  name_hu: string;
  name_en: string;
  originalIds?: string[];
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
  subjectType: 'self' | 'relative';
  subjectId: string | null;
  days?: number;
  refreshKey?: number;
}

export const useObservationIntensityComparisonData = ({
  userId,
  subjectType,
  subjectId,
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

      // Build query dynamically based on subjectType and subjectId
      let query = supabase
        .from('observation_logs')
        .select('concept_id, intensity, logged_at')
        .eq('user_id', userId)
        .eq('subject_type', subjectType)
        .gte('logged_at', startDate);

      if (subjectType === 'relative') {
        if (!subjectId) {
          setData([]);
          setConcepts([]);
          setDefaultSelectedConceptIds([]);
          setConceptHasData({});
          setLoading(false);
          return;
        }
        query = query.eq('subject_id', subjectId);
      } else {
        query = query.is('subject_id', null);
      }

      const { data: obsLogsRes, error } = await query;

      if (cancelled) return;

      if (error || !obsLogsRes || obsLogsRes.length === 0) {
        setData([]);
        setConcepts([]);
        setDefaultSelectedConceptIds([]);
        setConceptHasData({});
        setLoading(false);
        return;
      }

      // Load concept resolver
      const resolver = await fetchConceptResolver(supabase);
      if (cancelled) return;

      const resolvedLogs = obsLogsRes.map((log) => {
        const resolved = resolver.resolve(log.concept_id);
        return {
          ...log,
          resolvedId: resolved ? resolved.resolvedId : log.concept_id,
          resolvedNameHu: resolved ? resolved.resolvedNameHu : log.concept_id,
          resolvedNameEn: resolved ? resolved.resolvedNameEn : log.concept_id,
        };
      });

      const uniqueResolvedConcepts = new Map<string, ConceptMetadata>();
      resolvedLogs.forEach((log) => {
        if (!uniqueResolvedConcepts.has(log.resolvedId)) {
          uniqueResolvedConcepts.set(log.resolvedId, {
            id: log.resolvedId,
            name_hu: log.resolvedNameHu,
            name_en: log.resolvedNameEn,
            originalIds: [],
          });
        }
        const item = uniqueResolvedConcepts.get(log.resolvedId)!;
        if (item.originalIds && !item.originalIds.includes(log.concept_id)) {
          item.originalIds.push(log.concept_id);
        }
      });
      const conceptList = Array.from(uniqueResolvedConcepts.values());

      // Aggregate repeated logs for the same concept on the same day by taking the highest intensity
      const dailyConceptIntensity: Record<string, number> = {};
      resolvedLogs.forEach((log) => {
        const key = `${log.logged_at}_${log.resolvedId}`;
        if (dailyConceptIntensity[key] === undefined) {
          dailyConceptIntensity[key] = log.intensity;
        } else {
          dailyConceptIntensity[key] = Math.max(dailyConceptIntensity[key], log.intensity);
        }
      });

      // Find the most recent activity date for each concept to determine defaults
      const conceptRecentDates: Record<string, string> = {};
      resolvedLogs.forEach((log) => {
        const currentMax = conceptRecentDates[log.resolvedId];
        if (!currentMax || log.logged_at > currentMax) {
          conceptRecentDates[log.resolvedId] = log.logged_at;
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

      // Check if each concept has data
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
  }, [userId, subjectType, subjectId, days, refreshKey]);

  return { data, loading, concepts, defaultSelectedConceptIds, conceptHasData };
};
