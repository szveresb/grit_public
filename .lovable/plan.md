

# Enforce Hungarian as Default Language Across the App

## Problem

The project documentation states Hungarian is the default language, but several places still default to English or contain hardcoded English strings:

1. **`index.html`** -- `<html lang="en">`, `<title>` and all `<meta>` tags are in English
2. **`date-fns` formatting** -- All `format()` calls (8 files) use English locale by default, outputting English month/day names ("MMM d", "MMMM yyyy", "EEEE, MMMM d, yyyy")
3. **Dashboard hardcoded string** -- `Dashboard.tsx` line 40 has `Impact: ${j.impact_level}/5` (English, not localized)
4. **QuickPulse saves English labels to DB** -- The mood label saved to `journal_entries.title` and `emotional_state` comes from the current language dictionary, but when the user is on the default HU route this is fine. No issue here.

## Changes

### 1. `index.html` -- Set Hungarian defaults
- Change `<html lang="en">` to `<html lang="hu">`
- Translate `<title>` to Hungarian: "Grit.hu -- Ertelemkereso portal magas konfliktussu dinamikakhoz"
- Translate `<meta name="description">` to Hungarian
- Translate `og:title` and `og:description` to Hungarian
- Keep English as a fallback -- the JS-side language toggle handles runtime switching

### 2. Create a date-fns locale helper
- Create `src/lib/date-locale.ts` that exports a function mapping the current `Lang` to the correct `date-fns` locale (`hu` or `enUS`)
- Import `date-fns/locale/hu` and `date-fns/locale/en-US`

### 3. Update all `format()` calls (8 files) to pass locale
Files affected:
- `src/pages/Dashboard.tsx` -- `format(parseISO(item.date), 'MMM d')` 
- `src/pages/Timeline.tsx` -- `format(currentMonth, 'MMMM yyyy')`, `format(selectedDate, 'EEEE, MMMM d, yyyy')`, `format(parseISO(...), 'MMM d')`
- `src/components/journal/JournalEntryCard.tsx` -- `format(new Date(entry.entry_date), 'MMM d, yyyy')`
- `src/components/checkin/UnifiedFeed.tsx` -- `format(parseISO(item.date), 'MMM d')`
- `src/components/observations/ObservationHistory.tsx` -- already uses `yyyy. MM. dd.` (numeric, locale-independent -- no change needed)
- `src/pages/CheckIn.tsx` and `src/pages/Journal.tsx` -- use `yyyy-MM-dd` (ISO format for DB -- no change needed)
- `src/components/checkin/QuickPulse.tsx` -- uses `yyyy-MM-dd` (ISO -- no change needed)

Each affected file will import `useLanguage` (if not already) and the locale helper, then pass `{ locale }` as the third argument to `format()`.

### 4. Fix hardcoded "Impact" in Dashboard
- Replace `Impact: ${j.impact_level}/5` with `${t.journal.cardImpact}: ${j.impact_level}/5` using the existing localized key (`"Weight"` / `"Suly"`)

---

## Technical Details

### New file: `src/lib/date-locale.ts`
```typescript
import { hu } from 'date-fns/locale/hu';
import { enUS } from 'date-fns/locale/en-US';
import type { Lang } from '@/i18n/types';

const locales = { hu, en: enUS };
export const getDateLocale = (lang: Lang) => locales[lang];
```

### Example format call update
```typescript
// Before
format(parseISO(item.date), 'MMM d')

// After
import { getDateLocale } from '@/lib/date-locale';
const { lang } = useLanguage();
format(parseISO(item.date), 'MMM d', { locale: getDateLocale(lang) })
```

### Files modified summary

| File | Change |
|---|---|
| `index.html` | `lang="hu"`, Hungarian title and meta |
| `src/lib/date-locale.ts` | New locale helper |
| `src/pages/Dashboard.tsx` | Localized date format + fix "Impact" string |
| `src/pages/Timeline.tsx` | Localized date format (4 calls) |
| `src/components/journal/JournalEntryCard.tsx` | Localized date format |
| `src/components/checkin/UnifiedFeed.tsx` | Localized date format |

Total: 1 new file, 5 modified files.

