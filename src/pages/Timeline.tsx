import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStance } from '@/hooks/useStance';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import { useDualPerspectiveData } from '@/hooks/useDualPerspectiveData';
import { useSelfAnalyticsData } from '@/hooks/useSelfAnalyticsData';
import PatternPulseChart from '@/components/timeline/PatternPulseChart';
import CorrelationChart from '@/components/timeline/CorrelationChart';
import DualPerspectiveInsights, { strengthBand } from '@/components/timeline/DualPerspectiveInsights';
import CorrelationScatter from '@/components/timeline/CorrelationScatter';
import ConceptCorrelationList from '@/components/timeline/ConceptCorrelationList';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';
import { FTimeline, FSparkles, FList, FUsers } from '@/components/icons/FreudIcons';
import SubjectSelector from '@/components/observations/SubjectSelector';
import ErrorBoundary from '@/components/ErrorBoundary';

const Timeline = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const {
    subjectType,
    selectedSubjectId,
    selectedSubjectName,
    setSubjectType,
    setSelectedSubjectId,
    setSelectedSubjectName,
    subjects,
  } = useStance();

  const [viewMode, setViewMode] = useState<'individual' | 'correlation'>('individual');
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);

  const { obsLogs, conceptMap, loading: feedLoading } = useCalendarFeedData({
    userId: user?.id,
    subjectType,
    subjectId: selectedSubjectId,
    lang,
    t,
  });

  const { data: correlationData, stats: correlationStats, loading: correlationLoading } = useDualPerspectiveData({
    userId: user?.id,
    relativeId: selectedSubjectId,
    days: windowDays,
  });

  const {
    dailySeries,
    overlapStats: selfStats,
    conceptCorrelations: selfConceptCorrelations,
    questionnaireTrends: selfQuestionnaireTrends,
    loading: selfLoading,
  } = useSelfAnalyticsData({
    userId: user?.id,
    days: windowDays,
  });

  const selfMoodPoints = useMemo(() => {
    return dailySeries
      .filter((p) => p.selfMood !== null)
      .map((p) => ({
        date: p.date,
        level: p.selfMood as number,
      }));
  }, [dailySeries]);

  const loading =
    subjectType === 'self'
      ? selfLoading || feedLoading
      : viewMode === 'individual'
      ? feedLoading
      : correlationLoading;

  const showCorrelation = viewMode === 'correlation' && subjectType === 'relative';
  const showSelfCorrelation = selfStats.overlapDays >= 5;

  return (
    <DashboardLayout showContextToolPanel={false}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3 pb-3 border-b border-border/50">
          <FTimeline className="h-6 w-6 text-primary mt-0.5 shrink-0" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t.timeline.pageTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.timeline.pageSubtitle}</p>
          </div>
        </div>

        {/* Subject selector (if observer subjects exist) */}
        {subjects.length > 0 && (
          <SubjectSelector
            subjectType={subjectType}
            onSubjectTypeChange={setSubjectType}
            selectedSubjectId={selectedSubjectId}
            onSubjectIdChange={setSelectedSubjectId}
            onSubjectNameChange={setSelectedSubjectName}
          />
        )}

        {/* View mode toggle (if observer subject selected) */}
        {subjectType === 'relative' && selectedSubjectId && (
          <div className="flex p-1.5 bg-muted/30 rounded-2xl border border-border/50 max-w-sm mx-auto animate-fade-in shadow-sm">
            <button
              onClick={() => setViewMode('individual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                viewMode === 'individual' 
                ? 'bg-background text-primary shadow-sm ring-1 ring-border/50' 
                : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <FList className="h-3.5 w-3.5" />
              {t.timeline.individualMode || 'Patterns'}
            </button>
            <button
              onClick={() => setViewMode('correlation')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                viewMode === 'correlation' 
                ? 'bg-background text-primary shadow-sm ring-1 ring-border/50' 
                : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <FSparkles className="h-3.5 w-3.5 text-amber-500" />
              {t.timeline.correlationMode || 'Correlation'}
            </button>
          </div>
        )}

        {/* Dynamic Visualization Content */}
        <ErrorBoundary name="TimelineViz">
          {loading ? (
            <div className="surface-card p-12 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
              <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">{t.loading}</p>
            </div>
          ) : subjectType === 'self' ? (
            <div className="space-y-6">
              {/* Range selector for self analytics */}
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                  {t.timeline.dual.windowLabel}
                </span>
                {([7, 30, 90] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWindowDays(w)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-colors ${
                      windowDays === w
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/40'
                    }`}
                  >
                    {w === 7 ? t.timeline.dual.window7d : w === 30 ? t.timeline.dual.window30d : t.timeline.dual.window90d}
                  </button>
                ))}
              </div>

              {/* 1. Mood Trend */}
              <ErrorBoundary name="SelfMoodTrend">
                {selfMoodPoints.length < 2 ? (
                  <div className="surface-card p-5">
                    <h2 className="text-sm font-semibold text-foreground">{t.timeline.moodTrendTitle}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{t.timeline.selfEmptyMood}</p>
                  </div>
                ) : (
                  <MoodTrendChart data={selfMoodPoints} lang={lang} t={t} />
                )}
              </ErrorBoundary>

              {/* 2. Observation Patterns */}
              <ErrorBoundary name="SelfObservationPatterns">
                {obsLogs.length === 0 ? (
                  <div className="surface-card p-5 space-y-2">
                    <h2 className="text-sm font-semibold text-foreground">{t.timeline.patternChartTitle}</h2>
                    <p className="text-xs text-muted-foreground">{t.timeline.selfEmptyObservations}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-foreground px-1">{t.timeline.patternChartTitle}</h2>
                    <PatternPulseChart logs={obsLogs} conceptMap={conceptMap} />
                  </div>
                )}
              </ErrorBoundary>

              {/* 3. Correlation & Insights */}
              <ErrorBoundary name="SelfCorrelationInsights">
                {showSelfCorrelation ? (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-foreground px-1">{t.timeline.correlationTitle || 'Correlation'}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="surface-card p-4 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <FSparkles className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t.timeline.dual.overallCorrelation}
                          </span>
                        </div>
                        <p className="text-2xl font-semibold text-foreground tabular-nums">
                          {selfStats.overallR == null ? '—' : selfStats.overallR.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selfStats.overallR == null ? t.timeline.dual.strengthNone : strengthBand(selfStats.overallR, t)}
                        </p>
                      </div>

                      <div className="surface-card p-4 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <FTimeline className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t.timeline.dual.coOccurrenceTitle}
                          </span>
                        </div>
                        <p className="text-2xl font-semibold text-foreground tabular-nums">
                          {Math.round((selfStats.overlapDays / selfStats.totalDays) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.timeline.selfCoOccurrenceDesc
                            .replace('{n}', String(selfStats.overlapDays))
                            .replace('{total}', String(selfStats.totalDays))
                            .replace('{pct}', String(Math.round((selfStats.overlapDays / selfStats.totalDays) * 100)))}
                        </p>
                      </div>
                    </div>

                    {selfConceptCorrelations.length > 0 && (
                      <div className="surface-card p-5 space-y-4 animate-fade-in">
                        <div className="flex items-start gap-2">
                          <FSparkles className="h-4 w-4 text-primary mt-0.5" />
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-foreground">{t.timeline.dual.conceptListTitle}</h3>
                            <p className="text-xs text-muted-foreground">{t.timeline.dual.conceptListSubtitle}</p>
                          </div>
                        </div>
                        <ul className="space-y-2">
                          {selfConceptCorrelations.map((c) => {
                            const positive = c.r >= 0;
                            const magnitude = Math.min(1, Math.abs(c.r));
                            const name = lang === 'hu' ? c.nameHu : c.nameEn;
                            return (
                              <li
                                key={c.conceptId}
                                className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/20 border border-border/40"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {t.timeline.dual.conceptDays.replace('{n}', String(c.n))}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                    <div
                                      className={`h-full ${positive ? 'bg-primary' : 'bg-destructive'}`}
                                      style={{ width: `${magnitude * 100}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`text-xs font-semibold tabular-nums ${
                                      positive ? 'text-primary' : 'text-destructive'
                                    }`}
                                  >
                                    {positive ? '+' : ''}
                                    {c.r.toFixed(2)}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="surface-card p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <FTimeline className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-bold text-foreground">{t.timeline.selfNotEnoughOverlap}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.timeline.selfNotEnoughOverlapDesc}
                    </p>
                  </div>
                )}
              </ErrorBoundary>

              {/* 4. Questionnaire Score Trends */}
              <ErrorBoundary name="SelfQuestionnaireTrends">
                <div className="surface-card p-5 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">
                      {t.timeline.questionnaireTrendsTitle}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t.timeline.questionnaireTrendsSubtitle}
                    </p>
                  </div>
                  
                  {selfQuestionnaireTrends.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">{t.timeline.selfEmptyQuestionnaires}</p>
                  ) : (
                    <div className="space-y-3">
                      {selfQuestionnaireTrends.map((trend) => {
                        const title = (lang === 'en' && trend.questionnaires?.title_localized?.en) || 
                                      trend.questionnaires?.title || 
                                      trend.questionnaires?.title_localized?.hu || 
                                      t.nav.questionnaires;
                        const delta = trend.trend_delta;
                        const hasPrev = trend.previous_score !== null;
                        
                        return (
                          <div key={trend.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/40">
                            <div className="space-y-1 flex-1 min-w-0 pr-3">
                              <p className="text-sm font-medium text-foreground truncate">{title}</p>
                              <p className="text-xs text-muted-foreground">
                                {t.timeline.latestScore}: <span className="font-semibold text-foreground">{trend.latest_score}</span>
                                {hasPrev && (
                                  <>
                                    {' · '}
                                    {t.timeline.previousScore}: <span className="text-muted-foreground">{trend.previous_score}</span>
                                  </>
                                )}
                              </p>
                            </div>
                            
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              delta > 0 
                                ? 'bg-primary/10 text-primary border border-primary/20' 
                                : delta < 0 
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                                  : 'bg-muted text-muted-foreground border border-border/40'
                            }`}>
                              {delta > 0 ? `+${delta}` : delta}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ErrorBoundary>
            </div>
          ) : showCorrelation ? (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                  {t.timeline.dual.windowLabel}
                </span>
                {([7, 30, 90] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setWindowDays(w)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-colors ${
                      windowDays === w
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/40'
                    }`}
                  >
                    {w === 7 ? t.timeline.dual.window7d : w === 30 ? t.timeline.dual.window30d : t.timeline.dual.window90d}
                  </button>
                ))}
              </div>

              <DualPerspectiveInsights
                stats={correlationStats}
                t={t}
                relativeName={selectedSubjectName || t.subjects.otherLabel}
              />

              <CorrelationChart
                data={correlationData}
                lang={lang}
                t={t}
                relativeName={selectedSubjectName || t.subjects.otherLabel}
              />

              <CorrelationScatter stats={correlationStats} t={t} lang={lang} />

              <ConceptCorrelationList stats={correlationStats} t={t} lang={lang} />

              <p className="text-[10px] text-muted-foreground italic text-center px-4">
                {t.timeline.dual.disclaimer}
              </p>
            </div>
          ) : (
            <PatternPulseChart logs={obsLogs} conceptMap={conceptMap} />
          )}
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default Timeline;
