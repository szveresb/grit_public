import { useEffect, useState, useMemo, useCallback } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { friendlyDbError } from '@/lib/db-error';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FPlus, FSearch, FLoader, FTrendingUp, FCalendar, FList } from '@/components/icons/FreudIcons';
import { readSSEStream } from '@/lib/sse-stream';
import type { JournalEntry, JournalFormData } from '@/types/journal';
import { emptyForm } from '@/types/journal';
import JournalForm from '@/components/journal/JournalForm';
import JournalEntryCard from '@/components/journal/JournalEntryCard';
import PatternSummary from '@/components/journal/PatternSummary';
import JournalCalendar from '@/components/journal/JournalCalendar';
import RecapBanner from '@/components/checkin/RecapBanner';

const REFLECT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-reflect`;
const PATTERNS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-patterns`;

const Journal = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<JournalFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [reflectingId, setReflectingId] = useState<string | null>(null);
  const [patternSummary, setPatternSummary] = useState('');
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(false);

  const daysSinceLastEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return differenceInDays(new Date(), parseISO(entries[0].entry_date));
  }, [entries]);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries').select('*').eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    setEntries(data ?? []);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

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
    setForm({ ...emptyForm, entry_date: format(new Date(), 'yyyy-MM-dd') });
    setShowForm(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title, entry_date: entry.entry_date,
      event_description: entry.event_description ?? '', impact_level: entry.impact_level ?? 3,
      emotional_state: entry.emotional_state ?? '', free_text: entry.free_text ?? '',
      self_anchor: entry.self_anchor ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      title: form.title, entry_date: form.entry_date,
      event_description: form.event_description || null, impact_level: form.impact_level || null,
      emotional_state: form.emotional_state || null, free_text: form.free_text || null,
      self_anchor: form.self_anchor || null,
    };
    if (editingId) {
      const { error } = await supabase.from('journal_entries').update(payload).eq('id', editingId);
      if (error) { toast.error(friendlyDbError(error)); } else { toast.success(t.journal.entryUpdated); }
    } else {
      const { error } = await supabase.from('journal_entries').insert({ user_id: user.id, ...payload });
      if (error) { toast.error(friendlyDbError(error)); } else { toast.success(t.journal.entryLogged); }
    }
    setForm(emptyForm); setShowForm(false); setEditingId(null); fetchEntries(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.journal.entryDeleted); fetchEntries();
  };

  const handleReflect = async (entry: JournalEntry) => {
    if (reflectingId) return;
    setReflectingId(entry.id);
    setReflections(prev => ({ ...prev, [entry.id]: '' }));
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) { toast.error('Please sign in to use reflections'); setReflectingId(null); return; }
      const resp = await fetch(REFLECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
        body: JSON.stringify({ entry }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: 'Reflection unavailable' })); toast.error(err.error || 'Failed'); setReflectingId(null); return; }
      let accumulated = '';
      await readSSEStream(resp, (content) => { accumulated += content; setReflections(prev => ({ ...prev, [entry.id]: accumulated })); });
    } catch (e) { console.error('Reflect error:', e); toast.error('Failed to generate reflection'); }
    setReflectingId(null);
  };

  const saveReflection = async (entryId: string) => {
    const text = reflections[entryId];
    if (!text) return;
    const { error } = await supabase.from('journal_entries').update({ reflection: text }).eq('id', entryId);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.journal.reflectionSaved); fetchEntries();
  };

  const clearReflection = async (entryId: string) => {
    const { error } = await supabase.from('journal_entries').update({ reflection: null }).eq('id', entryId);
    if (error) { toast.error(friendlyDbError(error)); return; }
    setReflections(prev => { const n = { ...prev }; delete n[entryId]; return n; });
    toast.success(t.journal.reflectionRemoved); fetchEntries();
  };

  const handlePatternAnalysis = async () => {
    if (analyzingPatterns || entries.length < 2) return;
    setAnalyzingPatterns(true); setPatternSummary('');
    try {
      const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) { toast.error('Please sign in to analyze patterns'); setAnalyzingPatterns(false); return; }
      const resp = await fetch(PATTERNS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
        body: JSON.stringify({ entries: sorted }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: 'Pattern analysis unavailable' })); toast.error(err.error || 'Failed'); setAnalyzingPatterns(false); return; }
      let accumulated = '';
      await readSSEStream(resp, (content) => { accumulated += content; setPatternSummary(accumulated); });
    } catch (e) { console.error('Pattern analysis error:', e); toast.error('Failed to analyze patterns'); }
    setAnalyzingPatterns(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.journal.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.journal.subtitle}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="flex bg-muted rounded-2xl p-0.5">
              <Button size="sm" variant={viewMode === 'list' ? 'default' : 'ghost'} className="rounded-xl px-2.5" onClick={() => setViewMode('list')}>
                <FList className="h-4 w-4" />
              </Button>
              <Button size="sm" variant={viewMode === 'calendar' ? 'default' : 'ghost'} className="rounded-xl px-2.5" onClick={() => setViewMode('calendar')}>
                <FCalendar className="h-4 w-4" />
              </Button>
            </div>
            {entries.length >= 2 && (
              <Button size="sm" variant="outline" className="rounded-2xl gap-1.5" onClick={handlePatternAnalysis} disabled={analyzingPatterns}>
                {analyzingPatterns ? <FLoader className="h-4 w-4 animate-spin" /> : <FTrendingUp className="h-4 w-4" />}
                <span className="hidden sm:inline">{t.journal.patterns}</span>
              </Button>
            )}
            <Button size="sm" className="rounded-2xl" onClick={openCreate}>
              <FPlus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{t.journal.newEntry}</span>
            </Button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.journal.searchEntries} className="pl-9 rounded-2xl" />
            </div>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 sm:w-36 rounded-2xl" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 sm:w-36 rounded-2xl" />
            </div>
          </div>
        )}

        <PatternSummary summary={patternSummary} isAnalyzing={analyzingPatterns} onDismiss={() => setPatternSummary('')} />

        {daysSinceLastEntry !== null && daysSinceLastEntry >= 14 && !recapDismissed && (
          <RecapBanner days={daysSinceLastEntry} onCatchUp={openCreate} onDismiss={() => setRecapDismissed(true)} />
        )}

        {showForm && (
          <JournalForm form={form} onChange={setForm} onSubmit={handleSubmit} onClose={() => setShowForm(false)} saving={saving} isEditing={!!editingId} />
        )}

        {viewMode === 'calendar' ? (
          <JournalCalendar
            entries={entries}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
          />
        ) : (
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
                <p className="text-sm text-muted-foreground">{entries.length === 0 ? t.journal.noEntries : t.journal.noMatch}</p>
              </div>
            ) : filteredEntries.map(entry => (
              <JournalEntryCard
                key={entry.id} entry={entry}
                isExpanded={expandedId === entry.id}
                onToggleExpand={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                onEdit={() => openEdit(entry)} onDelete={() => handleDelete(entry.id)}
                streamedReflection={reflections[entry.id]} isReflecting={reflectingId === entry.id}
                reflectDisabled={reflectingId !== null} onReflect={() => handleReflect(entry)}
                onSaveReflection={() => saveReflection(entry.id)}
                onDismissReflection={() => setReflections(prev => { const n = { ...prev }; delete n[entry.id]; return n; })}
                onClearSavedReflection={() => clearReflection(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Journal;
