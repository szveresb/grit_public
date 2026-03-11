## Plan: Self-check results as journal entries + severity instead of frequency

### What changes

**1. Questionnaires and observation entry completions auto-create a journal entry**

When a user submits a questionnaire (`QuestionnaireFiller.handleSubmit`), after saving the response and answers, the system will also insert a `journal_entries` row:

- `title`: questionnaire title (e.g. "Self-check: {title}")
- `entry_date`: today
- `impact_level`: computed from answers (average of scale answers, rounded) or null if no scale questions
- `emotional_state`: null
- `event_description`: a brief summary of answers (e.g. question-answer pairs as text)
- `free_text`: null
- `self_anchor`: null

This makes every self-check visible in the Unified Feed as a journal entry (not just as a separate questionnaire type).

**2. Replace frequency with severity in observations**

Both `ObservationStepper` and `ObservationTree` currently collect a `frequency` field (once/sometimes/often/constant). The user wants **severity** instead — which maps directly to the existing `intensity` field (1-5 scale). The `frequency` toggle group will be removed from both components.

No database changes needed — `frequency` is already nullable, and `intensity` already exists.

### Files to modify


| File                                                    | Change                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/components/checkin/QuestionnaireFiller.tsx`        | After saving response+answers, insert a `journal_entries` row with title, computed impact, and answer summary |
| `src/components/observations/ObservationStepper.tsx`    | Remove the frequency toggle group and `frequency` state; stop sending frequency in insert payload             |
| `src/components/journal/ObservationTree.tsx`            | Remove frequency from step 2 UI and from `ObservationTreeResult`; update interface                            |
| `src/i18n/hu.ts`, `src/i18n/en.ts`, `src/i18n/types.ts` | Add i18n key for self-check journal title template (e.g. `selfCheckJournalTitle`)                             |


### Technical details

**Journal entry from questionnaire** — in `handleSubmit`, after the answers insert succeeds:

```typescript
const summaryLines = questions.map((q, i) => `${i+1}. ${q.question_text}: ${answers[q.id] ?? '-'}`).join('\n');
await supabase.from('journal_entries').insert({
  user_id: user.id,
  title: `${t.selfChecks.journalTitle}: ${qTitle}`,
  entry_date: new Date().toISOString().split('T')[0],
  event_description: summaryLines,
  impact_level: averageScaleScore || null,
});
```

**Frequency removal** — straightforward deletion of the frequency state, toggle UI, and the `frequency` property from payloads. The `ObservationTreeResult` interface drops the `frequency` field.