import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import QuickPulse from '@/components/checkin/QuickPulse';
import UnifiedFeed from '@/components/checkin/UnifiedFeed';
import FeedCalendar from '@/components/checkin/FeedCalendar';
import type { CalendarFeedItem } from '@/components/checkin/FeedCalendar';
import ObservationStepper from '@/components/observations/ObservationStepper';
import EntryReflectDialog from '@/components/checkin/EntryReflectDialog';
import JournalForm from '@/components/journal/JournalForm';
import type { ObservationTreeResult } from '@/components/journal/ObservationTree';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FChevronDown, FCalendar, FList } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import type { JournalFormData } from '@/types/journal';
import { emptyForm } from '@/types/journal';
import RecapBanner from '@/components/checkin/RecapBanner';

const CheckIn = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const feedRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [form, setForm] = useState<JournalFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarFeedItem[]>([]);
  const [reflectEntryId, setReflectEntryId] = useState<string | null>(null);
  const [daysSinceLastEntry, setDaysSinceLastEntry] = useState<number | null>(null);
  const [recapDismissed, setRecapDismissed] = useState(false);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);

  // Read ?date param on mount and scroll to feed
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setHighlightDate(dateParam);
      // Clear the param from URL to avoid stale state on refresh
      searchParams.delete('date');
      setSearchParams(searchParams, { replace: true });
      // Scroll to feed section after render
      setTimeout(() => {
        feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Check inactivity
  useEffect(() => {
    if (!user) return;
    const checkInactivity = async () => {
      const { data } = await supabase
        .from('journal_entries')
        .select('entry_date')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setDaysSinceLastEntry(differenceInDays(new Date(), parseISO(data[0].entry_date)));
      } else {
        setDaysSinceLastEntry(null);
      }
    };
    checkInactivity();
  }, [user, refreshKey]);

  // Callback from UnifiedFeed to share items for calendar view
  const handleItemsLoaded = useCallback((items: CalendarFeedItem[]) => {
    setCalendarItems(items);
  }, []);

  const handleEntryClick = useCallback((type: string, dbId: string) => {
    if (type === 'journal') setReflectEntryId(dbId);
  }, []);

  const openJournalForm = (date?: Date) => {
    setForm({ ...emptyForm, entry_date: format(date ?? new Date(), 'yyyy-MM-dd') });
    setShowJournalForm(true);
  };

  const handleJournalSubmit = async (_e: React.FormEvent, observation?: ObservationTreeResult) => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: form.title,
      entry_date: form.entry_date,
      event_description: form.event_description || null,
      impact_level: form.impact_level || null,
      emotional_state: form.emotional_state || null,
      free_text: form.free_text || null,
      self_anchor: form.self_anchor || null,
    };
    const { data: journalData, error } = await supabase
      .from('journal_entries')
      .insert(payload)
      .select('id')
      .single();

    if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }

    if (observation && journalData) {
      const { error: obsError } = await supabase.from('observation_logs').insert({
        user_id: user.id,
        concept_id: observation.conceptId,
        intensity: observation.intensity,
        journal_entry_id: journalData.id,
      } as any);
      if (obsError) { console.error('Observation link error:', obsError.message); }
    }

    toast.success(t.journal.entryLogged);
    setForm(emptyForm);
    setShowJournalForm(false);
    setSaving(false);
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.checkIn.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.checkIn.subtitle}</p>
        </div>

        {/* Quick Pulse */}
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
          <QuickPulse onMoodSelected={(mood) => {
            setForm({
              ...emptyForm,
              entry_date: format(new Date(), 'yyyy-MM-dd'),
              title: mood.emotional_state,
              impact_level: mood.impact_level,
              emotional_state: mood.emotional_state,
            });
            setShowJournalForm(true);
          }} />
        </div>

        {/* Recap banner */}
        {daysSinceLastEntry !== null && daysSinceLastEntry >= 14 && !recapDismissed && (
          <RecapBanner
            days={daysSinceLastEntry}
            onCatchUp={() => openJournalForm()}
            onDismiss={() => setRecapDismissed(true)}
          />
        )}

        {/* Full journal form with guided tree */}
        {showJournalForm && (
          <JournalForm
            form={form}
            onChange={setForm}
            onSubmit={handleJournalSubmit}
            onClose={() => setShowJournalForm(false)}
            saving={saving}
            isEditing={false}
            showObservationTree={true}
          />
        )}

        {/* Observation Stepper (collapsible) */}
        <Collapsible open={observationOpen} onOpenChange={setObservationOpen}>
          <CollapsibleTrigger className="w-full bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.checkIn.whatHappenedTitle}
            </h2>
            <FChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${observationOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-card/60 backdrop-blur border border-border border-t-0 rounded-b-3xl p-6 -mt-3">
            <ObservationStepper onLogged={refresh} />
          </CollapsibleContent>
        </Collapsible>

        {/* Feed with calendar toggle */}
        <div ref={feedRef} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.checkIn.yourStoryTitle}
            </h2>
            <div className="flex bg-muted rounded-2xl p-0.5">
              <Button size="sm" variant={viewMode === 'list' ? 'default' : 'ghost'} className="rounded-xl px-2.5 h-7" onClick={() => setViewMode('list')}>
                <FList className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={viewMode === 'calendar' ? 'default' : 'ghost'} className="rounded-xl px-2.5 h-7" onClick={() => setViewMode('calendar')}>
                <FCalendar className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <FeedCalendar
              items={calendarItems}
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              selectedDate={calendarSelectedDate}
              onSelectDate={setCalendarSelectedDate}
              onEntryClick={handleEntryClick}
              onCreateEntry={(date) => openJournalForm(date)}
            />
          ) : null}

          <div className={viewMode === 'calendar' ? 'hidden' : ''}>
            <UnifiedFeed refreshKey={refreshKey} onItemsLoaded={handleItemsLoaded} onEntryClick={handleEntryClick} highlightDate={highlightDate} />
          </div>
        </div>
      </div>

      <EntryReflectDialog
        entryId={reflectEntryId}
        onClose={() => setReflectEntryId(null)}
        onSaved={refresh}
      />
    </DashboardLayout>
  );
};

export default CheckIn;
