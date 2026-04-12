import { format, isValid, parseISO } from 'date-fns';
import { getDateLocale } from './date-locale';

/**
 * Safely formats a date string or object.
 * Prevents "Invalid Time Value" crashes from date-fns.
 * 
 * @param date - The date to format (string, Date, or null)
 * @param formatStr - The format string (e.g., 'PPP')
 * @param lang - The language key ('hu' or 'en')
 * @param fallback - String to return if date is invalid
 */
export const safeFormat = (
  date: string | Date | null | undefined,
  formatStr: string,
  lang: 'hu' | 'en' = 'hu',
  fallback: string = ''
): string => {
  if (!date) return fallback;

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return fallback;
    }

    const locale = getDateLocale(lang);
    return format(dateObj, formatStr, { locale });
  } catch (error) {
    console.warn('safeFormat error:', error, { date, formatStr });
    return fallback;
  }
};
