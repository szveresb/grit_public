import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { JournalFormData } from '@/types/journal';
import ObservationTree, { type ObservationTreeResult } from './ObservationTree';

interface JournalFormProps {
  form: JournalFormData;
  onChange: (updater: (prev: JournalFormData) => JournalFormData) => void;
  onSubmit: (e: React.FormEvent, observation?: ObservationTreeResult) => void;
  onClose: () => void;
  saving: boolean;
  isEditing: boolean;
  showObservationTree?: boolean;
}

const JournalForm = ({ form, onChange, onSubmit, onClose, saving, isEditing, showObservationTree = false }: JournalFormProps) => {
  const { t } = useLanguage();
  const [observationResult, setObservationResult] = useState<ObservationTreeResult | null>(null);
  const [treeCompleted, setTreeCompleted] = useState(!showObservationTree);

  const handleTreeComplete = (result: ObservationTreeResult) => {
    setObservationResult(result);
    setTreeCompleted(true);
  };

  const handleSkip = () => {
    setObservationResult(null);
    setTreeCompleted(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, observationResult ?? undefined);
  };

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {isEditing ? t.journal.formEditEntry : t.journal.formNewEntry}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* Observation Tree (optional guided step) */}
      {showObservationTree && !treeCompleted && (
        <ObservationTree onComplete={handleTreeComplete} onSkip={handleSkip} />
      )}

      {/* Selected path indicator */}
      {observationResult && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2">
          <span className="text-xs font-semibold text-primary">{t.journal.guidedTreeSelected}</span>
          <button
            type="button"
            onClick={() => { setObservationResult(null); setTreeCompleted(false); }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            {t.journal.guidedTreeChange}
          </button>
        </div>
      )}

      {/* Form fields – shown after tree is completed or skipped */}
      {treeCompleted && (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formTitle}</Label>
              <Input required value={form.title} onChange={e => onChange(f => ({ ...f, title: e.target.value }))} placeholder={t.journal.formTitle} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formDate}</Label>
              <Input type="date" value={form.entry_date} onChange={e => onChange(f => ({ ...f, entry_date: e.target.value }))} className="rounded-2xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formWhatHappened}</Label>
            <Textarea value={form.event_description} onChange={e => onChange(f => ({ ...f, event_description: e.target.value }))} placeholder={t.journal.formWhatHappened} rows={3} className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formHowHeavy}: {t.impactLabels[form.impact_level - 1]}</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => onChange(f => ({ ...f, impact_level: n }))}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${form.impact_level === n ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                >{n}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formFeeling}</Label>
            <Input value={form.emotional_state} onChange={e => onChange(f => ({ ...f, emotional_state: e.target.value }))} placeholder={t.journal.formFeeling} className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formMyTruth}</Label>
            <Textarea value={form.self_anchor} onChange={e => onChange(f => ({ ...f, self_anchor: e.target.value }))} placeholder={t.journal.formMyTruth} rows={2} className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.journal.formNotes}</Label>
            <Textarea value={form.free_text} onChange={e => onChange(f => ({ ...f, free_text: e.target.value }))} placeholder={t.journal.formNotes} rows={4} className="rounded-2xl" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="rounded-2xl" disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? t.saving : isEditing ? t.journal.formUpdate : t.journal.formSave}
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={onClose}>{t.cancel}</Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default JournalForm;
