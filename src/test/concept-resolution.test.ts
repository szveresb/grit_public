import { describe, it, expect } from 'vitest';
import { ConceptResolver, ConceptRow, CategoryRow } from '../lib/observationResolver';

// Mock Seed Data
const mockCategories: CategoryRow[] = [
  {
    id: 'cat_body',
    category_key: 'body_physical_sensations',
    name_hu: 'Testi érzetek',
    name_en: 'Physical Sensations',
    icon: 'activity',
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat_sleep',
    category_key: 'sleep_appetite_energy',
    name_hu: 'Alvás & Étvágy',
    name_en: 'Sleep & Appetite',
    icon: 'moon',
    sort_order: 2,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat_inactive',
    category_key: 'inactive_category',
    name_hu: 'Inaktív',
    name_en: 'Inactive',
    icon: 'shield',
    sort_order: 3,
    is_active: false,
    created_at: '',
    updated_at: '',
  }
];

const mockConcepts: ConceptRow[] = [
  // Canonical active concepts
  {
    id: 'con_somatic_safety',
    concept_code: 'somatic_safety',
    name_hu: 'Testi biztonság',
    name_en: 'Somatic Safety',
    description_hu: 'Biztonságos testi érzet',
    description_en: 'Feeling of physical ease',
    category_id: 'cat_body',
    valence: 'positive',
    status: 'active',
    is_selectable: true,
    canonical_concept_id: null,
    canonical_key: null,
    source_type: 'canonical',
    legacy_notes: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'con_headaches',
    concept_code: 'headaches',
    name_hu: 'Fejfájások',
    name_en: 'Headaches',
    description_hu: 'Fejfájás vagy migrén',
    description_en: 'Headache or migraine',
    category_id: 'cat_body',
    valence: 'negative',
    status: 'active',
    is_selectable: true,
    canonical_concept_id: null,
    canonical_key: null,
    source_type: 'canonical',
    legacy_notes: null,
    created_at: '',
    updated_at: '',
  },
  // Redundant legacy alias (history-only, non-selectable)
  {
    id: 'con_legacy_headache',
    concept_code: 'legacy_headache_code',
    name_hu: 'Fejfájás',
    name_en: 'Headache',
    description_hu: 'Régi fejfájás',
    description_en: 'Old headache log',
    category_id: 'cat_body',
    valence: 'negative',
    status: 'history_only',
    is_selectable: false,
    canonical_concept_id: 'con_headaches',
    canonical_key: 'headaches',
    source_type: 'legacy_alias',
    legacy_notes: 'Mapped to headaches',
    created_at: '',
    updated_at: '',
  },
  // Non-redundant legacy concept (active, selectable)
  {
    id: 'con_legacy_selectable',
    concept_code: 'legacy_selectable_code',
    name_hu: 'Különleges megfigyelés',
    name_en: 'Special observation',
    description_hu: 'Régi de megmaradó',
    description_en: 'Old but kept active',
    category_id: 'cat_sleep',
    valence: 'positive',
    status: 'active',
    is_selectable: true,
    canonical_concept_id: null,
    canonical_key: null,
    source_type: 'legacy_alias',
    legacy_notes: 'Kept selectable',
    created_at: '',
    updated_at: '',
  }
];

