import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useObservationIntensityDefault, IntensitySource } from '@/hooks/useObservationIntensityDefault';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { FArrowLeft, FHeart, FMessageCircle, FShield, FCheck, FUsers, FHeartPulse, FClock, FSparkles, FUser, FLibrary, FDashboard } from '@/components/icons/FreudIcons';
import StanceBanner from '@/components/premium/StanceBanner';
import { cn } from '@/lib/utils';
import { useConceptResolver } from '@/hooks/useConceptResolver';

const iconMap: Record<string, React.ReactNode> = {
  activity: <FHeartPulse className="h-5 w-5" />,
  moon: <FClock className="h-5 w-5" />,
  smile: <FHeart className="h-5 w-5" />,
  sun: <FSparkles className="h-5 w-5" />,
  'message-circle': <FMessageCircle className="h-5 w-5" />,
  users: <FUsers className="h-5 w-5" />,
  shield: <FShield className="h-5 w-5" />,
  compass: <FUser className="h-5 w-5" />,
  brain: <FLibrary className="h-5 w-5" />,
  map: <FDashboard className="h-5 w-5" />,
};

const ObservationStepper = ({ onLogged, observationDate }: { onLogged?: () => void; observationDate?: string }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { activeSubject, subjectColor: globalSubjectColor } = useStance();
  const { resolver, isLoading: isResolverLoading } = useConceptResolver();
  
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedValence, setSelectedValence] = useState<'positive' | 'negative' | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  
  const [intensity, setIntensity] = useState(3);
  const [intensitySource, setIntensitySource] = useState<IntensitySource>('fallback');
  const [context, setContext] = useState('');
  const [narrative, setNarrative] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subjectType = activeSubject.type;
  const subjectId = activeSubject.id;
  const subjectName = activeSubject.type === 'relative' ? activeSubject.name : null;

  const targetDate = observationDate || format(new Date(), 'yyyy-MM-dd');
  const { defaultIntensity, source: defaultIntensitySource } = useObservationIntensityDefault({
    date: targetDate,
    subjectType,
    subjectId,
  });

  // Load categories and concepts dynamically from resolver
  const categories = useMemo(() => {
    return resolver ? resolver.getActiveCategories() : [];
  }, [resolver]);

  const concepts = useMemo(() => {
    if (!resolver || !selectedCategory || !selectedValence) return [];
    return resolver.getConceptsByCategoryAndValence(selectedCategory, selectedValence);
  }, [resolver, selectedCategory, selectedValence]);

  useEffect(() => {
    setStep(0);
    setSelectedCategory(null);
    setSelectedValence(null);
    setSelectedConcept(null);
    setIntensity(3);
    setIntensitySource('fallback');
    setContext('');
    setNarrative('');
    setSubmitting(false);
  }, [activeSubject.key, targetDate]);

  useEffect(() => {
    if (intensitySource !== 'manual') {
      setIntensity(defaultIntensity);
      setIntensitySource(defaultIntensitySource);
    }
  }, [defaultIntensity, defaultIntensitySource, intensitySource]);

  const selectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setStep(1);
  };

  const selectValence = (valence: 'positive' | 'negative') => {
    setSelectedValence(valence);
    setStep(2);
  };

  const selectConcept = (conceptId: string) => {
    setSelectedConcept(conceptId);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!user || !selectedConcept) return;
    if (subjectType === 'relative' && !subjectId) {
      toast.error(t.subjects.selectSubjectError);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('observation_logs').insert({
      user_id: user.id,
      concept_id: selectedConcept,
      intensity,
      context_modifier: context || null,
      user_narrative: narrative || null,
      subject_type: subjectType,
      subject_id: subjectType === 'relative' ? subjectId : null,
      logged_at: observationDate || undefined,
    });
    if (error) { toast.error(friendlyDbError(error)); setSubmitting(false); return; }
    toast.success(t.observations.logged);
    setStep(0);
    setSelectedCategory(null);
    setSelectedValence(null);
    setSelectedConcept(null);
    setIntensity(defaultIntensity);
    setIntensitySource(defaultIntensitySource);
    setContext('');
    setNarrative('');
    setSubmitting(false);
    onLogged?.();
  };

  const stepLabels = [
    t.observations.stepCategory,
    t.observations.stepValence,
    t.observations.stepConcept,
    t.observations.stepQualifiers
  ];

  if (isResolverLoading) {
    return (
      <div className="text-center py-8 flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center justify-center w-full max-w-xs mx-auto px-2">
        {stepLabels.map((label, i) => (
          <div key={i} className={cn("flex items-center", i < stepLabels.length - 1 && "flex-1")}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <FCheck className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 min-w-[0.5rem] max-w-[2rem] ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Category Selection */}
      {step === 0 && (
        <div className="space-y-3 animate-fade-in">
          <StanceBanner subjectType={subjectType} subjectName={subjectName ?? undefined} subjectColor={globalSubjectColor} compact />
          <p className="text-sm font-medium text-muted-foreground text-center">{t.observations.chooseDomain}</p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">{t.observations.noCategories}</p>
          ) : (
            <div className="grid gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className="surface-card p-4 flex items-center gap-4 text-left hover:border-primary/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : <FHeart className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-semibold">{lang === 'en' ? cat.name_en : cat.name_hu}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Valence (Positive / Negative Mode) */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-in">
          <StanceBanner subjectType={subjectType} subjectName={subjectName ?? undefined} subjectColor={globalSubjectColor} compact />
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(0)}>
            <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
          </Button>
          <p className="text-sm font-medium text-muted-foreground text-center">{t.observations.chooseValence}</p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => selectValence('positive')}
              className={cn(
                "border rounded-3xl p-5 text-left transition-all hover:shadow-sm flex flex-col justify-between min-h-[9rem] w-full",
                "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50"
              )}
            >
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <FSparkles className="h-5 w-5" />
              </div>
              <div className="mt-3">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 block">{t.observations.modePositiveTitle}</span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 block leading-normal">{t.observations.modePositiveDesc}</span>
              </div>
            </button>

            <button
              onClick={() => selectValence('negative')}
              className={cn(
                "border rounded-3xl p-5 text-left transition-all hover:shadow-sm flex flex-col justify-between min-h-[9rem] w-full",
                "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50"
              )}
            >
              <div className="h-9 w-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                <FHeartPulse className="h-5 w-5" />
              </div>
              <div className="mt-3">
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300 block">{t.observations.modeNegativeTitle}</span>
                <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 block leading-normal">{t.observations.modeNegativeDesc}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Concept Cards */}
      {step === 2 && (
        <div className="space-y-3 animate-fade-in">
          <StanceBanner subjectType={subjectType} subjectName={subjectName ?? undefined} subjectColor={globalSubjectColor} compact />
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(1)}>
            <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
          </Button>
          <p className="text-sm font-medium text-muted-foreground text-center">{t.observations.pickObservation}</p>
          {concepts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">{t.observations.noConcepts}</p>
          ) : (
            <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {concepts.map(con => (
                <button
                  key={con.id}
                  onClick={() => selectConcept(con.id)}
                  className={cn(
                    "bg-card/60 backdrop-blur border rounded-3xl p-4 text-left transition-colors hover:border-primary/50",
                    selectedConcept === con.id ? 'border-primary' : 'border-border'
                  )}
                >
                  <span className="text-sm font-semibold block">{lang === 'en' ? con.name_en : con.name_hu}</span>
                  {(lang === 'en' ? con.description_en : con.description_hu) && (
                    <span className="text-xs text-muted-foreground mt-1 block leading-normal">
                      {lang === 'en' ? con.description_en : con.description_hu}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Qualifiers */}
      {step === 3 && (
        <div className="space-y-5 animate-fade-in">
          <StanceBanner subjectType={subjectType} subjectName={subjectName ?? undefined} subjectColor={globalSubjectColor} />
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(2)}>
            <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
          </Button>

          {/* Intensity */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.observations.intensity}</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setIntensity(n); setIntensitySource('manual'); }}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${
                    intensity === n
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {defaultIntensitySource === 'pulse-seeded' && (
              <p className="text-[10px] text-muted-foreground">
                {intensitySource === 'manual' ? t.observations.intensityCustom : t.observations.intensityFromPulse}
              </p>
            )}
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.observations.context}</Label>
            <Input
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder={t.observations.context}
              className="rounded-2xl"
            />
          </div>

          {/* Narrative */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.observations.notes}</Label>
            <Textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              placeholder={t.observations.notes}
              rows={3}
              className="rounded-2xl"
            />
          </div>

          <Button size="sm" className="rounded-2xl w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t.saving : t.observations.logObservation}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ObservationStepper;
