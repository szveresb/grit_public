import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { differenceInDays, parseISO, format, startOfWeek, endOfWeek, isFuture, startOfDay } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import QuickPulse from '@/components/checkin/QuickPulse';
import ConsentGate from '@/components/consent/ConsentGate';
import FeedCalendar from '@/components/checkin/FeedCalendar';
import type { CalendarFeedItem } from '@/components/checkin/FeedCalendar';
import ObservationStepper from '@/components/observations/ObservationStepper';
import EntryReflectDialog from '@/components/checkin/EntryReflectDialog';
import ObservationReflectDialog from '@/components/checkin/ObservationReflectDialog';
import EntryModal from '@/components/checkin/EntryModal';
import type { EntryModalPrefill } from '@/components/checkin/EntryModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FChevronDown, FTrendingUp } from '@/components/icons/FreudIcons';
import RecapBanner from '@/components/checkin/RecapBanner';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';
import PatternChart from '@/components/timeline/PatternChart';
import HorizontalTimeline from '@/components/timeline/HorizontalTimeline';

interface MoodPoint { date: string; level: number; }
interface TimelineItem { id: string; type: 'journal' | 'questionnaire' | 'observation'; title: string; date: string; detail?: string; }
interface PatternNudge { name: string; count: number; }
interface ObsLog { concept_id: string; logged_at: string; intensity: number; user_narrative?: string | null; }
interface ConceptEntry { id: string; name_hu: string; name_en: string; }

