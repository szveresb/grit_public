import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useStance } from '@/hooks/useStance';
import { useCalendarFeedData } from '@/hooks/useCalendarFeedData';
import { useDualPerspectiveData } from '@/hooks/useDualPerspectiveData';
import { useSelfAnalyticsData } from '@/hooks/useSelfAnalyticsData';
import { useMoodComparisonData } from '@/hooks/useMoodComparisonData';
import { useObservationIntensityComparisonData } from '@/hooks/useObservationIntensityComparisonData';
import PatternPulseChart from '@/components/timeline/PatternPulseChart';
import CorrelationChart from '@/components/timeline/CorrelationChart';
import MoodComparisonChart from '@/components/timeline/MoodComparisonChart';
import ObservationIntensityChart from '@/components/timeline/ObservationIntensityChart';
import DualPerspectiveInsights, { strengthBand } from '@/components/timeline/DualPerspectiveInsights';
import CorrelationScatter from '@/components/timeline/CorrelationScatter';
import ConceptCorrelationList from '@/components/timeline/ConceptCorrelationList';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';
import { FTimeline, FSparkles, FList, FUsers, FCheck, FPlus } from '@/components/icons/FreudIcons';
import SubjectSelector from '@/components/observations/SubjectSelector';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Sparkline = ({ scores, delta }: { scores: number[]; delta: number }) => {
  if (!scores || scores.length === 0) return null;

  const colorClass = delta > 0
    ? 'text-primary'
    : delta < 0
      ? 'text-destructive'
      : 'text-muted-foreground';

  if (scores.length < 2) {
    return (
      <svg className={`w-12 h-6 ${colorClass}`} viewBox="0 0 40 20">
        <circle cx="20" cy="10" r="3" fill="currentColor" />
      </svg>
    );
  }

  const width = 40;
  const height = 16;
  const padding = 2;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min === 0 ? 1 : max - min;

  const points = scores.map((score, index) => {
    const x = padding + (index * (width - 2 * padding)) / (scores.length - 1);
    const y = padding + (height - 2 * padding) - ((score - min) / range) * (height - 2 * padding);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];

  return (
    <svg className={`w-12 h-6 ${colorClass}`} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill="currentColor" />
    </svg>
  );
};

const RELATIONSHIP_TYPES = ['child', 'spouse', 'parent', 'sibling', 'other'] as const;

const Timeline = () => {
  const { t, lang } = useLanguage();
  const getSupportedSubjectDemographicsSummary = (s: any) => {
    const parts: string[] = [];
    if (s.biologicalSex) {
      const key = `biologicalSex${s.biologicalSex.charAt(0).toUpperCase() + s.biologicalSex.slice(1)}` as keyof typeof t.profile;
      parts.push(t.profile[key] || s.biologicalSex);
    }
    if (s.birthYear) {
      parts.push(String(s.birthYear));
      const currentYear = new Date().getFullYear();
      if (s.birthYear >= 1900 && s.birthYear <= currentYear) {
        const age = currentYear - s.birthYear;
        parts.push(t.profile.approximateAge.replace('{age}', String(age)));
      }
    }
    return parts.length > 0 ? ` • ${parts.join(' • ')}` : '';
  };
  const { user } = useAuth();
  const {
    subjectType,
    selectedSubjectId,
    selectedSubjectName,
    setSubjectType,
    setSelectedSubjectId,
    setSelectedSubjectName,
    subjects,
    setActiveSubjectContext,
    refetchSubjects,
  } = useStance();

  const [viewMode, setViewMode] = useState<'individual' | 'correlation'>('individual');
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [hasInitializedConceptIds, setHasInitializedConceptIds] = useState(false);

  // Inline add subject states
  const [showAddInline, setShowAddInline] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelType, setNewRelType] = useState<string>('other');
  const [newBiologicalSex, setNewBiologicalSex] = useState<string | null>(null);
  const [newBirthYear, setNewBirthYear] = useState<string>('');
  const [newObserverConsent, setNewObserverConsent] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAddInlineSubject = async () => {
    if (!user || !newName.trim()) return;

    let parsedBirthYear: number | null = null;
    if (newBirthYear.trim() !== '') {
      const yearNum = parseInt(newBirthYear.trim(), 10);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(newBirthYear.trim()) || isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        toast.error(t.profile.errorInvalidBirthYear);
        return;
      }
      parsedBirthYear = yearNum;
    }

    setAdding(true);
    const { data, error } = await (supabase.from('subjects') as any)
      .insert([{ 
        user_id: user.id, 
        name: newName.trim(), 
        relationship_type: newRelType,
        biological_sex: newBiologicalSex || null,
        birth_year: parsedBirthYear
      }])
      .select('id, name, relationship_type')
      .single();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      toast.success(t.premium.subjectAdded);
      await refetchSubjects();
      setActiveSubjectContext({ type: 'relative', id: data.id, name: data.name });
      setNewName('');
      setNewRelType('other');
      setNewBiologicalSex(null);
      setNewBirthYear('');
      setNewObserverConsent(false);
      setShowAddInline(false);
    }
    setAdding(false);
  };

  // Sync active relative subject from useStance() into comparison selection
  useEffect(() => {
    if (subjectType === 'relative' && selectedSubjectId) {
      setSelectedCompareIds((prev) => {
        if (prev.includes(selectedSubjectId)) return prev;
        return [...prev, selectedSubjectId];
      });
    }
  }, [selectedSubjectId, subjectType]);

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
    data: moodCompData,
    loading: moodCompLoading,
    subjectHasData,
  } = useMoodComparisonData({
    userId: user?.id,
    compareSubjectIds: selectedCompareIds,
    days: windowDays,
  });

  const {
    dailySeries,
    overlapStats: selfStats,
    conceptCorrelations: selfConceptCorrelations,
    questionnaireTrends: selfQuestionnaireTrends,
    questionnaireFillsCount,
    loading: selfLoading,
  } = useSelfAnalyticsData({
    userId: user?.id,
    days: windowDays,
  });

  const {
    data: obsIntensityData,
    loading: obsIntensityLoading,
    concepts: obsIntensityConcepts,
    defaultSelectedConceptIds,
    conceptHasData: obsIntensityConceptHasData,
  } = useObservationIntensityComparisonData({
    userId: user?.id,
    subjectType,
    subjectId: selectedSubjectId,
    days: windowDays,
  });

  // Synchronize and preserve selected concepts when concepts/defaults change
  useEffect(() => {
    if (obsIntensityLoading) return;
    setSelectedConceptIds((prev) => {
      // Keep only selections that are still present in the updated concepts list
      const stillValid = prev.filter((id) => obsIntensityConcepts.some((c) => c.id === id));
      
      // If we had no selections previously, or none of them are valid in the new range,
      // fallback to the default selections for this range.
      if (!hasInitializedConceptIds || stillValid.length === 0) {
        setHasInitializedConceptIds(true);
        return defaultSelectedConceptIds;
      }
      return stillValid;
    });
  }, [obsIntensityConcepts, defaultSelectedConceptIds, obsIntensityLoading, hasInitializedConceptIds]);

  // Reset initial flag when stance or selected person changes
  useEffect(() => {
    setHasInitializedConceptIds(false);
    setSelectedConceptIds([]);
  }, [subjectType, selectedSubjectId]);

  const selfMoodPoints = useMemo(() => {
    return dailySeries
      .filter((p) => p.selfMood !== null)
      .map((p) => ({
        date: p.date,
        level: p.selfMood as number,
      }));
  }, [dailySeries]);

  const loading =
    viewMode === 'correlation'
      ? (subjectType === 'relative' && selectedSubjectId ? correlationLoading || moodCompLoading : false)
      : (subjectType === 'self' ? selfLoading || feedLoading || obsIntensityLoading : feedLoading);

  const showCorrelation = viewMode === 'correlation';
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

        {/* View mode toggle (if observer subjects exist) */}
        {subjects.length > 0 && (
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
            subjectType === 'relative' && selectedSubjectId ? (
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

                <MoodComparisonChart
                  data={moodCompData}
                  lang={lang}
                  t={t}
                  subjects={subjects}
                  selectedSubjectIds={selectedCompareIds}
                  onSelectedSubjectIdsChange={setSelectedCompareIds}
                  subjectHasData={subjectHasData}
                />

                <DualPerspectiveInsights
                  stats={correlationStats}
                  t={t}
                  relativeName={selectedSubjectName || t.subjects.otherLabel}
                />

                <CorrelationScatter stats={correlationStats} t={t} lang={lang} />

                <ConceptCorrelationList stats={correlationStats} t={t} lang={lang} />

                <p className="text-[10px] text-muted-foreground italic text-center px-4">
                  {t.timeline.dual.disclaimer}
                </p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="surface-card p-8 sm:p-12 text-center space-y-6 animate-fade-in border border-border/50 rounded-2xl shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
                  <FSparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t.timeline.dual.noSubjectsTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t.timeline.dual.noSubjectsDesc}
                  </p>
                </div>
                
                {/* Inline add subject form */}
                {showAddInline ? (
                  <div className="border border-border/50 rounded-2xl p-5 space-y-4 max-w-md mx-auto bg-muted/20 text-left animate-fade-in">
                    <div className="space-y-1.5">
                      <Label htmlFor="inline-subject-name" className="text-xs font-medium text-foreground">
                        {t.subjects.namePlaceholder}
                      </Label>
                      <Input
                        id="inline-subject-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={t.subjects.namePlaceholder}
                        className="rounded-2xl"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="inline-subject-relation" className="text-xs font-medium text-foreground">
                        {t.subjects.perspectiveLabel}
                      </Label>
                      <Select value={newRelType} onValueChange={setNewRelType}>
                        <SelectTrigger id="inline-subject-relation" className="rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_TYPES.map((rt) => (
                            <SelectItem key={rt} value={rt}>
                              {t.subjects.relationshipTypes[rt] ?? rt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inline-subject-sex" className="text-xs font-medium text-foreground">
                        {t.profile.biologicalSexLabel}
                      </Label>
                      <Select 
                        value={newBiologicalSex || "none"} 
                        onValueChange={(val) => setNewBiologicalSex(val === "none" ? null : val)}
                      >
                        <SelectTrigger id="inline-subject-sex" className="rounded-2xl bg-background border-input">
                          <SelectValue placeholder={t.profile.biologicalSexPlaceholder} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-border bg-popover text-popover-foreground shadow-md">
                          <SelectItem value="none" className="rounded-lg">{t.profile.biologicalSexNone}</SelectItem>
                          <SelectItem value="female" className="rounded-lg">{t.profile.biologicalSexFemale}</SelectItem>
                          <SelectItem value="male" className="rounded-lg">{t.profile.biologicalSexMale}</SelectItem>
                          <SelectItem value="intersex" className="rounded-lg">{t.profile.biologicalSexIntersex}</SelectItem>
                          <SelectItem value="unknown" className="rounded-lg">{t.profile.biologicalSexUnknown}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inline-subject-birthyear" className="text-xs font-medium text-foreground">
                        {t.profile.birthYearLabel}
                      </Label>
                      <Input 
                        id="inline-subject-birthyear"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={t.profile.birthYearPlaceholder}
                        value={newBirthYear} 
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d*$/.test(val) && val.length <= 4) {
                            setNewBirthYear(val);
                          }
                        }} 
                        className="rounded-2xl" 
                      />
                      {newBirthYear.trim() !== '' && (() => {
                        const y = parseInt(newBirthYear.trim(), 10);
                        const currentYear = new Date().getFullYear();
                        if (/^\d{4}$/.test(newBirthYear.trim()) && !isNaN(y) && y >= 1900 && y <= currentYear) {
                          return (
                            <p className="text-xs text-muted-foreground mt-1 animate-fade-in">
                              {t.profile.approximateAge.replace('{age}', String(currentYear - y))}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    
                    <label className="flex items-start gap-3 cursor-pointer group pt-1">
                      <button
                        type="button"
                        onClick={() => setNewObserverConsent(!newObserverConsent)}
                        className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          newObserverConsent
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border group-hover:border-primary/50'
                        }`}
                      >
                        {newObserverConsent && <FCheck className="h-3 w-3" />}
                      </button>
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        {t.premium.observerConsentCheckbox}
                      </span>
                    </label>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="rounded-2xl flex-1"
                        onClick={handleAddInlineSubject}
                        disabled={adding || !newName.trim() || !newObserverConsent}
                      >
                        {t.subjects.addSubject}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-2xl"
                        onClick={() => {
                          setShowAddInline(false);
                          setNewName('');
                          setNewRelType('other');
                          setNewBiologicalSex(null);
                          setNewBirthYear('');
                          setNewObserverConsent(false);
                        }}
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowAddInline(true)}
                    className="rounded-2xl font-semibold text-xs tracking-wider uppercase h-10 px-6 gap-2"
                  >
                    <FPlus className="h-4 w-4" />
                    {t.timeline.dual.noSubjectsCta}
                  </Button>
                )}
              </div>
            ) : (
              <div className="surface-card p-8 sm:p-10 text-center space-y-6 animate-fade-in border border-border/50 rounded-2xl shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
                  <FUsers className="h-6 w-6" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t.timeline.dual.selectSubjectTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t.timeline.dual.selectSubjectDesc}
                  </p>
                </div>

                <div className="grid gap-2.5 max-w-md mx-auto">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveSubjectContext({ type: 'relative', id: s.id, name: s.name });
                      }}
                      className="flex items-center gap-3 border border-border hover:border-amber-300 dark:hover:border-amber-700 rounded-2xl p-3.5 text-left transition-colors bg-card hover:bg-muted/10"
                    >
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-200 shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold block text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {t.subjects.relationshipTypes[s.relationshipType as keyof typeof t.subjects.relationshipTypes] ?? s.relationshipType}
                          {getSupportedSubjectDemographicsSummary(s)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
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

              {/* 1.5. Observation Intensity Comparison */}
              <ErrorBoundary name="SelfObservationIntensityComparison">
                <ObservationIntensityChart
                  data={obsIntensityData}
                  concepts={obsIntensityConcepts}
                  selectedConceptIds={selectedConceptIds}
                  onSelectedConceptIdsChange={setSelectedConceptIds}
                  conceptHasData={obsIntensityConceptHasData}
                  lang={lang}
                  t={t}
                />
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

                  {questionnaireFillsCount > 0 && (
                    <div className="px-1">
                      <p className="text-xs font-medium text-primary">
                        {t.timeline.questionnaireFillsSummary.replace('{count}', String(questionnaireFillsCount))}
                      </p>
                    </div>
                  )}
                  
                  {questionnaireFillsCount === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {t.timeline.selfEmptyQuestionnairesNoFills}
                    </p>
                  ) : selfQuestionnaireTrends.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {t.timeline.selfEmptyQuestionnairesFillsButNoScored.replace('{count}', String(questionnaireFillsCount))}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selfQuestionnaireTrends.map((trend: any) => {
                        const title = (lang === 'en' ? trend.questionnaires?.title_localized?.en : trend.questionnaires?.title_localized?.hu) ||
                                      trend.questionnaires?.title ||
                                      t.nav.questionnaires;
                        const delta = trend.trend_delta;
                        const hasPrev = trend.previous_score !== null;
                        
                        return (
                          <div key={trend.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-all duration-200">
                            <div className="space-y-1 flex-1 min-w-0 pr-3">
                              <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{t.timeline.latestScore}: <span className="font-semibold text-foreground">{trend.latest_score}</span></span>
                                {hasPrev && (
                                  <>
                                    <span>·</span>
                                    <span>{t.timeline.previousScore}: <span className="text-muted-foreground">{trend.previous_score}</span></span>
                                  </>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {t.timeline.completedAtLabel}: {format(new Date(trend.last_updated_at), 'yyyy-MM-dd HH:mm')}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              <Sparkline scores={trend.in_window_scores || [trend.latest_score]} delta={delta} />
                              
                              {hasPrev && (
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  delta > 0 
                                    ? 'bg-primary/10 text-primary border border-primary/20' 
                                    : delta < 0 
                                      ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                                      : 'bg-muted text-muted-foreground border border-border/40'
                                }`}>
                                  {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ErrorBoundary>
            </div>

          ) : (
            <div className="space-y-6">
              {/* Range selector for relative individual analytics */}
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/50 animate-fade-in">
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

              {/* Observation Intensity Comparison */}
              <ErrorBoundary name="RelativeObservationIntensityComparison">
                <ObservationIntensityChart
                  data={obsIntensityData}
                  concepts={obsIntensityConcepts}
                  selectedConceptIds={selectedConceptIds}
                  onSelectedConceptIdsChange={setSelectedConceptIds}
                  conceptHasData={obsIntensityConceptHasData}
                  lang={lang}
                  t={t}
                />
              </ErrorBoundary>

              {/* Observation Patterns */}
              <ErrorBoundary name="RelativeObservationPatterns">
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
            </div>
          )}
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default Timeline;
