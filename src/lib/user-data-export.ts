import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { fetchConceptResolver } from '@/lib/observationResolver';

export interface ExportMetadata {
  exported_at: string;
  schema_version: string;
  included_sections: string[];
  derived_sections: string[];
}

export interface FhirObservation {
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

export type ExportQuestionnaireResponse = Database['public']['Tables']['questionnaire_responses']['Row'] & {
  questionnaires: {
    title: string;
    title_localized: Database['public']['Tables']['questionnaires']['Row']['title_localized'];
    snomed_code: string | null;
  } | null;
  questionnaire_answers: (Database['public']['Tables']['questionnaire_answers']['Row'] & {
    questionnaire_questions: {
      question_text: string;
      question_text_localized: Database['public']['Tables']['questionnaire_questions']['Row']['question_text_localized'];
    } | null;
  })[];
};

export type ExportObservationLog = Database['public']['Tables']['observation_logs']['Row'] & {
  observation_concepts: {
    concept_code: string;
    name_hu: string;
    name_en: string;
    bno_code: string | null;
  } | null;
  original_concept?: {
    id: string;
    code: string;
    name_hu: string;
    name_en: string;
  } | null;
  canonical_concept?: {
    id: string;
    key: string;
    name_hu: string;
    name_en: string;
    category_id: string;
    category_key: string;
    category_name_hu: string;
    category_name_en: string;
    valence: 'positive' | 'negative';
  } | null;
};

export type ReconciledMoodPulse = Database['public']['Tables']['mood_pulses']['Row'] & {
  reconciled_from_n_rows?: number;
};

export interface UserDataExport {
  metadata: ExportMetadata;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  journal_entries: Database['public']['Tables']['journal_entries']['Row'][];
  questionnaire_responses: ExportQuestionnaireResponse[];
  mood_pulses: ReconciledMoodPulse[];
  observation_logs: ExportObservationLog[];
  subjects: Database['public']['Tables']['subjects']['Row'][];
  user_consents: Database['public']['Tables']['user_consents']['Row'][];
  consent_history_logs: Database['public']['Tables']['consent_history_logs']['Row'][];
  user_feedback: Database['public']['Tables']['user_feedback']['Row'][];
  observation_logs_fhir?: FhirObservation[];
}

export interface TherapistBnoObservation {
  concept_localized: string;
  intensity: number;
  logged_at: string;
  context: string | null;
}

export interface TherapistBnoSummary {
  bno_code: string;
  bno_label_localized: string;
  observation_count: number;
  avg_intensity: number;
  date_range: { from: string; to: string };
  observations: TherapistBnoObservation[];
}

export interface TherapistSubjectSummary {
  subject_label: string;
  subject_type: string;
  bno_summary: TherapistBnoSummary[];
}

export interface TherapistExportSummary {
  disclaimer: string;
  export_type: 'therapist_summary';
  exported_at: string;
  subjects: TherapistSubjectSummary[];
}

export interface HelperSubjectGroup {
  subject_label: string;
  subject_type: string;
  bno_groups: Record<string, {
    bno_code: string;
    observations: TherapistBnoObservation[];
  }>;
}

export interface TherapistExportData {
  observation_logs: ExportObservationLog[];
  subjects: Database['public']['Tables']['subjects']['Row'][];
}

type DBQuestionnaireAnswer = Database['public']['Tables']['questionnaire_answers']['Row'] & {
  questionnaire_questions: {
    question_text: string;
    question_text_localized: Database['public']['Tables']['questionnaire_questions']['Row']['question_text_localized'];
  } | null;
};

type DBQuestionnaireResponse = Database['public']['Tables']['questionnaire_responses']['Row'] & {
  questionnaires: {
    title: string;
    title_localized: Database['public']['Tables']['questionnaires']['Row']['title_localized'];
    snomed_code: string | null;
  } | null;
  questionnaire_answers: DBQuestionnaireAnswer[];
};

export async function buildUserDataExport(
  userId: string,
  bnoLabels?: Record<string, string>
): Promise<UserDataExport> {
  const [
    profileRes,
    entriesRes,
    responsesRes,
    pulsesRes,
    logsRes,
    subjectsRes,
    consentsRes,
    historyRes,
    feedbackRes
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('entry_date'),
    supabase.from('questionnaire_responses')
      .select('*, questionnaires(title, title_localized, snomed_code), questionnaire_answers(*, questionnaire_questions(question_text, question_text_localized))')
      .eq('user_id', userId),
    supabase.from('mood_pulses').select('*').eq('user_id', userId).order('entry_date'),
    supabase.from('observation_logs')
      .select('*, observation_concepts(concept_code, name_hu, name_en, bno_code)')
      .eq('user_id', userId)
      .order('logged_at'),
    supabase.from('subjects').select('*').eq('user_id', userId),
    supabase.from('user_consents').select('*').eq('user_id', userId),
    supabase.from('consent_history_logs').select('*').eq('user_id', userId).order('changed_at'),
    supabase.from('user_feedback').select('*').eq('user_id', userId).order('created_at'),
  ]);

