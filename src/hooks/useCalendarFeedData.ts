import { useEffect, useState } from 'react';
import { differenceInDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarFeedItem } from '@/components/checkin/FeedCalendar';
import type { Dictionary } from '@/i18n/types';
import { fetchConceptResolver } from '@/lib/observationResolver';

interface TimelineItem {
  id: string;
  type: 'journal' | 'questionnaire' | 'observation';
  title: string;
  date: string;
  detail?: string;
  impactLevel?: number;
}

interface ObsLog {
  concept_id: string;
  logged_at: string;
  intensity: number;
  user_narrative?: string | null;
}

interface ConceptEntry {
  id: string;
  name_hu: string;
  name_en: string;
}

interface PatternNudge {
  id: string;
  name: string;
  count: number;
}

interface UseCalendarFeedDataParams {
  userId: string | null | undefined;
  subjectType: 'self' | 'relative';
  subjectId: string | null;
  lang: 'hu' | 'en';
  t: Dictionary;
  refreshKey?: number;
}

export const useCalendarFeedData = ({
  userId,
  subjectType,
  subjectId,
  lang,
  t,
  refreshKey = 0,
}: UseCalendarFeedDataParams) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarFeedItem[]>([]);
  const [obsLogs, setObsLogs] = useState<ObsLog[]>([]);
  const [conceptMap, setConceptMap] = useState<Record<string, ConceptEntry>>({});
  const [nudges, setNudges] = useState<PatternNudge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setTimelineItems([]);
        setCalendarItems([]);
        setObsLogs([]);
        setConceptMap({});
        setNudges([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setTimelineItems([]);
      setCalendarItems([]);
      setObsLogs([]);
      setConceptMap({});
      setNudges([]);


      const isObserver = subjectType === 'relative' && !!subjectId;

      const journalPromise = isObserver
        ? Promise.resolve({ data: [] })
        : supabase
            .from('journal_entries')
            .select('id, title, entry_date, impact_level')
            .eq('user_id', userId);

      const responseQuery = isObserver
        ? Promise.resolve({ data: [] })
        : supabase
            .from('questionnaire_responses')
            .select('id, questionnaire_id, completed_at, questionnaires(title)')
            .eq('user_id', userId);

      let obsQuery: any = supabase
        .from('observation_logs')
        .select('id, intensity, frequency, logged_at, concept_id, user_narrative, journal_entry_id, subject_type, subject_id')
        .eq('user_id', userId)
        .eq('subject_type', subjectType);

      if (isObserver) {
        obsQuery = obsQuery.eq('subject_id', subjectId);
      } else {
        obsQuery = obsQuery.is('subject_id', null);
      }

      const [journalRes, responseRes, obsRes] = await Promise.all([
        journalPromise,
        responseQuery,
        obsQuery,
      ]);

      if (cancelled) return;

      const journalData = (journalRes.data ?? []) as any[];
      const journalItems: TimelineItem[] = journalData.map((entry) => ({
        id: entry.id,
        type: 'journal',
        title: entry.title,
        date: entry.entry_date,
        detail: entry.impact_level ? `${t.journal.cardImpact}: ${entry.impact_level}/5` : undefined,
        impactLevel: entry.impact_level,
      }));


      const questionnaireItems: TimelineItem[] = ((responseRes.data ?? []) as any[]).map((response: any) => ({
        id: response.id,
        type: 'questionnaire',
        title: response.questionnaires?.title ?? t.nav.questionnaires,
        date: response.completed_at.split('T')[0],
      }));

      let observationItems: TimelineItem[] = [];
      const observationData = (obsRes.data ?? []) as any[];
      const standaloneObs = observationData.filter((entry) => !entry.journal_entry_id);

      if (observationData.length > 0) {
        const resolver = await fetchConceptResolver(supabase);
        if (cancelled) return;

        const nextConceptMap: Record<string, any> = {};
        observationData.forEach((entry) => {
          const resolved = resolver.resolve(entry.concept_id);
          if (resolved) {
            nextConceptMap[entry.concept_id] = {
              id: resolved.id,
              name_en: resolved.name_en,
              name_hu: resolved.name_hu,
            };
          }
        });
        setConceptMap(nextConceptMap);
        setObsLogs(observationData.map((entry) => ({
          concept_id: entry.concept_id,
          logged_at: entry.logged_at,
          intensity: entry.intensity,
          user_narrative: entry.user_narrative,
        })));

        observationItems = standaloneObs.map((entry) => {
          const resolved = resolver.resolve(entry.concept_id);
          const showCanonical = resolved?.source_type === 'canonical';
          const name = resolved
            ? (lang === 'en'
                ? (showCanonical ? resolved.resolvedNameEn : resolved.name_en)
                : (showCanonical ? resolved.resolvedNameHu : resolved.name_hu))
            : t.observations.tabObservations;

          return {
            id: entry.id,
            type: 'observation',
            title: name,
            date: entry.logged_at,
            detail: `${t.observations.intensity}: ${entry.intensity}/5`,
          };
        });

        // Pattern Discovery Logic (Looking at the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sinceDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
        
        const recentObs = observationData.filter((entry) => entry.logged_at >= sinceDate);
        const countByConceptId: Record<string, number> = {};
        recentObs.forEach((entry) => {
          countByConceptId[entry.concept_id] = (countByConceptId[entry.concept_id] || 0) + 1;
        });

        const detectedNudges: PatternNudge[] = [];
        for (const [conceptId, count] of Object.entries(countByConceptId)) {
          if (count < 3) continue;
          const concept = nextConceptMap[conceptId];
          const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '';
          if (name) detectedNudges.push({ id: conceptId, name, count });
        }

        setNudges(detectedNudges);
      }

      const allItems = [...journalItems, ...questionnaireItems, ...observationItems].sort((a, b) => b.date.localeCompare(a.date));
      setTimelineItems(allItems);
      setCalendarItems(allItems.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        date: item.date,
        detail: item.detail,
        impactLevel: item.impactLevel,
        subjectType: item.type === 'observation' ? subjectType : 'self',
      })));
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [lang, refreshKey, subjectId, subjectType, t, userId]);

  return {
    timelineItems,
    calendarItems,
    obsLogs,
    conceptMap,
    nudges,
    loading,
  };
};
