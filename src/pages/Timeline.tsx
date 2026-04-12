import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStance } from '@/hooks/useStance';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import { useDualPerspectiveData } from '@/hooks/useDualPerspectiveData';
import PatternPulseChart from '@/components/timeline/PatternPulseChart';
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

  const { obsLogs, conceptMap, loading: feedLoading } = useCalendarFeedData({
    userId: user?.id,
    subjectType,
    subjectId: selectedSubjectId,
    lang,
    t,
  });

  const { data: correlationData, loading: correlationLoading } = useDualPerspectiveData({
    userId: user?.id,
    relativeId: selectedSubjectId,
    days: 30,
  });

  const loading = viewMode === 'individual' ? feedLoading : correlationLoading;
  const showCorrelation = viewMode === 'correlation' && subjectType === 'relative';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
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
            <CorrelationChart 
              data={correlationData} 
              lang={lang} 
              t={t} 
              relativeName={selectedSubjectName || t.subjects.otherLabel} 
            />
          ) : (
            <PatternPulseChart logs={obsLogs} conceptMap={conceptMap} />
          )}
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default Timeline;