  const errors = [
    profileRes.error,
    entriesRes.error,
    responsesRes.error,
    pulsesRes.error,
    logsRes.error,
    subjectsRes.error,
    consentsRes.error,
    historyRes.error,
    feedbackRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    const errorDetails = errors.map(e => e?.message).join('; ');
    throw new Error(`Export failed due to database query errors: ${errorDetails}`);
  }

  // Reconcile legacy duplicates for mood pulses (Mood Pulse Daily-Fact Hardening)
  const rawPulses = pulsesRes.data ?? [];
  const groupedPulses: Record<string, { canonical: Database['public']['Tables']['mood_pulses']['Row']; rows: Database['public']['Tables']['mood_pulses']['Row'][] }> = {};
  
  rawPulses.forEach((p) => {
    const subjectKey = p.subject_type === 'self' ? 'self' : (p.subject_id ?? 'unknown');
    const key = `${p.entry_date}_${p.subject_type}_${subjectKey}`;
    if (!groupedPulses[key]) {
      groupedPulses[key] = { canonical: p, rows: [p] };
    } else {
      groupedPulses[key].rows.push(p);
      const currentCanonical = groupedPulses[key].canonical;
      const currentCreated = currentCanonical.created_at ? new Date(currentCanonical.created_at).getTime() : 0;
      const pCreated = p.created_at ? new Date(p.created_at).getTime() : 0;
      if (pCreated > currentCreated || (pCreated === currentCreated && p.id > currentCanonical.id)) {
        groupedPulses[key].canonical = p;
      }
    }
  });

  const reconciledPulses = Object.values(groupedPulses).map((g) => {
    const canonical: ReconciledMoodPulse = { ...g.canonical };
    if (g.rows.length > 1) {
      canonical.reconciled_from_n_rows = g.rows.length;
    }
    return canonical;
  });

  // Build FHIR Observations from observation logs (which now have inline observation_concepts)
  const resolver = await fetchConceptResolver(supabase);
  
  const rawLogs = (logsRes.data as any[] | null ?? []).map((log) => {
    const concept = log.observation_concepts;
    const resolved = resolver.resolve(log.concept_id);

    const original_concept = concept ? {
      id: log.concept_id,
      code: concept.concept_code,
      name_hu: concept.name_hu,
      name_en: concept.name_en,
    } : null;

    const canonical_concept = resolved ? {
      id: resolved.resolvedId,
      key: resolved.resolvedCode,
      name_hu: resolved.resolvedNameHu,
      name_en: resolved.resolvedNameEn,
      category_id: resolved.category.id,
      category_key: resolved.category.category_key,
      category_name_hu: resolved.category.name_hu,
      category_name_en: resolved.category.name_en,
      valence: resolved.resolvedValence || 'negative',
    } : null;

    return {
      ...log,
      original_concept,
      canonical_concept,
    } as ExportObservationLog;
  });

