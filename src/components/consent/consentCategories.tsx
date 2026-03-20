import {
  FBookOpen,
  FHeartPulse,
  FSparkles,
  FTrendingUp,
  FClipboardCheck,
  FFileText,
  FBarChart,
} from '@/components/icons/FreudIcons';
import type { ConsentCategory } from './ConsentCard';
import type { Dictionary } from '@/i18n/types';

export const CONSENT_KEYS = [
  'journal_storage',
  'mood_tracking',
  'free_text_ai',
  'pattern_detection',
  'questionnaire_data',
  'fhir_export',
  'anonymized_analytics',
] as const;

export type ConsentKey = (typeof CONSENT_KEYS)[number];

const ICONS: Record<ConsentKey, React.ReactNode> = {
  journal_storage: <FBookOpen className="h-5 w-5" />,
  mood_tracking: <FHeartPulse className="h-5 w-5" />,
  free_text_ai: <FSparkles className="h-5 w-5" />,
  pattern_detection: <FTrendingUp className="h-5 w-5" />,
  questionnaire_data: <FClipboardCheck className="h-5 w-5" />,
  fhir_export: <FFileText className="h-5 w-5" />,
  anonymized_analytics: <FBarChart className="h-5 w-5" />,
};

export const buildCategories = (t: Dictionary): ConsentCategory[] =>
  CONSENT_KEYS.map((key) => ({
    key,
    icon: ICONS[key],
    title: t.consent.categories[key].title,
    description: t.consent.categories[key].description,
    learnMore: t.consent.categories[key].learnMore,
  }));
