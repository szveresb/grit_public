import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RECAP_INACTIVITY_DAYS } from '@/lib/constants';
import { format, isFuture, parseISO, startOfDay, subDays } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useMoodTrendData } from '@/hooks/useMoodTrendData';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import { usePatternDetectionRange } from '@/hooks/usePatternDetectionRange';
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
import { FChevronDown, FClose, FTrendingUp, FUser, FUsers, FChevronRight, FSearch, FTimeline } from '@/components/icons/FreudIcons';
import RecapBanner from '@/components/checkin/RecapBanner';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';
import PatternChart from '@/components/timeline/PatternChart';
import HorizontalTimeline from '@/components/timeline/HorizontalTimeline';
import { cn } from '@/lib/utils';
import { safeFormat } from '@/lib/date-safe';
import ErrorBoundary from '@/components/ErrorBoundary';

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
  const { t, lang, localePath } = useLanguage();
  const { user } = useAuth();
  const feedRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryModalDate, setEntryModalDate] = useState(safeFormat(new Date(), 'yyyy-MM-dd', lang));
  const [entryModalPrefill, setEntryModalPrefill] = useState<EntryModalPrefill | null>(null);
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [observationModalDate, setObservationModalDate] = useState(safeFormat(new Date(), 'yyyy-MM-dd', lang));
  const [isIncompleteDismissed, setIsIncompleteDismissed] = useState(() => {
    const saved = localStorage.getItem(`grit_dismissed_incomplete_${subject.id ?? 'self'}`);
    return saved === 'true';
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [pulseDate, setPulseDate] = useState<Date>(() => startOfDay(new Date()));
  const [reflectEntryId, setReflectEntryId] = useState<string | null>(null);
  const [reflectObsId, setReflectObsId] = useState<string | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [dismissedPatterns, setDismissedPatterns] = useState<string[]>(() => {
    const saved = localStorage.getItem(`grit_dismissed_patterns_${subject.id ?? 'self'}`);
    return saved ? JSON.parse(saved) : [];
  });

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

    setEntryModalDate(safeFormat(targetDate, 'yyyy-MM-dd', lang));
    setEntryModalPrefill(prefill ?? null);
    setEntryModalOpen(true);
  };

  const openObservationModal = (date?: Date) => {
    const targetDate = date ?? new Date();
    if (isFuture(startOfDay(targetDate))) return;

    setObservationModalDate(safeFormat(targetDate, 'yyyy-MM-dd', lang));
    setObservationModalOpen(true);
  };
  
  const handleDismissPattern = (name: string) => {
    const updated = [...dismissedPatterns, name];
    setDismissedPatterns(updated);
    localStorage.setItem(`grit_dismissed_patterns_${subject.id ?? 'self'}`, JSON.stringify(updated));
  };

  const handleDismissIncomplete = () => {
    setIsIncompleteDismissed(true);
    localStorage.setItem(`grit_dismissed_incomplete_${subject.id ?? 'self'}`, 'true');
  };

  const { resolved: patternRange } = usePatternDetectionRange();

  const isIncreasing = (conceptId: string) => {
    const midPoint = (patternRange.start.getTime() + patternRange.end.getTime()) / 2;
    const firstHalfLogs = obsLogs.filter(
      (log) => log.concept_id === conceptId && parseISO(log.logged_at).getTime() < midPoint
    );
    const secondHalfLogs = obsLogs.filter(
      (log) => log.concept_id === conceptId && parseISO(log.logged_at).getTime() >= midPoint
    );
    return secondHalfLogs.length > firstHalfLogs.length;
  };

  const missingDaysCount = (() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      return safeFormat(d, 'yyyy-MM-dd', lang);
    });
    const activeDays = new Set(timelineItems.map((item) => item.date.slice(0, 10)));
    const missing = last7Days.filter((day) => !activeDays.has(day));
    return missing.length;
  })();

  const rangedNudges = (() => {
    const startISO = safeFormat(patternRange.start, 'yyyy-MM-dd', lang);
    const endISO = safeFormat(patternRange.end, 'yyyy-MM-dd', lang);
    const counts: Record<string, number> = {};
    for (const log of obsLogs) {
      if (log.logged_at < startISO || log.logged_at > endISO) continue;
      counts[log.concept_id] = (counts[log.concept_id] ?? 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, count]) => count >= 3)
      .map(([conceptId, count]) => {
        const concept = conceptMap[conceptId];
        const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : '';
        return { id: conceptId, name, count };
      })
      .filter((n) => n.name);
  })();

  const visibleNudges = rangedNudges.filter((n) => !dismissedPatterns.includes(n.id));
  const showIncompleteNudge = missingDaysCount >= 2 && !isIncompleteDismissed;
  const showGroupedPatterns = visibleNudges.length > 0 || showIncompleteNudge;

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

          <CollapsibleContent className="space-y-6" forceMount={mode !== 'standalone' ? true : undefined}>
            <div className={cn(
              "w-full",
              !isParallel && "lg:grid lg:grid-cols-12 lg:gap-8 space-y-6 lg:space-y-0"
            )}>
              
              {/* Left Column: QuickPulse, MoodTrendChart, ObservationStepper, HorizontalTimeline */}
              <div className={cn("flex min-w-0 flex-col gap-6 w-full", !isParallel && "lg:col-span-8")}>
                
                {/* 1. QuickPulse Entry (The Action) */}
                <ConsentGate consentKey="mood_tracking">
                  <div className={cn("surface-card animate-scale-in", isParallel ? "p-4" : "p-6")}>
                    <QuickPulse
                      key={subject.id ?? 'self'}
                      subjectId={subject.type === 'relative' ? subject.id : null}
                      onPulseSaved={refresh}
                      compact={isParallel}
                      entryDate={pulseDate}
                      onEntryDateChange={setPulseDate}
                    />
                  </div>
                </ConsentGate>

                {/* 2. Mood Trend Chart (The Result / 'Quick Pulse Chart') */}
                <ConsentGate consentKey="mood_tracking">
                  <ErrorBoundary name="MoodTrendChart">
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
                          selectedDate={format(pulseDate, 'yyyy-MM-dd')}
                          onDateSelect={(d) => setPulseDate(startOfDay(parseISO(d)))}
                        />
                      )}
                    </div>
                  </ErrorBoundary>
                </ConsentGate>

                {/* 3. Detailed Actions & Patterns */}
                {isSelfContext && daysSinceGlobalActivity !== null && daysSinceGlobalActivity >= RECAP_INACTIVITY_DAYS && !recapDismissed && !isParallel && (
                  <RecapBanner
                    days={daysSinceGlobalActivity}
                    onCatchUp={() => openEntryModal()}
                    onDismiss={() => setRecapDismissed(true)}
                  />
                )}

                <div className={cn("surface-card", isParallel ? "p-4" : "p-6")}>
                  <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    {t.checkIn.whatHappenedTitle}
                  </h2>
                  <ObservationStepper onLogged={refresh} />
                </div>

                {!isParallel && (
                  <ErrorBoundary name="HorizontalTimeline">
                    <div className="surface-card p-4 sm:p-5 animate-fade-in min-w-0">
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
                        <HorizontalTimeline
                          items={timelineItems}
                          lang={lang}
                          t={t}
                          selectedDate={format(pulseDate, 'yyyy-MM-dd')}
                          onDateSelect={(d) => setPulseDate(startOfDay(parseISO(d)))}
                        />
                      )}
                    </div>
                  </ErrorBoundary>
                )}
              </div>

              {/* Right Column: FeedCalendar, Grouped Nudges, PatternChart */}
              {!isParallel && (
                <div className="flex min-w-0 flex-col gap-6 lg:col-span-4 w-full">
                  <ErrorBoundary name="FeedCalendar">
                    <div className="surface-card p-4 sm:p-6 animate-fade-in min-w-0">
                      {calendarLoading ? (
                        <div className="space-y-4">
                          <div className="items-center justify-between flex">
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
                  </ErrorBoundary>

                  {showGroupedPatterns && (
                    <div className="surface-card p-5 sm:p-6 space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FTimeline className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                            {t.timeline.patternsGroupedTitle}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10 gap-1 text-[10px] uppercase tracking-wider font-semibold h-7 px-2">
                          <Link to={localePath('/timeline')}>
                            {t.timeline.patternsViewAll}
                            <FChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>

                      <div className="divide-y divide-border/40">
                        {/* Missing Data Nudge */}
                        {showIncompleteNudge && (
                          <div className="py-3 flex items-start gap-3 relative group/nudge first:pt-0 last:pb-0">
                            <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                              <FSearch className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground leading-snug">
                                {t.timeline.patternsIncompleteTitle}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                                {t.timeline.patternsIncompleteDesc}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                {missingDaysCount}x
                              </span>
                              <button
                                onClick={handleDismissIncomplete}
                                className="p-1 rounded-full hover:bg-muted transition-colors"
                                aria-label={t.ui?.close || 'Dismiss'}
                              >
                                <FClose className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground" />
                              </button>
                              <FChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                            </div>
                          </div>
                        )}

                        {/* Concept-based Nudges */}
                        {visibleNudges.map((nudge) => {
                          const isFrequent = isIncreasing(nudge.id);
                          const Icon = isFrequent ? FTrendingUp : FTimeline;
                          const title = isFrequent ? t.timeline.patternsFrequentTitle : t.timeline.patternsRecurringTitle;
                          const descTemplate = isFrequent ? t.timeline.patternsFrequentDesc : t.timeline.patternsRecurringDesc;
                          const desc = descTemplate.replace('{name}', nudge.name);
                          const pillClass = isFrequent
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            : "bg-primary/10 text-primary";
                          const iconBgClass = isFrequent
                            ? "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400"
                            : "bg-primary/10 text-primary";

                          return (
                            <div key={nudge.id} className="py-3 flex items-start gap-3 relative group/nudge first:pt-0 last:pb-0">
                              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", iconBgClass)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground leading-snug">
                                  {title}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                                  {desc}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-center">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", pillClass)}>
                                  {nudge.count}x
                                </span>
                                <button
                                  onClick={() => handleDismissPattern(nudge.id)}
                                  className="p-1 rounded-full hover:bg-muted transition-colors"
                                  aria-label={t.ui?.close || 'Dismiss'}
                                >
                                  <FClose className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground" />
                                </button>
                                <FChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <ConsentGate consentKey="pattern_detection">
                    <ErrorBoundary name="PatternChart">
                      <div className="animate-fade-in">
                        <PatternChart
                          logs={obsLogs}
                          conceptMap={conceptMap}
                          compact={isParallel}
                          rangeStart={patternRange.start}
                          rangeEnd={patternRange.end}
                        />
                      </div>
                    </ErrorBoundary>
                  </ConsentGate>
                </div>
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