  const fhirObservations: FhirObservation[] = rawLogs.map((log) => {
    const concept = log.observation_concepts;
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
        display: bnoLabels?.[concept.bno_code] ?? concept.bno_code,
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

  const metadata: ExportMetadata = {
    exported_at: new Date().toISOString(),
    schema_version: '1.0',
    included_sections: [
      'profile',
      'journal_entries',
      'questionnaire_responses',
      'mood_pulses',
      'observation_logs',
      'subjects',
      'user_consents',
      'consent_history_logs',
      'user_feedback',
    ],
    derived_sections: [
      'observation_logs_fhir',
    ],
  };

  const mappedResponses = (responsesRes.data as DBQuestionnaireResponse[] | null ?? []).map((response) => {
    return {
      ...response,
      questionnaires: response.questionnaires || null,
      questionnaire_answers: (response.questionnaire_answers || []).map((ans) => ({
        ...ans,
        questionnaire_questions: ans.questionnaire_questions || null,
      })),
    } as ExportQuestionnaireResponse;
  });

  return {
    metadata,
    profile: profileRes.data || null,
    journal_entries: entriesRes.data ?? [],
    questionnaire_responses: mappedResponses,
    mood_pulses: reconciledPulses,
    observation_logs: rawLogs,
    subjects: subjectsRes.data ?? [],
    user_consents: consentsRes.data ?? [],
    consent_history_logs: historyRes.data ?? [],
    user_feedback: feedbackRes.data ?? [],
    observation_logs_fhir: fhirObservations,
  };
}

export async function buildTherapistExportData(userId: string): Promise<TherapistExportData> {
  const [logsRes, subjectsRes] = await Promise.all([
    supabase.from('observation_logs')
      .select('*, observation_concepts(concept_code, name_hu, name_en, bno_code)')
      .eq('user_id', userId)
      .order('logged_at'),
    supabase.from('subjects').select('*').eq('user_id', userId),
  ]);

  const errors = [logsRes.error, subjectsRes.error].filter(Boolean);
  if (errors.length > 0) {
    const errorDetails = errors.map(e => e?.message).join('; ');
    throw new Error(`Therapist export failed due to database query errors: ${errorDetails}`);
  }

  const resolver = await fetchConceptResolver(supabase);

  const mappedLogs = (logsRes.data as any[] | null ?? []).map((log) => {
    const concept = log.observation_concepts;
    const resolved = resolver.resolve(log.concept_id);

    const original_concept = concept ? {
      id: log.concept_id,
      code: concept.concept_code,
      name_hu: concept.name_hu,
      name_en: concept.name_en,
    } : null;

    const canonical_concept = resolved ? {
      id: resolved.resolvedId,
      key: resolved.resolvedCode,
      name_hu: resolved.resolvedNameHu,
      name_en: resolved.resolvedNameEn,
      category_id: resolved.category.id,
      category_key: resolved.category.category_key,
      category_name_hu: resolved.category.name_hu,
      category_name_en: resolved.category.name_en,
      valence: resolved.resolvedValence || 'negative',
    } : null;

    return {
      ...log,
      original_concept,
      canonical_concept,
    } as ExportObservationLog;
  });

  return {
    observation_logs: mappedLogs,
    subjects: subjectsRes.data ?? [],
  };
}

export function deriveTherapistSummary(
  logs: ExportObservationLog[],
  subjects: Database['public']['Tables']['subjects']['Row'][],
  bnoLabels: Record<string, string>,
  relationshipTypes: Record<string, string>,
  selfLabel: string,
  otherLabel: string,
  lang: string
): TherapistExportSummary {
  const subjectMap: Record<string, Database['public']['Tables']['subjects']['Row']> = {};
  subjects.forEach((s) => { subjectMap[s.id] = s; });

  const subjectGroups: Record<string, HelperSubjectGroup> = {};

  for (const log of logs) {
    const subjectType = log.subject_type ?? 'self';
    const subjectId = log.subject_id;
    const subjectKey = subjectType === 'self' ? 'self' : (subjectId ?? 'unknown');
    
    if (!subjectGroups[subjectKey]) {
      let label = selfLabel;
      if (subjectType === 'relative' && subjectId && subjectMap[subjectId]) {
        const s = subjectMap[subjectId];
        const relLabel = relationshipTypes[s.relationship_type] ?? s.relationship_type;
        label = `${s.name} (${relLabel})`;
      } else if (subjectType === 'relative') {
        label = otherLabel;
      }
      subjectGroups[subjectKey] = { subject_label: label, subject_type: subjectType, bno_groups: {} };
    }

    const concept = log.observation_concepts;
    const bno = concept?.bno_code ?? 'unknown';
    if (!subjectGroups[subjectKey].bno_groups[bno]) {
      subjectGroups[subjectKey].bno_groups[bno] = { bno_code: bno, observations: [] };
    }
    
    const conceptName = lang === 'hu' ? (concept?.name_hu ?? concept?.name_en) : concept?.name_en;
    subjectGroups[subjectKey].bno_groups[bno].observations.push({
      concept_localized: conceptName ?? 'Unknown',
      intensity: log.intensity,
      logged_at: log.logged_at,
      context: log.context_modifier,
    });
  }

  const subjectSummaries = Object.values(subjectGroups).map((sg) => ({
    subject_label: sg.subject_label,
    subject_type: sg.subject_type,
    bno_summary: Object.values(sg.bno_groups).map((group) => {
      const intensities = group.observations.map((o) => o.intensity);
      const dates = group.observations.map((o) => o.logged_at).sort();
      return {
        bno_code: group.bno_code,
        bno_label_localized: bnoLabels[group.bno_code] ?? group.bno_code,
        observation_count: group.observations.length,
        avg_intensity: Math.round((intensities.reduce((a, b) => a + b, 0) / intensities.length) * 100) / 100,
        date_range: { from: dates[0], to: dates[dates.length - 1] },
        observations: group.observations,
      };
    }),
  }));

  return {
    disclaimer: '',
    export_type: 'therapist_summary',
    exported_at: new Date().toISOString(),
    subjects: subjectSummaries,
  };
}
