import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { FArrowLeft, FHeart, FMessageCircle, FShield, FCheck } from '@/components/icons/FreudIcons';

interface Category {
  id: string;
  name_hu: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
}

interface Concept {
  id: string;
  name_hu: string;
  name_en: string;
  description_hu: string | null;
  description_en: string | null;
  sort_order: number;
}

const iconMap: Record<string, React.ReactNode> = {
  heart: <FHeart className="h-5 w-5" />,
  'message-circle': <FMessageCircle className="h-5 w-5" />,
  shield: <FShield className="h-5 w-5" />,
};

const ObservationStepper = ({ onLogged }: { onLogged?: () => void }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  
  const [context, setContext] = useState('');
  const [narrative, setNarrative] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('observation_categories').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  const selectCategory = async (catId: string) => {
    setSelectedCategory(catId);
    const { data } = await supabase.from('observation_concepts').select('*')
      .eq('category_id', catId).eq('is_active', true).order('sort_order');
    setConcepts((data as Concept[]) ?? []);
    setStep(1);
  };

  const selectConcept = (conceptId: string) => {
    setSelectedConcept(conceptId);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user || !selectedConcept) return;
    setSubmitting(true);
    const { error } = await supabase.from('observation_logs').insert({
      user_id: user.id,
      concept_id: selectedConcept,
      intensity,
      context_modifier: context || null,
      user_narrative: narrative || null,
    });
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success(t.observations.logged);
    setStep(0); setSelectedCategory(null); setSelectedConcept(null);
    setIntensity(3); setContext(''); setNarrative('');
    setSubmitting(false);
    onLogged?.();
  };

  const name = (item: { name_hu: string; name_en: string }) => lang === 'en' ? item.name_en : item.name_hu;
  const desc = (item: { description_hu: string | null; description_en: string | null }) => lang === 'en' ? item.description_en : item.description_hu;

  const stepLabels = [t.observations.stepWhatsGoing, t.observations.stepHowHeavy, t.observations.stepAnythingElse];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <FCheck className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < stepLabels.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Categories */}
      {step === 0 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground text-center">{t.observations.chooseDomain}</p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">{t.observations.noCategories}</p>
          ) : (
            <div className="grid gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-center gap-4 text-left hover:border-primary/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    {cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : <FHeart className="h-5 w-5" />}
                  </div>
                  <span className="text-sm font-semibold">{name(cat)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Concepts */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-in">
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(0)}>
            <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
          </Button>
          <p className="text-sm font-medium text-muted-foreground text-center">{t.observations.pickObservation}</p>
          {concepts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">{t.observations.noConcepts}</p>
          ) : (
            <div className="grid gap-3">
              {concepts.map(con => (
                <button
                  key={con.id}
                  onClick={() => selectConcept(con.id)}
                  className={`bg-card/60 backdrop-blur border rounded-3xl p-4 text-left transition-colors hover:border-primary/50 ${
                    selectedConcept === con.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  <span className="text-sm font-semibold block">{name(con)}</span>
                  {desc(con) && <span className="text-xs text-muted-foreground mt-1 block">{desc(con)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Qualifiers */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(1)}>
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
                  onClick={() => setIntensity(n)}
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
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.observations.frequency}</Label>
            <ToggleGroup type="single" value={frequency} onValueChange={v => setFrequency(v)} className="justify-start flex-wrap">
              {[
                { value: 'once', label: t.observations.freqOnce },
                { value: 'sometimes', label: t.observations.freqSometimes },
                { value: 'often', label: t.observations.freqOften },
                { value: 'constant', label: t.observations.freqConstant },
              ].map(f => (
                <ToggleGroupItem key={f.value} value={f.value} className="rounded-2xl text-xs px-4">
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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
