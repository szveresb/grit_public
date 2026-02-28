import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import QuickPulse from '@/components/checkin/QuickPulse';
import UnifiedFeed from '@/components/checkin/UnifiedFeed';
import ObservationStepper from '@/components/observations/ObservationStepper';
import JournalForm from '@/components/journal/JournalForm';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
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

  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const { error } = await supabase.from('journal_entries').insert(payload);
    if (error) { toast.error(error.message); } else { toast.success(t.journal.entryLogged); }
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

        {/* Full journal form (shown when user wants to go deeper) */}
        {showJournalForm && (
          <JournalForm
            form={form}
            onChange={setForm}
            onSubmit={handleJournalSubmit}
            onClose={() => setShowJournalForm(false)}
            saving={saving}
            isEditing={false}
          />
        )}

        {/* Observation Stepper (collapsible) */}
        <Collapsible open={observationOpen} onOpenChange={setObservationOpen}>
          <CollapsibleTrigger className="w-full bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.checkIn.whatHappenedTitle}
            </h2>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${observationOpen ? 'rotate-180' : ''}`} />
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
