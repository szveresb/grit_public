import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { hu, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FArrowLeft, FCheck, FHeart, FMessageCircle, FShield, FZap, FChevronDown, FSave,
} from '@/components/icons/FreudIcons';

interface Category {
  id: string; name_hu: string; name_en: string; icon: string | null; sort_order: number;
}
interface SelectedConceptLike {
  id: string | null; name_hu: string; name_en: string;
}
interface Concept {
  id: string; name_hu: string; name_en: string; description_hu: string | null; description_en: string | null; sort_order: number;
}

export interface EntryModalPrefill {
  emotional_state?: string;
  impact_level?: number;
}

interface EntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryDate: string; // yyyy-MM-dd
  prefill?: EntryModalPrefill | null;
  onSaved: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  heart: <FHeart className="h-5 w-5" />,
  'message-circle': <FMessageCircle className="h-5 w-5" />,
  shield: <FShield className="h-5 w-5" />,
  zap: <FZap className="h-5 w-5" />,
};

type Step = 'category' | 'concept' | 'intensity' | 'done';

const EntryModal = ({ open, onOpenChange, entryDate, prefill, onSaved }: EntryModalProps) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState<Step>('category');
  const [categories, setCategories] = useState<Category[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<SelectedConceptLike | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [saving, setSaving] = useState(false);

  // Extra journal fields (collapsible)
  const [showExtras, setShowExtras] = useState(false);
  const [eventDescription, setEventDescription] = useState('');
  const [emotionalState, setEmotionalState] = useState('');
  const [selfAnchor, setSelfAnchor] = useState('');
  const [freeText, setFreeText] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('category');
      setSelectedCategory(null);
      setSelectedConcept(null);
      setConcepts([]);
      setIntensity(3);
      setSaving(false);
      setEventDescription('');
      setSelfAnchor('');
      setFreeText('');
      // Apply prefill
      if (prefill) {
        setEmotionalState(prefill.emotional_state ?? '');
        if (prefill.emotional_state) setShowExtras(true);
        else setShowExtras(false);
      } else {
        setEmotionalState('');
        setShowExtras(false);
      }
    }
  }, [open, prefill]);

  // Fetch categories once
  useEffect(() => {
    if (!open) return;
    supabase.from('observation_categories').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, [open]);

  const name = (item: { name_hu: string; name_en: string }) => lang === 'en' ? item.name_en : item.name_hu;
  const desc = (item: { description_hu: string | null; description_en: string | null }) => lang === 'en' ? item.description_en : item.description_hu;

  const selectCategory = async (cat: Category) => {
    setSelectedCategory(cat.id);
    const { data } = await supabase.from('observation_concepts').select('*')
      .eq('category_id', cat.id).eq('is_active', true).order('sort_order');
    const conceptList = (data as Concept[]) ?? [];
    setConcepts(conceptList);
    if (conceptList.length === 0) {
      // No concepts — use category name as title, skip to intensity
      setSelectedConcept({ id: null, name_hu: cat.name_hu, name_en: cat.name_en });
      setStep('intensity');
    } else {
      setStep('concept');
    }
  };

  const selectConcept = (concept: Concept) => {
    setSelectedConcept(concept);
    setStep('intensity');
  };

  const handleSave = async () => {
    if (!user || !selectedConcept) return;
    setSaving(true);

    const title = name(selectedConcept);
    const { data: journalData, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        title,
        entry_date: entryDate,
        impact_level: intensity,
        emotional_state: emotionalState || null,
        event_description: eventDescription || null,
        self_anchor: selfAnchor || null,
        free_text: freeText || null,
      })
      .select('id')
      .single();

    if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }

    // Link observation log (only if a real concept was selected)
    if (journalData && selectedConcept.id) {
      const { error: obsError } = await supabase.from('observation_logs').insert({
        user_id: user.id,
        concept_id: selectedConcept.id,
        intensity,
        journal_entry_id: journalData.id,
        logged_at: entryDate,
      });
      if (obsError) console.error('Observation link error:', obsError.message);
    }

    toast.success(t.journal.entryLogged);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const dateLabel = (() => {
    try {
      const d = parseISO(entryDate);
      return format(d, 'MMMM d', { locale: lang === 'hu' ? hu : enUS });
    } catch { return entryDate; }
  })();

  const stepLabels = [
    t.journal.guidedTreeTitle,
    t.journal.guidedTreePickObservation,
    t.journal.guidedTreeIntensity,
  ];
  const stepIndex = step === 'category' ? 0 : step === 'concept' ? 1 : 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border-border bg-card/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {t.journal.formNewEntry} — {dateLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Locked title preview */}
        {selectedConcept && step !== 'category' && (
          <div className="px-1">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formTitle}</Label>
            <p className="text-sm font-semibold text-foreground mt-1">{name(selectedConcept)}</p>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center py-2">
          {stepLabels.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i <= stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < stepIndex ? <FCheck className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < stepLabels.length - 1 && <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Category */}
        {step === 'category' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm font-medium text-muted-foreground text-center">{t.journal.guidedTreeTitle}</p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">{t.observations.noCategories}</p>
            ) : (
              <div className="grid gap-3">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => selectCategory(cat)}
                    className="bg-background/60 backdrop-blur border border-border rounded-2xl p-4 flex items-center gap-4 text-left hover:border-primary/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : <FHeart className="h-5 w-5" />}
                    </div>
                    <span className="text-sm font-semibold">{name(cat)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Concept */}
        {step === 'concept' && (
          <div className="space-y-3 animate-fade-in">
            <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep('category')}>
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
                    onClick={() => selectConcept(con)}
                    className="bg-background/60 backdrop-blur border border-border rounded-2xl p-4 text-left transition-colors hover:border-primary/50"
                  >
                    <span className="text-sm font-semibold block">{name(con)}</span>
                    {desc(con) && <span className="text-xs text-muted-foreground mt-1 block">{desc(con)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Intensity */}
        {step === 'intensity' && (
          <div className="space-y-5 animate-fade-in">
            <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setStep('concept')}>
              <FArrowLeft className="h-4 w-4 mr-1" /> {t.observations.back}
            </Button>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t.journal.guidedTreeIntensity}: {t.impactLabels[intensity - 1]}
              </Label>
              <div className="flex gap-2 justify-center">
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

            {/* Collapsible extras */}
            <Collapsible open={showExtras} onOpenChange={setShowExtras}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1">
                <span>{t.checkIn.addDetails}</span>
                <FChevronDown className={`h-3.5 w-3.5 transition-transform ${showExtras ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t.journal.formWhatHappened}</Label>
                  <Textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} className="rounded-xl resize-none text-sm min-h-[60px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t.journal.formFeeling}</Label>
                  <Textarea value={emotionalState} onChange={e => setEmotionalState(e.target.value)} className="rounded-xl resize-none text-sm min-h-[60px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t.journal.formMyTruth}</Label>
                  <Textarea value={selfAnchor} onChange={e => setSelfAnchor(e.target.value)} className="rounded-xl resize-none text-sm min-h-[60px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t.journal.formNotes}</Label>
                  <Textarea value={freeText} onChange={e => setFreeText(e.target.value)} className="rounded-xl resize-none text-sm min-h-[60px]" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Save */}
            <Button
              size="sm"
              className="rounded-2xl w-full"
              onClick={handleSave}
              disabled={saving}
            >
              <FSave className="h-4 w-4 mr-1" />
              {saving ? t.saving : t.save}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EntryModal;
