import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStance } from '@/hooks/useStance';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import { useDualPerspectiveData } from '@/hooks/useDualPerspectiveData';
import PatternPulseChart from '@/components/timeline/PatternPulseChart';
import CorrelationChart from '@/components/timeline/CorrelationChart';
import DualPerspectiveInsights from '@/components/timeline/DualPerspectiveInsights';
import CorrelationScatter from '@/components/timeline/CorrelationScatter';
import ConceptCorrelationList from '@/components/timeline/ConceptCorrelationList';
import { FTimeline, FSparkles, FList } from '@/components/icons/FreudIcons';
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

  const loading = viewMode === 'individual' ? feedLoading : correlationLoading;
  const showCorrelation = viewMode === 'correlation' && subjectType === 'relative';

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