const CheckIn = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const feedRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryModalDate, setEntryModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryModalPrefill, setEntryModalPrefill] = useState<EntryModalPrefill | null>(null);
  const [observationOpen, setObservationOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarFeedItem[]>([]);
  const [reflectEntryId, setReflectEntryId] = useState<string | null>(null);
  const [reflectObsId, setReflectObsId] = useState<string | null>(null);
  const [daysSinceLastEntry, setDaysSinceLastEntry] = useState<number | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(false);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);

  // Timeline data
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [moodData, setMoodData] = useState<MoodPoint[]>([]);
  const [obsLogs, setObsLogs] = useState<ObsLog[]>([]);
  const [conceptMap, setConceptMap] = useState<Record<string, ConceptEntry>>({});
  const [nudges, setNudges] = useState<PatternNudge[]>([]);

  // Read ?date param on mount and scroll to feed
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setHighlightDate(dateParam);
      searchParams.delete('date');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => {
        feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Fetch all timeline data
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [journalRes, responseRes, obsRes, pulseRes] = await Promise.all([
        supabase.from('journal_entries').select('id, title, entry_date, impact_level').eq('user_id', user.id),
        supabase.from('questionnaire_responses').select('id, questionnaire_id, completed_at, questionnaires(title)').eq('user_id', user.id),
        supabase.from('observation_logs').select('id, intensity, frequency, logged_at, concept_id, user_narrative, journal_entry_id').eq('user_id', user.id),
        (supabase.from as any)('mood_pulses').select('level, entry_date').eq('user_id', user.id),
      ]);

      const journalData = journalRes.data ?? [];
      const journalItems: TimelineItem[] = journalData.map(j => ({ id: j.id, type: 'journal', title: j.title, date: j.entry_date, detail: j.impact_level ? `${t.journal.cardImpact}: ${j.impact_level}/5` : undefined }));
      // Mood trend chart fed exclusively from mood_pulses
      setMoodData((pulseRes.data ?? []).map(p => ({ date: p.entry_date, level: p.level })));

      // Check inactivity
      if (journalData.length > 0) {
        const sorted = [...journalData].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
        setDaysSinceLastEntry(differenceInDays(new Date(), parseISO(sorted[0].entry_date)));
      } else {
        setDaysSinceLastEntry(null);
      }

      const qItems: TimelineItem[] = (responseRes.data ?? []).map((r: any) => ({ id: r.id, type: 'questionnaire', title: r.questionnaires?.title ?? t.nav.questionnaires, date: r.completed_at.split('T')[0] }));

      let obsItems: TimelineItem[] = [];
      const obsData = obsRes.data ?? [];
      // Filter out observations already linked to a journal entry (avoid duplicates)
      const standaloneObs = obsData.filter(o => !o.journal_entry_id);
      if (obsData.length > 0) {
        const conceptIds = [...new Set(obsData.map(o => o.concept_id))];
        const { data: concepts } = await supabase.from('observation_concepts').select('id, name_hu, name_en').in('id', conceptIds);
        const conMap = Object.fromEntries((concepts ?? []).map(c => [c.id, c]));
        setConceptMap(conMap);
        setObsLogs(obsData.map(o => ({ concept_id: o.concept_id, logged_at: o.logged_at, intensity: o.intensity, user_narrative: o.user_narrative })));

        obsItems = standaloneObs.map(o => {
          const concept = conMap[o.concept_id];
          const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : t.observations.tabObservations;
          return { id: o.id, type: 'observation' as const, title: name, date: o.logged_at, detail: `${t.observations.intensity}: ${o.intensity}/5` };
        });

        // Current-week nudges
        const now = new Date();
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekObs = obsData.filter(o => o.logged_at >= weekStart && o.logged_at <= weekEnd);
        const countByConceptId: Record<string, number> = {};
        weekObs.forEach(o => { countByConceptId[o.concept_id] = (countByConceptId[o.concept_id] || 0) + 1; });
        const detectedNudges: PatternNudge[] = [];
        for (const [cid, count] of Object.entries(countByConceptId)) {
          if (count >= 3) {
            const concept = conMap[cid];
            const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '';
            if (name) detectedNudges.push({ name, count });
          }
        }
        setNudges(detectedNudges);
      }

      const allItems = [...journalItems, ...qItems, ...obsItems].sort((a, b) => b.date.localeCompare(a.date));
      setTimelineItems(allItems);

      // Feed calendar items
      setCalendarItems(allItems.map(i => ({ id: i.id, type: i.type, title: i.title, date: i.date })));
    };
    fetchAll();
  }, [user, refreshKey]);

  const handleEntryClick = useCallback((type: string, dbId: string) => {
    if (type === 'journal') setReflectEntryId(dbId);
    if (type === 'observation') setReflectObsId(dbId);
  }, []);

  const openEntryModal = (date?: Date, prefill?: EntryModalPrefill) => {
    const d = date ?? new Date();
    // Never allow future dates
    if (isFuture(startOfDay(d))) return;
    setEntryModalDate(format(d, 'yyyy-MM-dd'));
    setEntryModalPrefill(prefill ?? null);
    setEntryModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.checkIn.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.checkIn.subtitle}</p>
        </div>

        {/* Quick Pulse — gated by mood_tracking */}
        <ConsentGate consentKey="mood_tracking">
          <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
            <QuickPulse onPulseSaved={refresh} />
          </div>
        </ConsentGate>

        {/* Recap banner */}
        {daysSinceLastEntry !== null && daysSinceLastEntry >= 14 && !recapDismissed && (
          <RecapBanner
            days={daysSinceLastEntry}
            onCatchUp={() => openEntryModal()}
            onDismiss={() => setRecapDismissed(true)}
          />
        )}

        {/* Pattern nudges */}
        {nudges.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-3xl p-4 flex items-start gap-3">
            <FTrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              {nudges.map(n => (
                <p key={n.name} className="text-sm text-foreground">
                  {t.timeline.patternNudge.replace('{name}', n.name).replace('{count}', String(n.count))}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Observation Stepper (collapsible) */}
        <Collapsible open={observationOpen} onOpenChange={setObservationOpen}>
          <CollapsibleTrigger className="w-full bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.checkIn.whatHappenedTitle}
            </h2>
            <FChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${observationOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-card/60 backdrop-blur border border-border border-t-0 rounded-b-3xl p-6 -mt-3">
            <ObservationStepper onLogged={refresh} />
          </CollapsibleContent>
        </Collapsible>

        {/* Mood trend chart — gated by mood_tracking */}
        <ConsentGate consentKey="mood_tracking">
          <MoodTrendChart data={moodData} lang={lang} t={t} />
        </ConsentGate>

        {/* 8-week pattern frequency chart — gated by pattern_detection */}
        <ConsentGate consentKey="pattern_detection">
          <PatternChart logs={obsLogs} conceptMap={conceptMap} />
        </ConsentGate>

        {/* Horizontal timeline dot viewer */}
        <div ref={feedRef} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{t.timeline.allActivity}</h2>
          {timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.timeline.noActivity}</p>
          ) : (
            <HorizontalTimeline items={timelineItems} lang={lang} t={t} />
          )}
        </div>

        {/* Calendar */}
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
          <FeedCalendar
            items={calendarItems}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
            onEntryClick={handleEntryClick}
            onCreateEntry={(date) => openEntryModal(date)}
          />
        </div>
      </div>

      <EntryReflectDialog
        entryId={reflectEntryId}
        onClose={() => setReflectEntryId(null)}
        onSaved={refresh}
      />

      <ObservationReflectDialog
        observationId={reflectObsId}
        onClose={() => setReflectObsId(null)}
        onSaved={refresh}
      />

      <EntryModal
        open={entryModalOpen}
        onOpenChange={setEntryModalOpen}
        entryDate={entryModalDate}
        prefill={entryModalPrefill}
        onSaved={refresh}
      />
    </DashboardLayout>
  );
};

export default CheckIn;
