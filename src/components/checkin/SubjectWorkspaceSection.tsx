import { useCallback, useEffect, useRef, useState } from 'react';
import { RECAP_INACTIVITY_DAYS } from '@/lib/constants';
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
  mode?: 'standalone' | 'parallel';
}

const SubjectWorkspaceSection = ({
  subject,
  isPremium,
  onPremiumClick,
  highlightedDate,
  mode = 'standalone',
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
  const isParallel = mode === 'parallel';

  const { data: moodData, loading: moodLoading } = useMoodTrendData({
    userId: user?.id,
    subjectType: subject.type,
    subjectId: subject.id,
    refreshKey,
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
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen} disabled={mode !== 'standalone'}>
        <section className={cn('space-y-8 w-full animate-fade-in', subject.type === 'relative' ? 'theme-observer' : 'theme-self')}>
          
          {/* Dashboard Hub Style Header */}
          <div className={cn(
            "flex items-center gap-4 p-5 rounded-[2.5rem] bg-context-surface border border-context-border/50 shadow-sm transition-all",
            mode === 'standalone' && !sectionOpen ? 'flex-col text-center p-8 min-h-[220px]' : 'flex-row'
          )}>
            <div className={cn(
              "flex items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary shrink-0",
              mode === 'standalone' && !sectionOpen ? 'h-12 w-12 rounded-3xl mb-2' : 'h-10 w-10 2xl:h-12 2xl:w-12'
            )}>
              {subject.type === 'relative' ? <FUsers className="h-5 w-5 2xl:h-6 2xl:w-6" /> : <FUser className="h-5 w-5 2xl:h-6 2xl:w-6" />}
            </div>
            
            <div className={cn("flex-1 px-1", mode === 'standalone' && !sectionOpen ? 'space-y-2' : 'min-w-0')}>
              <p className={cn(
                "font-semibold uppercase tracking-[0.2em] text-muted-foreground/80",
                mode === 'standalone' && !sectionOpen ? 'text-xs' : 'text-[10px]'
              )}>
                {subject.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
              </p>
              <h2 className={cn(
                "font-bold tracking-tight text-foreground line-clamp-1",
                mode === 'standalone' && !sectionOpen ? 'text-xl' : 'text-base 2xl:text-lg'
              )}>
                {subject.name}
              </h2>
              {mode === 'standalone' && !sectionOpen && (
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground line-clamp-2">
                  {subject.subtitle}
                </p>
              )}
            </div>

            {mode === 'standalone' && (
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t.subjects.activeBadge}</span>
                  <FChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', sectionOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          <CollapsibleContent className="space-y-8" forceMount={mode !== 'standalone' ? true : undefined}>
            <div className={cn(
              "w-full",
              !isParallel && "lg:grid lg:grid-cols-12 lg:gap-10 space-y-8 lg:space-y-0"
            )}>
              
              {/* Main Column: Insights & Trends */}
              <div className={cn("space-y-8", !isParallel ? "lg:col-span-8" : "space-y-8 w-full")}>
                
                {isSelfContext && daysSinceGlobalActivity !== null && daysSinceGlobalActivity >= RECAP_INACTIVITY_DAYS && !recapDismissed && !isParallel && (
                  <RecapBanner
                    days={daysSinceGlobalActivity}
                    onCatchUp={() => openEntryModal()}
                    onDismiss={() => setRecapDismissed(true)}
                  />
                )}

                {nudges.length > 0 && (
                  <div className="surface-card p-4 flex items-start gap-3 animate-slide-in">
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

                <ConsentGate consentKey="mood_tracking">
                  <div className="animate-fade-in">
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
                        compact={isParallel}
                      />
                    )}
                  </div>
                </ConsentGate>

                <ConsentGate consentKey="pattern_detection">
                  <div className="animate-fade-in">
                    <PatternChart logs={obsLogs} conceptMap={conceptMap} compact={isParallel} />
                  </div>
                </ConsentGate>

                {!isParallel && (
                  <div ref={feedRef} className="surface-card p-5 animate-fade-in">
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
                )}
              </div>

              {/* Sidebar Column: Actions & Tools */}
              <div className={cn("space-y-8", !isParallel ? "lg:col-span-4" : "space-y-8 w-full")}>
                <ConsentGate consentKey="mood_tracking">
                  <div className={cn("surface-card animate-scale-in", isParallel ? "p-4" : "p-6")}>
                    <QuickPulse
                      key={subject.id ?? 'self'}
                      subjectId={subject.type === 'relative' ? subject.id : null}
                      onPulseSaved={refresh}
                      compact={isParallel}
                    />
                  </div>
                </ConsentGate>

                <Collapsible open={observationOpen} onOpenChange={setObservationOpen}>
                  <CollapsibleTrigger className={cn("surface-card w-full flex items-center justify-between hover:border-primary/30 transition-colors", isParallel ? "p-4" : "p-5")}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {t.checkIn.whatHappenedTitle}
                    </h2>
                    <FChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', observationOpen && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className={cn("surface-card border-t-0 rounded-t-none -mt-3", isParallel ? "p-4" : "p-6")}>
                    <ObservationStepper onLogged={refresh} />
                  </CollapsibleContent>
                </Collapsible>

                {!isParallel && (
                  <div className="surface-card p-6 animate-fade-in">
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
                )}
              </div>
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
