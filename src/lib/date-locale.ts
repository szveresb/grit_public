import { hu } from 'date-fns/locale/hu';
import { enUS } from 'date-fns/locale/en-US';
import type { Locale } from 'date-fns';
import type { Lang } from '@/i18n/types';

const locales: Record<Lang, Locale> = { hu, en: enUS };
export const getDateLocale = (lang: Lang) => locales[lang];
