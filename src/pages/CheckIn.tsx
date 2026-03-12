import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import QuickPulse from '@/components/checkin/QuickPulse';
import UnifiedFeed from '@/components/checkin/UnifiedFeed';
import ObservationStepper from '@/components/observations/ObservationStepper';
import JournalForm from '@/components/journal/JournalForm';
import type { ObservationTreeResult } from '@/components/journal/ObservationTree';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FChevronDown } from '@/components/icons/FreudIcons';
// QuestionnaireFiller moved to dedicated /surveys page
import type { JournalFormData } from '@/types/journal';
import { emptyForm } from '@/types/journal';

const CheckIn = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [form, setForm] = useState<JournalFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const openJournalForm = () => {
    setForm({ ...emptyForm, entry_date: format(new Date(), 'yyyy-MM-dd') });
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

    // If an observation was selected via the guided tree, create linked observation_log
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
          <QuickPulse onPulseSaved={refresh} onGoDeeper={openJournalForm} />
        </div>

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

        {/* Unified feed */}
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            {t.checkIn.yourStoryTitle}
          </h2>
          <UnifiedFeed refreshKey={refreshKey} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;
