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
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    setEntries(data ?? []);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('journal_entries').insert({
      user_id: user.id,
      ...form,
      impact_level: form.impact_level || null,
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
            <h1 className="text-lg font-medium tracking-tight text-foreground">Journal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Structured self-report and free-text documentation.</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Entry
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border border-border rounded-sm p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">New Journal Entry</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-widest">Title</Label>
                <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-widest">Date</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest">Event Description</Label>
              <Textarea value={form.event_description} onChange={e => setForm(f => ({ ...f, event_description: e.target.value }))} placeholder="What happened? Describe factually." rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest">Impact Level: {impactLabels[form.impact_level - 1]}</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => setForm(f => ({ ...f, impact_level: n }))}
                    className={`h-9 w-9 rounded-sm border text-sm font-medium transition-colors ${form.impact_level === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}
                  >{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest">Emotional State</Label>
              <Input value={form.emotional_state} onChange={e => setForm(f => ({ ...f, emotional_state: e.target.value }))} placeholder="e.g., anxious, calm, confused" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest">Free Text / Notes</Label>
              <Textarea value={form.free_text} onChange={e => setForm(f => ({ ...f, free_text: e.target.value }))} placeholder="Any additional thoughts or context." rows={4} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="border border-border rounded-sm p-6">
              <p className="text-sm text-muted-foreground">No journal entries yet. Start by logging your first observation.</p>
            </div>
          ) : entries.map(entry => (
            <div key={entry.id} className="border border-border rounded-sm">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium">{entry.title}</span>
                  <span className="ml-3 text-xs text-muted-foreground">{format(new Date(entry.entry_date), 'MMM d, yyyy')}</span>
                  {entry.impact_level && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-sm border ${entry.impact_level >= 4 ? 'border-destructive text-destructive' : 'border-border text-muted-foreground'}`}>
                      Impact: {entry.impact_level}/5
                    </span>
                  )}
                </div>
                {expandedId === entry.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedId === entry.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {entry.event_description && <div><span className="text-xs font-mono uppercase text-muted-foreground">Event:</span><p className="text-sm mt-1">{entry.event_description}</p></div>}
                  {entry.emotional_state && <div><span className="text-xs font-mono uppercase text-muted-foreground">Emotional State:</span><p className="text-sm mt-1">{entry.emotional_state}</p></div>}
                  {entry.free_text && <div><span className="text-xs font-mono uppercase text-muted-foreground">Notes:</span><p className="text-sm mt-1 whitespace-pre-wrap">{entry.free_text}</p></div>}
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
