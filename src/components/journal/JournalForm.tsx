import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';
import type { JournalFormData } from '@/types/journal';

const impactLabels = ['Minimal', 'Low', 'Moderate', 'High', 'Severe'];

interface JournalFormProps {
  form: JournalFormData;
  onChange: (updater: (prev: JournalFormData) => JournalFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  saving: boolean;
  isEditing: boolean;
}

const JournalForm = ({ form, onChange, onSubmit, onClose, saving, isEditing }: JournalFormProps) => {
  return (
    <form onSubmit={onSubmit} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</Label>
          <Input required value={form.title} onChange={e => onChange(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary" className="rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Date</Label>
          <Input type="date" value={form.entry_date} onChange={e => onChange(f => ({ ...f, entry_date: e.target.value }))} className="rounded-2xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What happened?</Label>
        <Textarea value={form.event_description} onChange={e => onChange(f => ({ ...f, event_description: e.target.value }))} placeholder="Describe factually what occurred." rows={3} className="rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Impact Level: {impactLabels[form.impact_level - 1]}</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => onChange(f => ({ ...f, impact_level: n }))}
              className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${form.impact_level === n ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'}`}
            >{n}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How are you feeling?</Label>
        <Input value={form.emotional_state} onChange={e => onChange(f => ({ ...f, emotional_state: e.target.value }))} placeholder="e.g., anxious, calm, confused" className="rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Self-Anchor</Label>
        <Textarea value={form.self_anchor} onChange={e => onChange(f => ({ ...f, self_anchor: e.target.value }))} placeholder="A grounding statement of your personal validity. e.g., 'I know what I experienced is real.'" rows={2} className="rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Additional Notes</Label>
        <Textarea value={form.free_text} onChange={e => onChange(f => ({ ...f, free_text: e.target.value }))} placeholder="Any additional thoughts or context." rows={4} className="rounded-2xl" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="rounded-2xl" disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : isEditing ? 'Update' : 'Save Entry'}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

export default JournalForm;
