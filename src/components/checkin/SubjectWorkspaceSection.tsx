import { useCallback, useEffect, useRef, useState } from 'react';
import { format, isFuture, startOfDay } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useMoodTrendData } from '@/hooks/useMoodTrendData';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import { useGlobalInactivity } from '@/hooks/useGlobalInactivity';
import { ScopedStanceProvider } from '@/hooks/useStance';
import QuickPulse from '@/components/checkin/QuickPulse';
import ConsentGate from '@/components/consent/ConsentGate';
import FeedCalendar from '@/components/checkin/FeedCalendar';
import ObservationStepper from '@/components/observations/ObservationStepper';
import EntryReflectDialog from '@/components/checkin/EntryReflectDialog';
import ObservationReflectDialog from '@/components/checkin/ObservationReflectDialog';
import EntryModal from '@/components/checkin/EntryModal';
import ObservationModal from '@/components/checkin/ObservationModal';
import type { EntryModalPrefill } from '@/components/checkin/EntryModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FChevronDown, FTrendingUp, FUser, FUsers } from '@/components/icons/FreudIcons';
import RecapBanner from '@/components/checkin/RecapBanner';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';
import PatternChart from '@/components/timeline/PatternChart';
import HorizontalTimeline from '@/components/timeline/HorizontalTimeline';
import { cn } from '@/lib/utils';

interface SubjectWorkspaceSectionProps {
  subject: {
    key: string;
    type: 'self' | 'relative';
    id: string | null;
    name: string;
    subtitle: string;
    relationshipType?: string;
  };
  isPremium: boolean;
  onPremiumClick: () => void;
  highlightedDate?: string | null;
}

const SubjectWorkspaceSection = ({
  subject,
  isPremium,
  onPremiumClick,
  highlightedDate,
}: SubjectWorkspaceSectionProps) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const feedRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryModalDate, setEntryModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entryModalPrefill, setEntryModalPrefill] = useState<EntryModalPrefill | null>(null);
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [observationModalDate, setObservationModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observationOpen, setObservationOpen] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [reflectEntryId, setReflectEntryId] = useState<string | null>(null);
  const [reflectObsId, setReflectObsId] = useState<string | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(true);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const isSelfContext = subject.type === 'self';

  const { data: moodData, loading: moodLoading } = useMoodTrendData({
    userId: user?.id,
    subjectType: subject.type,
    subjectId: subject.id,
  });

  const {
    timelineItems,
    calendarItems,
    obsLogs,
    conceptMap,
    nudges,
    loading: calendarLoading,

  } = useCalendarFeedData({
    userId: user?.id,
    subjectType: subject.type,
    subjectId: subject.id,
    lang,
    t,
    refreshKey,
  });

  const { daysSinceLastActivity: daysSinceGlobalActivity } = useGlobalInactivity(user?.id);

  useEffect(() => {
    if (!highlightedDate || !feedRef.current) return;
    feedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightedDate]);

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

  const openObservationModal = (date?: Date) => {
    const targetDate = date ?? new Date();
    if (isFuture(startOfDay(targetDate))) return;

    setObservationModalDate(format(targetDate, 'yyyy-MM-dd'));
    setObservationModalOpen(true);
  };

  return (
    <ScopedStanceProvider
      subject={
        subject.type === 'self'
          ? { type: 'self' }
          : { type: 'relative', id: subject.id!, name: subject.name, relationshipType: subject.relationshipType }
      }
    >
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
        <section className={cn('space-y-4 w-full', subject.type === 'relative' ? 'theme-observer' : 'theme-self')}>
          <div
            className={cn(
              'flex min-h-[220px] w-full flex-col p-6 sm:p-8 text-center transition-colors surface-card',
              sectionOpen && 'ring-2 ring-primary/30'
            )}
          >
            <div className="flex items-center justify-center gap-3 w-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                {subject.type === 'relative' ? <FUsers className="h-6 w-6" /> : <FUser className="h-6 w-6" />}
              </div>
            </div>

            <div className="mt-6 space-y-2 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {subject.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
              </p>
              <h2 className="text-xl font-bold tracking-tight text-balance text-foreground">
                {subject.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground line-clamp-2">
                {subject.subtitle}
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 w-full">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-auto px-8 min-w-[160px] rounded-2xl gap-2">
                  <span className="font-semibold">{t.subjects.activeBadge}</span>
                  <FChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', sectionOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <p className="text-[10px] leading-relaxed text-muted-foreground/70 uppercase tracking-widest">
                {t.subjects.registryCardHint}
              </p>
            </div>
          </div>

          <CollapsibleContent className="space-y-4">
            <ConsentGate consentKey="mood_tracking">
              <div className="surface-card p-6">
                <QuickPulse
                  key={subject.id ?? 'self'}
                  subjectId={subject.type === 'relative' ? subject.id : null}
                  onPulseSaved={refresh}
                />
              </div>
            </ConsentGate>

            {isSelfContext && daysSinceGlobalActivity !== null && daysSinceGlobalActivity >= 14 && !recapDismissed && (
              <RecapBanner
                days={daysSinceGlobalActivity}
                onCatchUp={() => openEntryModal()}
                onDismiss={() => setRecapDismissed(true)}
              />
            )}

            {nudges.length > 0 && (
              <div className="surface-card p-4 flex items-start gap-3">
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
              <CollapsibleTrigger className="surface-card w-full p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.checkIn.whatHappenedTitle}
                </h2>
                <FChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', observationOpen && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="surface-card border-t-0 rounded-t-none p-6 -mt-3">
                <ObservationStepper onLogged={refresh} />
              </CollapsibleContent>
            </Collapsible>

            <ConsentGate consentKey="mood_tracking">
              {moodLoading ? (
                <div className="surface-card p-5 space-y-3">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-4 w-52 rounded-full" />
                  <Skeleton className="h-56 w-full rounded-3xl" />
                </div>
              ) : (
                <MoodTrendChart
                  data={moodData}
                  lang={lang}
                  isPremium={isPremium}
                  onPremiumClick={onPremiumClick}
                  t={t}
                />
              )}
            </ConsentGate>

            <ConsentGate consentKey="pattern_detection">
              <PatternChart logs={obsLogs} conceptMap={conceptMap} />
            </ConsentGate>

            <div ref={feedRef} className="surface-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                {t.timeline.allActivity}
              </h2>
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

            <div className="surface-card p-6">
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
                  items={calendarItems}
                  currentMonth={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selectedDate={calendarSelectedDate}
                  onSelectDate={setCalendarSelectedDate}
                  onEntryClick={handleEntryClick}
                  onCreateEntry={(date) => isSelfContext ? openEntryModal(date) : openObservationModal(date)}
                />
              )}
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

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

      {!isSelfContext && (
        <ObservationModal
          open={observationModalOpen}
          onOpenChange={setObservationModalOpen}
          entryDate={observationModalDate}
          onSaved={refresh}
        />
      )}
    </ScopedStanceProvider>
  );
};

export default SubjectWorkspaceSection;
