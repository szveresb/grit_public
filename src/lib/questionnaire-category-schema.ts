export const QUESTIONNAIRE_SELECT_BASE =
  'id, title, title_localized, description, description_localized, repeat_interval, scoring_enabled, scoring_mode, score_ranges, interpretation_profile, is_published, created_at, updated_at, created_by, snomed_code, subscales';

export const QUESTIONNAIRE_SELECT_WITH_CATEGORIES = `${QUESTIONNAIRE_SELECT_BASE}, category_id, category:questionnaire_categories(id, key, name_hu, name_en, is_active, sort_order)`;

export const QUESTIONNAIRE_PUBLIC_SELECT_WITH_CATEGORIES =
  'id, title, description, is_published, title_localized, description_localized, interpretation_profile, category_id, category:questionnaire_categories(id, key, name_hu, name_en)';

export interface QuestionnaireCategoryLike {
  id: string;
  key: string;
  name_hu: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
}

export const FALLBACK_QUESTIONNAIRE_CATEGORIES: QuestionnaireCategoryLike[] = [
  {
    id: 'fallback-mood-emotional-state',
    key: 'mood_emotional_state',
    name_hu: 'Hangulat ?s ?rzelmi ?llapot',
    name_en: 'Mood & emotional state',
    is_active: true,
    sort_order: 10,
  },
  {
    id: 'fallback-wellbeing-life-satisfaction',
    key: 'wellbeing_life_satisfaction',
    name_hu: 'J?l?t ?s ?lettel val? el?gedetts?g',
    name_en: 'Wellbeing & life satisfaction',
    is_active: true,
    sort_order: 20,
  },
  {
    id: 'fallback-relationships-attachment',
    key: 'relationships_attachment',
    name_hu: 'Kapcsolatok ?s k?t?d?s',
    name_en: 'Relationships & attachment',
    is_active: true,
    sort_order: 30,
  },
  {
    id: 'fallback-caregiving-family-context',
    key: 'caregiving_family_context',
    name_hu: 'Gondoskod?s ?s csal?di kontextus',
    name_en: 'Caregiving & family context',
    is_active: true,
    sort_order: 40,
  },
];

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

export function inferQuestionnaireCategoryKey(title: string | null | undefined): string | null {
  if (!title) return null;

  const normalized = normalizeTitle(title);

  if (
    normalized.startsWith('gad-7') ||
    normalized.startsWith('phq-9') ||
    normalized.startsWith('pdq-9') ||
    normalized.startsWith('pss-10') ||
    normalized.startsWith('pss-14') ||
    normalized.startsWith('k10')
  ) {
    return 'mood_emotional_state';
  }

  if (
    normalized.startsWith('who-5') ||
    normalized.startsWith('satisfaction with life scale')
  ) {
    return 'wellbeing_life_satisfaction';
  }

  if (
    normalized.startsWith('sinclair & wallston') ||
    normalized.startsWith('glover vulnerability')
  ) {
    return 'relationships_attachment';
  }

  if (
    normalized.startsWith('healthy caregiving test') ||
    normalized.startsWith('partner/child context') ||
    normalized.startsWith('parenting')
  ) {
    return 'caregiving_family_context';
  }

  return null;
}

export function getFallbackQuestionnaireCategory(title: string | null | undefined): QuestionnaireCategoryLike | null {
  const key = inferQuestionnaireCategoryKey(title);
  if (!key) return null;
  return FALLBACK_QUESTIONNAIRE_CATEGORIES.find((category) => category.key === key) ?? null;
}

export function isMissingQuestionnaireCategorySchema(error: {
  message?: string;
  code?: string;
} | null | undefined): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? '';

  return (
    message.includes('questionnaire_categories') ||
    message.includes('questionnaires_category_id_fkey') ||
    (message.includes('category_id') && message.includes('schema cache'))
  );
}
