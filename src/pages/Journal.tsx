import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface JournalEntry {
  id: string;
  entry_date: string;
  title: string;
  event_description: string | null;
  impact_level: number | null;
  emotional_state: string | null;
  free_text: string | null;
  created_at: string;
}

const Journal = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', entry_date: format(new Date(), 'yyyy-MM-dd'),
    event_description: '', impact_level: 3, emotional_state: '', free_text: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries').select('*').eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    setEntries(data ?? []);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('journal_entries').insert({
      user_id: user.id, ...form, impact_level: form.impact_level || null,
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success('Entry logged');
      setForm({ title: '', entry_date: format(new Date(), 'yyyy-MM-dd'), event_description: '', impact_level: 3, emotional_state: '', free_text: '' });
      setShowForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const impactLabels = ['Minimal', 'Low', 'Moderate', 'High', 'Severe'];

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Journal</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Structured self-report and free-text documentation.</p>
          </div>
          <Button size="sm" className="rounded-2xl" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Entry
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">New Journal Entry</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</Label>
                <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary" className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Date</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} className="rounded-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What happened?</Label>
              <Textarea value={form.event_description} onChange={e => setForm(f => ({ ...f, event_description: e.target.value }))} placeholder="Describe factually what occurred." rows={3} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Impact Level: {impactLabels[form.impact_level - 1]}</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({ ...f, impact_level: n }))}
                    className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${form.impact_level === n ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How are you feeling?</Label>
              <Input value={form.emotional_state} onChange={e => setForm(f => ({ ...f, emotional_state: e.target.value }))} placeholder="e.g., anxious, calm, confused" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Additional Notes</Label>
              <Textarea value={form.free_text} onChange={e => setForm(f => ({ ...f, free_text: e.target.value }))} placeholder="Any additional thoughts or context." rows={4} className="rounded-2xl" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="rounded-2xl" disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</Button>
              <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">No journal entries yet. Start by logging your first observation.</p>
            </div>
          ) : entries.map(entry => (
            <div key={entry.id} className="bg-card/60 backdrop-blur border border-border rounded-3xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{entry.title}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(entry.entry_date), 'MMM d, yyyy')}</span>
                  {entry.impact_level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${entry.impact_level >= 4 ? 'border-destructive/40 text-destructive bg-destructive/10' : 'border-border text-muted-foreground'}`}>
                      Impact: {entry.impact_level}/5
                    </span>
                  )}
                </div>
                {expandedId === entry.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedId === entry.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
                  {entry.event_description && <div><span className="text-xs font-semibold uppercase text-muted-foreground">What happened:</span><p className="text-sm mt-1 leading-relaxed">{entry.event_description}</p></div>}
                  {entry.emotional_state && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Feeling:</span><p className="text-sm mt-1">{entry.emotional_state}</p></div>}
                  {entry.free_text && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Notes:</span><p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{entry.free_text}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Journal;
