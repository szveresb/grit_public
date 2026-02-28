import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

interface FhirObservation {
  resourceType: 'Observation';
  status: string;
  subject: { reference: string };
  effectiveDateTime: string;
  code: {
    coding: { system: string; code: string; display: string }[];
  };
  valueInteger: number;
  component?: { code: { text: string }; valueString: string }[];
}

function buildPersonalFhirObservations(
  logs: any[],
  conceptMap: Record<string, { concept_code: string; name_en: string }>
): FhirObservation[] {
  return logs.map((log) => {
    const concept = conceptMap[log.concept_id];
    const obs: FhirObservation = {
      resourceType: 'Observation',
      status: log.status ?? 'final',
      subject: { reference: 'Patient/anonymous' },
      effectiveDateTime: log.logged_at,
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: concept?.concept_code ?? 'unknown',
          display: concept?.name_en ?? 'Unknown',
        }],
      },
      valueInteger: log.intensity,
    };
    const components: { code: { text: string }; valueString: string }[] = [];
    if (log.frequency) components.push({ code: { text: 'frequency' }, valueString: log.frequency });
    if (log.context_modifier) components.push({ code: { text: 'context' }, valueString: log.context_modifier });
    if (components.length > 0) obs.component = components;
    return obs;
  });
}

const Export = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleExport = async () => {
    if (!user) return;

    const [entriesRes, responsesRes, logsRes, conceptsRes] = await Promise.all([
      supabase.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date'),
      supabase.from('questionnaire_responses')
        .select('*, questionnaires(title), questionnaire_answers(question_id, answer, questionnaire_questions(question_text))')
        .eq('user_id', user.id),
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_en'),
    ]);

    const conceptMap: Record<string, { concept_code: string; name_en: string }> = {};
    (conceptsRes.data ?? []).forEach((c: any) => {
      conceptMap[c.id] = { concept_code: c.concept_code, name_en: c.name_en };
    });

    const fhirObservations = buildPersonalFhirObservations(logsRes.data ?? [], conceptMap);

    const exportData = {
      exported_at: new Date().toISOString(),
      journal_entries: entriesRes.data ?? [],
      questionnaire_responses: responsesRes.data ?? [],
      observation_logs_fhir: fhirObservations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grithu-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.profile.dataExported);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.export.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.export.subtitle}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{t.export.desc}</p>
          <Button onClick={handleExport} size="sm" className="rounded-2xl">
            <Download className="h-4 w-4 mr-1.5" /> {t.export.exportAll}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Export;
