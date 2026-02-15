import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, Search, X, Save } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface JournalEntry {
  id: string;
  entry_date: string;
  title: string;
  event_description: string | null;
  impact_level: number | null;
  emotional_state: string | null;
  free_text: string | null;
  self_anchor: string | null;
  created_at: string;
}

const emptyForm = {
  title: '', entry_date: format(new Date(), 'yyyy-MM-dd'),
  event_description: '', impact_level: 3, emotional_state: '', free_text: '', self_anchor: '',
};

const Journal = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries').select('*').eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    setEntries(data ?? []);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesSearch = !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.event_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.free_text?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFrom = !dateFrom || e.entry_date >= dateFrom;
      const matchesTo = !dateTo || e.entry_date <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [entries, searchQuery, dateFrom, dateTo]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      entry_date: entry.entry_date,
      event_description: entry.event_description ?? '',
      impact_level: entry.impact_level ?? 3,
      emotional_state: entry.emotional_state ?? '',
      free_text: entry.free_text ?? '',
      self_anchor: (entry as any).self_anchor ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      title: form.title,
      entry_date: form.entry_date,
      event_description: form.event_description || null,
      impact_level: form.impact_level || null,
      emotional_state: form.emotional_state || null,
      free_text: form.free_text || null,
      self_anchor: form.self_anchor || null,
    };

    if (editingId) {
      const { error } = await supabase.from('journal_entries').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); } else { toast.success('Entry updated'); }
    } else {
      const { error } = await supabase.from('journal_entries').insert({ user_id: user.id, ...payload });
      if (error) { toast.error(error.message); } else { toast.success('Entry logged'); }
    }

    setForm(emptyForm); setShowForm(false); setEditingId(null); fetchEntries();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Entry deleted'); fetchEntries();
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
          <Button size="sm" className="rounded-2xl" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Entry
          </Button>
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search entries..." className="pl-9 rounded-2xl" />
          </div>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 rounded-2xl" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 rounded-2xl" placeholder="To" />
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {editingId ? 'Edit Journal Entry' : 'New Journal Entry'}
              </h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
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
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Self-Anchor</Label>
              <Textarea value={form.self_anchor} onChange={e => setForm(f => ({ ...f, self_anchor: e.target.value }))} placeholder="A grounding statement of your personal validity. e.g., 'I know what I experienced is real.'" rows={2} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Additional Notes</Label>
              <Textarea value={form.free_text} onChange={e => setForm(f => ({ ...f, free_text: e.target.value }))} placeholder="Any additional thoughts or context." rows={4} className="rounded-2xl" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="rounded-2xl" disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Save Entry'}
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">{entries.length === 0 ? 'No journal entries yet. Start by logging your first observation.' : 'No entries match your search.'}</p>
            </div>
          ) : filteredEntries.map(entry => (
            <div key={entry.id} className="bg-card/60 backdrop-blur border border-border rounded-3xl overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="flex-1 flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
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
                <div className="flex gap-1 pr-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{entry.title}". This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {expandedId === entry.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
                  {entry.event_description && <div><span className="text-xs font-semibold uppercase text-muted-foreground">What happened:</span><p className="text-sm mt-1 leading-relaxed">{entry.event_description}</p></div>}
                  {entry.emotional_state && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Feeling:</span><p className="text-sm mt-1">{entry.emotional_state}</p></div>}
                  {entry.self_anchor && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Self-Anchor:</span><p className="text-sm mt-1 italic leading-relaxed">{entry.self_anchor}</p></div>}
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
