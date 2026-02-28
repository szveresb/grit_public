import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { FArrowLeft, FCheck, FHeart, FMessageCircle, FShield, FZap } from '@/components/icons/FreudIcons';

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

export interface ObservationTreeResult {
  conceptId: string;
  intensity: number;
  frequency: string;
}

interface ObservationTreeProps {
  onComplete: (result: ObservationTreeResult) => void;
  onSkip: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  heart: <FHeart className="h-5 w-5" />,
  'message-circle': <FMessageCircle className="h-5 w-5" />,
  shield: <FShield className="h-5 w-5" />,
  zap: <FZap className="h-5 w-5" />,
};

const ObservationTree = ({ onComplete, onSkip }: ObservationTreeProps) => {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [frequency, setFrequency] = useState('');

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

  const handleComplete = () => {
    if (!selectedConcept) return;
    onComplete({ conceptId: selectedConcept, intensity, frequency });
  };

  const name = (item: { name_hu: string; name_en: string }) => lang === 'en' ? item.name_en : item.name_hu;
  const desc = (item: { description_hu: string | null; description_en: string | null }) => lang === 'en' ? item.description_en : item.description_hu;

  const stepLabels = [
    t.journal.guidedTreeTitle,
    t.journal.guidedTreePickObservation,
    t.journal.guidedTreeIntensity,
  ];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        {stepLabels.map((_, i) => (
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

      {/* Step 0: Tier 1 – Domain */}
      {step === 0 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground text-center">{t.journal.guidedTreeTitle}</p>
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
          <button
            onClick={onSkip}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t.journal.guidedTreeSkip}
          </button>
        </div>
      )}

      {/* Step 1: Tier 2/3 – Concept */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-in">
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(0)}>
            <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
          </Button>
          <p className="text-sm font-medium text-muted-foreground text-center">{t.journal.guidedTreePickObservation}</p>
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
          <button
            onClick={onSkip}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t.journal.guidedTreeSkip}
          </button>
        </div>
      )}

      {/* Step 2: Intensity + Frequency */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep(1)}>
            <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
          </Button>

          {/* Intensity */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.journal.guidedTreeIntensity}: {t.impactLabels[intensity - 1]}
            </Label>
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
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.guidedTreeFrequency}</Label>
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

          <Button size="sm" className="rounded-2xl w-full" onClick={handleComplete}>
            {t.journal.guidedTreeContinue}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ObservationTree;
