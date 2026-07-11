import { describe, it, expect, vi } from 'vitest';
import { buildUserDataExport, buildTherapistExportData, deriveTherapistSummary } from '../lib/user-data-export';
import type { ExportObservationLog } from '../lib/user-data-export';
import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

vi.mock('../integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn()
    }
  };
});

describe('buildUserDataExport', () => {
  it('should return a full export with empty arrays for sparse data', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'profiles') {
        data = null;
      }
      
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve({ data, error: null }),
        then: (onfulfilled: any) => Promise.resolve({ data, error: null }).then(onfulfilled)
      };
      return builder;
    });

    const result = await buildUserDataExport('test-user-id');

    expect(result.metadata.schema_version).toBe('1.0');
    expect(result.metadata.exported_at).toBeDefined();
    expect(result.metadata.included_sections).toContain('profile');
    expect(result.metadata.included_sections).toContain('journal_entries');

    expect(result.profile).toBeNull();
    expect(result.journal_entries).toEqual([]);
    expect(result.questionnaire_responses).toEqual([]);
    expect(result.mood_pulses).toEqual([]);
    expect(result.observation_logs).toEqual([]);
    expect(result.subjects).toEqual([]);
    expect(result.user_consents).toEqual([]);
    expect(result.consent_history_logs).toEqual([]);
    expect(result.user_feedback).toEqual([]);
    expect(result.observation_logs_fhir).toEqual([]);
  });

  it('should verify metadata matches returned payload sections', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'profiles') {
        data = null;
      }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve({ data, error: null }),
        then: (onfulfilled: any) => Promise.resolve({ data, error: null }).then(onfulfilled)
      };
      return builder;
    });

    const result = await buildUserDataExport('test-user-id');
    const expectedKeys = [...result.metadata.included_sections, ...result.metadata.derived_sections];
    const actualKeys = Object.keys(result).filter(k => k !== 'metadata');
    expect(expectedKeys.sort()).toEqual(actualKeys.sort());
  });

  it('should throw an error if any database query fails', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      let data: any = [];
      let error: any = null;
      if (table === 'journal_entries') {
        error = { message: 'Database failure' };
      }
      
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve({ data: null, error }),
        then: (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled)
      };
      return builder;
    });

    await expect(buildUserDataExport('test-user-id')).rejects.toThrow('Export failed due to database query errors');
  });

  it('should reconcile mood pulse duplicates correctly', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      let data: any = [];
      if (table === 'mood_pulses') {
        data = [
          { id: '1', user_id: 'test-user-id', level: 3, label: 'Okay', entry_date: '2026-07-11', subject_type: 'self', subject_id: null, created_at: '2026-07-11T10:00:00Z' },
          { id: '2', user_id: 'test-user-id', level: 5, label: 'Strong', entry_date: '2026-07-11', subject_type: 'self', subject_id: null, created_at: '2026-07-11T11:00:00Z' }
        ];
      } else if (table === 'profiles') {
        data = null;
      }

      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve({ data, error: null }),
        then: (onfulfilled: any) => Promise.resolve({ data, error: null }).then(onfulfilled)
      };
      return builder;
    });

    const result = await buildUserDataExport('test-user-id');
    expect(result.mood_pulses).toHaveLength(1);
    expect(result.mood_pulses[0].id).toBe('2');
    expect((result.mood_pulses[0] as any).reconciled_from_n_rows).toBe(2);
  });
});

describe('buildTherapistExportData', () => {
  it('should succeed even if unrelated tables (like journal_entries) fail', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      let data: any = [];
      let error: any = null;
      if (table === 'journal_entries') {
        error = { message: 'Database failure' };
      }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve({ data, error }),
        then: (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled)
      };
      return builder;
    });

    const result = await buildTherapistExportData('test-user-id');
    expect(result.observation_logs).toEqual([]);
    expect(result.subjects).toEqual([]);
  });

  it('should throw an error if therapist-related queries fail', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      let data: any = [];
      let error: any = null;
      if (table === 'observation_logs') {
        error = { message: 'Observation table failure' };
      }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve({ data, error }),
        then: (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled)
      };
      return builder;
    });

    await expect(buildTherapistExportData('test-user-id')).rejects.toThrow('Therapist export failed due to database query errors');
  });
});

describe('deriveTherapistSummary', () => {
  it('should correctly group and localize observation logs by subject and BNO code', () => {
    const mockConcept = { concept_code: '12345', name_hu: 'Szorongás', name_en: 'Anxiety', bno_code: 'F41.1' };
    const mockLogs: ExportObservationLog[] = [
      {
        id: 'log-1',
        user_id: 'user-1',
        concept_id: 'concept-1',
        journal_entry_id: null,
        intensity: 4,
        frequency: 'once',
        context_modifier: 'at home',
        user_narrative: '',
        logged_at: '2026-07-11',
        status: 'final',
        subject_type: 'self',
        subject_id: null,
        created_at: '2026-07-11T10:00:00Z',
        observation_concepts: mockConcept
      }
    ];

    const mockSubjects: Database['public']['Tables']['subjects']['Row'][] = [];
    const bnoLabels = { 'F41.1': 'Generalizált szorongásos zavar' };
    const relationshipTypes = {};
    const selfLabel = 'Saját';
    const otherLabel = 'Egyéb';

    const result = deriveTherapistSummary(
      mockLogs,
      mockSubjects,
      bnoLabels,
      relationshipTypes,
      selfLabel,
      otherLabel,
      'hu'
    );

    expect(result.export_type).toBe('therapist_summary');
    expect(result.subjects).toHaveLength(1);
    expect(result.subjects[0].subject_label).toBe('Saját');
    expect(result.subjects[0].bno_summary).toHaveLength(1);
    expect(result.subjects[0].bno_summary[0].bno_code).toBe('F41.1');
    expect(result.subjects[0].bno_summary[0].bno_label_localized).toBe('Generalizált szorongásos zavar');
    expect(result.subjects[0].bno_summary[0].observation_count).toBe(1);
    expect(result.subjects[0].bno_summary[0].avg_intensity).toBe(4);
    expect(result.subjects[0].bno_summary[0].observations[0].concept_localized).toBe('Szorongás');
  });
});
