

## Reverse Scoring for Questionnaire Scale Questions

### What it does
Adds a "Reverse scoring" toggle per question in the questionnaire editor. When enabled, the system automatically generates reversed score values (e.g., for a 0–4 scale: 0→4, 1→3, 2→2, 3→1, 4→0). Users see the same scale as any other question — the reversal only affects score calculation.

### How it works

**No database changes needed** — reverse scores are stored in the existing `answer_scores` JSONB column on `questionnaire_questions`.

#### 1. Editor UI (`src/pages/SelfChecks.tsx`)
- Add `reverseScored: boolean` to the per-question form state
- Show a "Reverse scoring" Switch for scale-type questions when scoring is enabled (in both sum and weighted modes)
- When the toggle is on, auto-populate `answerScores` with reversed values based on the scale range
- When loading for edit, detect if stored `answer_scores` match a reverse pattern and set the toggle accordingly

#### 2. Scoring logic (`src/components/checkin/QuestionnaireFiller.tsx`)
- In **sum mode**, check if `answer_scores` exist on the question — if so, use them instead of the raw scale value
- This is already how weighted mode works; we just extend sum mode to also respect per-question `answer_scores`

#### 3. I18n (`src/i18n/en.ts`, `src/i18n/hu.ts`, `src/i18n/types.ts`)
- Add `reverseScoring` label: EN "Reverse scoring", HU "Fordított pontozás"

### Auto-generation logic
When `reverseScored` is toggled on for a scale question with range `[min, max]`:
```
answerScores = { "0": 4, "1": 3, "2": 2, "3": 1, "4": 0 }
// Formula: score(n) = (min + max) - n
```

When toggled off, `answerScores` is cleared (unless in weighted mode with manual scores).

### Files to modify
- `src/pages/SelfChecks.tsx` — editor toggle + auto-fill logic
- `src/components/checkin/QuestionnaireFiller.tsx` — sum mode respects `answer_scores`
- `src/i18n/en.ts`, `src/i18n/hu.ts`, `src/i18n/types.ts` — new label

