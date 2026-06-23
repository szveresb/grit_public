## Goal

No data migration is needed (no production survey title actually matches `/pvs/i` or `/brcs/i` — `title_localized.en` is null for every row, and Hungarian titles don't contain those tokens). Just remove the title-matching heuristic and rewire the UI to read `interpretation_profile` from the questionnaire row.

## Changes

### `src/lib/score-interpretation.ts`
- Delete `INTERPRETATION_PROFILES`, `matchers`, `candidateValues`, and the `QuestionnaireInterpretationTarget` overloads.
- Keep `ScoreRange`, `ScoreInterpretation`, and the per-profile metadata (scoreMin/scoreMax/scoreRanges/noteKey/labelKey) as a keyed lookup: `PROFILES: Record<'pvs'|'brcs', ScoreInterpretation>`.
- Replace `getScoreInterpretation(target)` with `getScoreInterpretation(profile: string | null | undefined): ScoreInterpretation | null` that returns `PROFILES[profile] ?? null`.

### Callers (pass `questionnaire.interpretation_profile` instead of title/snomed)
- `src/components/checkin/ScoreResults.tsx` — pass `questionnaireInterpretationTarget` as the profile string (rename prop to `interpretationProfile`).
- `src/components/checkin/ScoreHistory.tsx` — both call sites (lines ~177, ~317) call with the profile string from the questionnaire row.
- `src/components/checkin/QuestionnaireFiller.tsx` — line ~301, same change. Drop any `snomed_code` selects that were only used by the heuristic.

### Data migration
None. The story's QA check `SELECT COUNT(*) WHERE interpretation_enabled = true` resolves to 0, matching the 0 surveys that previously matched the heuristic.

## Acceptance check

- `rg "INTERPRETATION_PROFILES|matchers|candidateValues"` returns no hits.
- `getScoreInterpretation` exists but now takes a profile key, not a target object.
- Build passes.
- Surveys with `interpretation_profile = null` show no interpretation (unchanged from today's prod behavior).
- Admin can tag a survey as `pvs` or `brcs` via the existing editor selector and interpretation appears.

## Out of scope

Schema changes (column already exists from Story 1) and any UI for `interpretation_enabled` (the story uses that as one acceptance phrasing, but the implemented column is `interpretation_profile` where `NULL` = disabled).