describe('Concept Resolution & Mapping Logic', () => {
  const resolver = new ConceptResolver(mockConcepts, mockCategories);

  describe('Database & Read Model Tests', () => {
    it('legacy alias row resolves correctly to its canonical concept parent', () => {
      const resolved = resolver.resolve('con_legacy_headache');
      expect(resolved).toBeDefined();
      expect(resolved?.resolvedId).toBe('con_headaches');
      expect(resolved?.resolvedCode).toBe('headaches');
      expect(resolved?.resolvedNameEn).toBe('Headaches');
      expect(resolved?.resolvedNameHu).toBe('Fejfájások');
    });

    it('history-only legacy concept is non-selectable', () => {
      const resolved = resolver.resolve('con_legacy_headache');
      expect(resolved?.is_selectable).toBe(false);
    });

    it('non-redundant legacy concept remains active and selectable where intended', () => {
      const resolved = resolver.resolve('con_legacy_selectable');
      expect(resolved?.status).toBe('active');
      expect(resolved?.is_selectable).toBe(true);
    });

    it('old observation logs resolve categories and valences correctly', () => {
      const resolved = resolver.resolve('con_legacy_headache');
      expect(resolved?.category.category_key).toBe('body_physical_sensations');
      expect(resolved?.resolvedValence).toBe('negative');
    });
  });

  describe('UI Picker Sorting & Filtering Tests', () => {
    it('getActiveCategories returns only active categories ordered by sort_order', () => {
      const activeCats = resolver.getActiveCategories();
      expect(activeCats).toHaveLength(2);
      expect(activeCats[0].id).toBe('cat_body');
      expect(activeCats[1].id).toBe('cat_sleep');
      expect(activeCats.find(c => c.id === 'cat_inactive')).toBeUndefined();
    });

    it('getConceptsByCategoryAndValence splits positive/negative correctly', () => {
      const positives = resolver.getConceptsByCategoryAndValence('cat_body', 'positive');
      expect(positives).toHaveLength(1);
      expect(positives[0].id).toBe('con_somatic_safety');

      const negatives = resolver.getConceptsByCategoryAndValence('cat_body', 'negative');
      // Should show con_headaches, but exclude con_legacy_headache (history_only/non-selectable)
      expect(negatives).toHaveLength(1);
      expect(negatives[0].id).toBe('con_headaches');
    });

    it('redundant legacy concepts do not appear in selectable lists', () => {
      const selectables = resolver.getAllSelectableConcepts();
      // Should contain con_somatic_safety, con_headaches, con_legacy_selectable
      // Should exclude con_legacy_headache (is_selectable = false)
      expect(selectables.find(s => s.id === 'con_legacy_headache')).toBeUndefined();
      expect(selectables.find(s => s.id === 'con_somatic_safety')).toBeDefined();
    });
  });

  describe('Timeline / Feed Naming Rules', () => {
    it('displays original label for legacy alias logs and canonical label for canonical logs', () => {
      const legacyLogConceptId = 'con_legacy_headache';
      const canonicalLogConceptId = 'con_headaches';

      const legacyResolved = resolver.resolve(legacyLogConceptId);
      const canonicalResolved = resolver.resolve(canonicalLogConceptId);

      // Rule: History show original label first
      const legacyDisplayNameEn = legacyResolved ? legacyResolved.name_en : '';
      expect(legacyDisplayNameEn).toBe('Headache'); // original name

      // Rule: Prospective show resolved canonical label
      const canonicalDisplayNameEn = canonicalResolved ? canonicalResolved.resolvedNameEn : '';
      expect(canonicalDisplayNameEn).toBe('Headaches'); // canonical name
    });
  });

  describe('Export Parity Schema Mapping', () => {
    it('maps original and canonical details correctly on log records', () => {
      const log = {
        concept_id: 'con_legacy_headache',
        observation_concepts: {
          concept_code: 'legacy_headache_code',
          name_hu: 'Fejfájás',
          name_en: 'Headache',
        }
      };

      const resolved = resolver.resolve(log.concept_id);
      
      const original_concept = log.observation_concepts ? {
        id: log.concept_id,
        code: log.observation_concepts.concept_code,
        name_hu: log.observation_concepts.name_hu,
        name_en: log.observation_concepts.name_en,
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

      expect(original_concept?.name_en).toBe('Headache');
      expect(canonical_concept?.name_en).toBe('Headaches');
      expect(canonical_concept?.category_key).toBe('body_physical_sensations');
      expect(canonical_concept?.valence).toBe('negative');
    });
  });
});
