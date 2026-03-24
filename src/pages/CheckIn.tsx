import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isFuture, startOfDay } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useMoodTrendData } from '@/hooks/useMoodTrendData';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import QuickPulse from '@/components/checkin/QuickPulse';
import ConsentGate from '@/components/consent/ConsentGate';
import FeedCalendar from '@/components/checkin/FeedCalendar';
import ObservationStepper from '@/components/observations/ObservationStepper';
import EntryReflectDialog from '@/components/checkin/EntryReflectDialog';
import ObservationReflectDialog from '@/components/checkin/ObservationReflectDialog';
import EntryModal from '@/components/checkin/EntryModal';
import type { EntryModalPrefill } from '@/components/checkin/EntryModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { FChevronDown, FTrendingUp } from '@/components/icons/FreudIcons';
import RecapBanner from '@/components/checkin/RecapBanner';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';
import PatternChart from '@/components/timeline/PatternChart';
import HorizontalTimeline from '@/components/timeline/HorizontalTimeline';
import PremiumModal from '@/components/premium/PremiumModal';

const CheckIn = () => {
  const { t, lang } = useLanguage();
  const { subjectType, activeSubject } = useStance();
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
  const [reflectEntryId, setReflectEntryId] = useState<string | null>(null);
  const [reflectObsId, setReflectObsId] = useState<string | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(false);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const isSelfContext = subjectType === 'self';

  const { data: moodData, loading: moodLoading } = useMoodTrendData({
    userId: user?.id,
    subjectType: activeSubject.type,
    subjectId: activeSubject.id,
  });

  const {
    timelineItems,
    calendarItems,
    obsLogs,
    conceptMap,
    nudges,
    daysSinceLastEntry,
    loading: calendarLoading,
  } = useCalendarFeedData({
    userId: user?.id,
    subjectType: activeSubject.type,
    subjectId: activeSubject.id,
    lang,
    t,
    refreshKey,
  });

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

  useEffect(() => {
    setCalendarSelectedDate(null);
    setReflectEntryId(null);
    setReflectObsId(null);
    setObservationOpen(false);
    setHighlightDate(null);
  }, [activeSubject.key]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('premium')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsPremium(data.premium);
      });
  }, [user]);

  const handleEntryClick = useCallback((type: string, dbId: string) => {
    if (type === 'journal') setReflectEntryId(dbId);
    if (type === 'observation') setReflectObsId(dbId);
  }, []);

  const openEntryModal = (date?: Date, prefill?: EntryModalPrefill) => {
    const targetDate = date ?? new Date();
    if (isFuture(startOfDay(targetDate))) return;

    setEntryModalDate(format(targetDate, 'yyyy-MM-dd'));
    setEntryModalPrefill(prefill ?? null);
    setEntryModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.checkIn.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.checkIn.subtitle}</p>
        </div>

        {isSelfContext && (
          <ConsentGate consentKey="mood_tracking">
            <div className="context-panel p-6">
              <QuickPulse key={`pulse-${activeSubject.key}`} onPulseSaved={refresh} />
            </div>
          </ConsentGate>
        )}

        {isSelfContext && daysSinceLastEntry !== null && daysSinceLastEntry >= 14 && !recapDismissed && (
          <RecapBanner
            days={daysSinceLastEntry}
            onCatchUp={() => openEntryModal()}
            onDismiss={() => setRecapDismissed(true)}
          />
        )}

        {nudges.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-3xl p-4 flex items-start gap-3">
            <FTrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              {nudges.map((nudge) => (
                <p key={nudge.name} className="text-sm text-foreground">
                  {t.timeline.patternNudge.replace('{name}', nudge.name).replace('{count}', String(nudge.count))}
                </p>
              ))}
            </div>
          </div>
        )}

        <Collapsible open={observationOpen} onOpenChange={setObservationOpen}>
          <CollapsibleTrigger className="context-panel w-full p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.checkIn.whatHappenedTitle}
            </h2>
            <FChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${observationOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="context-panel border-t-0 rounded-b-3xl p-6 -mt-3">
            <ObservationStepper key={`observation-${activeSubject.key}`} onLogged={refresh} />
          </CollapsibleContent>
        </Collapsible>

        <ConsentGate consentKey="mood_tracking">
          {moodLoading ? (
            <div className="context-panel p-5 space-y-3">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-4 w-52 rounded-full" />
              <Skeleton className="h-56 w-full rounded-3xl" />
            </div>
          ) : (
            <MoodTrendChart
              key={`trend-${activeSubject.key}`}
              data={moodData}
              lang={lang}
              isPremium={isPremium}
              onPremiumClick={() => setPremiumOpen(true)}
              t={t}
            />
          )}
        </ConsentGate>

        <ConsentGate consentKey="pattern_detection">
          <PatternChart logs={obsLogs} conceptMap={conceptMap} />
        </ConsentGate>

        <div key={`timeline-${activeSubject.key}`} ref={feedRef} className="context-panel p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{t.timeline.allActivity}</h2>
          {calendarLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-24 w-full rounded-3xl" />
            </div>
          ) : timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.timeline.noActivity}</p>
          ) : (
            <HorizontalTimeline items={timelineItems} lang={lang} t={t} />
          )}
        </div>

        <div className="context-panel p-6">
          {calendarLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
              <Skeleton className="h-52 w-full rounded-3xl" />
            </div>
          ) : (
            <FeedCalendar
              key={`calendar-${activeSubject.key}`}
              items={calendarItems}
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              selectedDate={calendarSelectedDate}
              onSelectDate={setCalendarSelectedDate}
              onEntryClick={handleEntryClick}
              onCreateEntry={isSelfContext ? (date) => openEntryModal(date) : undefined}
            />
          )}
        </div>
      </div>

      {isSelfContext && (
        <EntryReflectDialog
          entryId={reflectEntryId}
          onClose={() => setReflectEntryId(null)}
          onSaved={refresh}
        />
      )}

      <ObservationReflectDialog
        observationId={reflectObsId}
        onClose={() => setReflectObsId(null)}
        onSaved={refresh}
      />

      {isSelfContext && (
        <EntryModal
          open={entryModalOpen}
          onOpenChange={setEntryModalOpen}
          entryDate={entryModalDate}
          prefill={entryModalPrefill}
          onSaved={refresh}
        />
      )}

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </DashboardLayout>
  );
};

export default CheckIn;
