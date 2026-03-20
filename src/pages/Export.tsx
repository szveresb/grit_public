import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FDownload } from '@/components/icons/FreudIcons';

const BNO_LABELS_HU: Record<string, string> = {
  'Z63.0': 'Házastárssal vagy partnerrel kapcsolatos problémák',
  'Z63.1': 'Szülőkkel és anyóssal/apóssal kapcsolatos problémák',
  'Z63.5': 'Családi különélés és válás',
  'Z60.4': 'Társadalmi kirekesztés és visszautasítás',
  'F43.2': 'Alkalmazkodási zavarok',
  'F41.1': 'Generalizált szorongásos zavar',
  'F32.9': 'Depressziós epizód m.n.o.',
};

const BNO_LABELS_EN: Record<string, string> = {
  'Z63.0': 'Problems in relationship with spouse or partner',
  'Z63.1': 'Problems with parents and in-laws',
  'Z63.5': 'Family disruption by separation and divorce',
  'Z60.4': 'Social exclusion and rejection',
  'F43.2': 'Adjustment disorders',
  'F41.1': 'Generalized anxiety disorder',
  'F32.9': 'Depressive episode, unspecified',
};

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
  conceptMap: Record<string, { concept_code: string; name_en: string; bno_code?: string }>
): FhirObservation[] {
  return logs.map((log) => {
    const concept = conceptMap[log.concept_id];
    const coding: { system: string; code: string; display: string }[] = [
      {
        system: 'http://snomed.info/sct',
        code: concept?.concept_code ?? 'unknown',
        display: concept?.name_en ?? 'Unknown',
      },
    ];
    if (concept?.bno_code) {
      coding.push({
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: concept.bno_code,
        display: BNO_LABELS_EN[concept.bno_code] ?? concept.bno_code,
      });
    }
    const obs: FhirObservation = {
      resourceType: 'Observation',
      status: log.status ?? 'final',
      subject: { reference: 'Patient/anonymous' },
      effectiveDateTime: log.logged_at,
      code: { coding },
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

    const [entriesRes, responsesRes, logsRes, conceptsRes, questionnairesRes] = await Promise.all([
      supabase.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date'),
      supabase.from('questionnaire_responses')
        .select('*, questionnaires(title, snomed_code), questionnaire_answers(question_id, answer, questionnaire_questions(question_text))')
        .eq('user_id', user.id),
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_en, bno_code'),
      supabase.from('questionnaires').select('id, title, snomed_code'),
    ]);

    const conceptMap: Record<string, { concept_code: string; name_en: string; bno_code?: string }> = {};
    (conceptsRes.data ?? []).forEach((c: any) => {
      conceptMap[c.id] = { concept_code: c.concept_code, name_en: c.name_en, bno_code: c.bno_code };
    });

    const fhirObservations = buildPersonalFhirObservations(logsRes.data ?? [], conceptMap);

    // Build FHIR QuestionnaireResponse resources from questionnaire responses
    const fhirQuestionnaireResponses = (responsesRes.data ?? []).map((resp: any) => ({
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      authored: resp.completed_at,
      subject: { reference: 'Patient/anonymous' },
      questionnaire: resp.questionnaires?.snomed_code
        ? `http://snomed.info/sct|${resp.questionnaires.snomed_code}`
        : resp.questionnaires?.title ?? 'Unknown',
      item: (resp.questionnaire_answers ?? []).map((a: any) => ({
        linkId: a.question_id,
        text: a.questionnaire_questions?.question_text ?? '',
        answer: [{ valueString: typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer) }],
      })),
      ...(resp.total_score != null ? { extension: [{ url: 'http://grit.hu/fhir/total-score', valueInteger: resp.total_score }] } : {}),
    }));

    const exportData = {
      disclaimer: {
        en: 'Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment.',
        hu: 'Nem diagnosztikai adat: A jelentés felhasználó által rögzített megfigyeléseket tartalmaz, szabványos orvosi terminológiára leképezve. Nem minősül klinikai értékelésnek.',
      },
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

  const handleTherapistExport = async () => {
    if (!user) return;

    const [logsRes, conceptsRes] = await Promise.all([
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_hu, name_en, bno_code'),
    ]);

    const logs = logsRes.data ?? [];
    const concepts = conceptsRes.data ?? [];

    if (logs.length === 0) {
      toast.error(t.export.noObservations);
      return;
    }

    const conceptMap: Record<string, any> = {};
    concepts.forEach((c: any) => { conceptMap[c.id] = c; });

    const bnoGroups: Record<string, {
      bno_code: string;
      observations: { concept_hu: string; intensity: number; logged_at: string; context: string | null }[];
    }> = {};

    for (const log of logs) {
      const concept = conceptMap[log.concept_id];
      const bno = concept?.bno_code ?? 'unknown';
      if (!bnoGroups[bno]) {
        bnoGroups[bno] = { bno_code: bno, observations: [] };
      }
      bnoGroups[bno].observations.push({
        concept_hu: concept?.name_hu ?? concept?.name_en ?? 'Unknown',
        intensity: log.intensity,
        logged_at: log.logged_at,
        context: log.context_modifier,
      });
    }

    const bnoSummary = Object.values(bnoGroups).map((group) => {
      const intensities = group.observations.map((o) => o.intensity);
      const dates = group.observations.map((o) => o.logged_at).sort();
      return {
        bno_code: group.bno_code,
        bno_label_hu: BNO_LABELS_HU[group.bno_code] ?? group.bno_code,
        observation_count: group.observations.length,
        avg_intensity: Math.round((intensities.reduce((a, b) => a + b, 0) / intensities.length) * 100) / 100,
        date_range: { from: dates[0], to: dates[dates.length - 1] },
        observations: group.observations,
      };
    });

    const exportData = {
      disclaimer: {
        en: 'Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment.',
        hu: 'Nem diagnosztikai adat: A jelentés felhasználó által rögzített megfigyeléseket tartalmaz, szabványos orvosi terminológiára leképezve. Nem minősül klinikai értékelésnek.',
      },
      export_type: 'therapist_summary',
      exported_at: new Date().toISOString(),
      bno_summary: bnoSummary,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grithu-therapist-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.profile.dataExported);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.export.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.export.subtitle}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{t.export.desc}</p>
          <Button onClick={handleExport} size="sm" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" /> {t.export.exportAll}
          </Button>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-sm md:text-base font-semibold text-foreground">{t.export.therapistTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.export.therapistDesc}</p>
          <Button onClick={handleTherapistExport} size="sm" variant="secondary" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" /> {t.export.therapistExport}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Export;
