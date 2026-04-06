import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStance } from '@/hooks/useStance';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import PatternPulseChart from '@/components/timeline/PatternPulseChart';
import { FTimeline } from '@/components/icons/FreudIcons';
import SubjectSelector from '@/components/observations/SubjectSelector';

const Timeline = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const {
    subjectType,
    selectedSubjectId,
    setSubjectType,
    setSelectedSubjectId,
    setSelectedSubjectName,
    subjects,
  } = useStance();

  const { obsLogs, conceptMap, loading } = useCalendarFeedData({
    userId: user?.id,
    subjectType,
    subjectId: selectedSubjectId,
    lang,
    t,
  });

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

        {/* Pattern Pulse Chart */}
        {loading ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground animate-pulse">
            {t.loading}
          </div>
        ) : (
          <PatternPulseChart logs={obsLogs} conceptMap={conceptMap} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Timeline;
