import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FDownload } from '@/components/icons/FreudIcons';

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

const Export = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const handleExport = async () => {
    if (!user) return;

    const [entriesRes, responsesRes, logsRes, conceptsRes] = await Promise.all([
      supabase.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date'),
      supabase.from('questionnaire_responses')
        .select('*, questionnaires(title, snomed_code), questionnaire_answers(question_id, answer, questionnaire_questions(question_text))')
        .eq('user_id', user.id),
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_en, bno_code'),
    ]);

    const conceptMap: Record<string, { concept_code: string; name_en: string; bno_code?: string }> = {};
    (conceptsRes.data ?? []).forEach((c: any) => {
      conceptMap[c.id] = { concept_code: c.concept_code, name_en: c.name_en, bno_code: c.bno_code };
    });

    // Build FHIR Observations with localized BNO displays
    const fhirObservations = (logsRes.data ?? []).map((log) => {
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
          display: t.export.bnoLabels[concept.bno_code] ?? concept.bno_code,
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

    const exportData = {
      disclaimer: t.export.disclaimer,
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

    const [logsRes, conceptsRes, subjectsRes] = await Promise.all([
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_hu, name_en, bno_code'),
      (supabase.from('subjects') as any).select('id, name, relationship_type').eq('user_id', user.id),
    ]);

    const logs = logsRes.data ?? [];
    const concepts = conceptsRes.data ?? [];
    const subjects = subjectsRes.data ?? [];

    if (logs.length === 0) {
      toast.error(t.export.noObservations);
      return;
    }

    const conceptMap: Record<string, any> = {};
    concepts.forEach((c: any) => { conceptMap[c.id] = c; });

    const subjectMap: Record<string, any> = {};
    subjects.forEach((s: any) => { subjectMap[s.id] = s; });

    const subjectGroups: Record<string, any> = {};

    for (const log of logs) {
      const subjectType = (log as any).subject_type ?? 'self';
      const subjectId = (log as any).subject_id;
      const subjectKey = subjectType === 'self' ? 'self' : (subjectId ?? 'unknown');
      
      if (!subjectGroups[subjectKey]) {
        let label = t.subjects.selfLabel;
        if (subjectType === 'relative' && subjectId && subjectMap[subjectId]) {
          const s = subjectMap[subjectId];
          const relLabel = t.subjects.relationshipTypes[s.relationship_type as keyof typeof t.subjects.relationshipTypes] ?? s.relationship_type;
          label = `${s.name} (${relLabel})`;
        } else if (subjectType === 'relative') {
          label = t.subjects.otherLabel;
        }
        subjectGroups[subjectKey] = { subject_label: label, subject_type: subjectType, bno_groups: {} };
      }

      const concept = conceptMap[log.concept_id];
      const bno = concept?.bno_code ?? 'unknown';
      if (!subjectGroups[subjectKey].bno_groups[bno]) {
        subjectGroups[subjectKey].bno_groups[bno] = { bno_code: bno, observations: [] };
      }
      subjectGroups[subjectKey].bno_groups[bno].observations.push({
        concept_localized: lang === 'hu' ? (concept?.name_hu ?? concept?.name_en) : concept?.name_en,
        intensity: log.intensity,
        logged_at: log.logged_at,
        context: log.context_modifier,
      });
    }

    const subjectSummaries = Object.values(subjectGroups).map((sg: any) => ({
      subject_label: sg.subject_label,
      subject_type: sg.subject_type,
      bno_summary: Object.values(sg.bno_groups).map((group: any) => {
        const intensities = group.observations.map((o: any) => o.intensity);
        const dates = group.observations.map((o: any) => o.logged_at).sort();
        return {
          bno_code: group.bno_code,
          bno_label_localized: t.export.bnoLabels[group.bno_code] ?? group.bno_code,
          observation_count: group.observations.length,
          avg_intensity: Math.round((intensities.reduce((a: any, b: any) => a + b, 0) / intensities.length) * 100) / 100,
          date_range: { from: dates[0], to: dates[dates.length - 1] },
          observations: group.observations,
        };
      }),
    }));

    const exportData = {
      disclaimer: t.export.disclaimer,
      export_type: 'therapist_summary',
      exported_at: new Date().toISOString(),
      subjects: subjectSummaries,
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
        <div className="surface-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{t.export.desc}</p>
          <Button onClick={handleExport} size="sm" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" /> {t.export.exportAll}
          </Button>
        </div>
        <div className="surface-card p-6 space-y-4">
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
