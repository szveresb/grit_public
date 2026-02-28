

# Guided Journal Tree -- Implementation Plan

## Overview
Add a three-tier observation tree as an **optional first step** inside JournalForm. When a user selects a path through the tree (Domain -> Theme -> Specific Observation), the clinical metadata (SNOMED CT + BNO-10) is silently captured. The free-text journal fields appear only after the path is selected. On submit, both a `journal_entries` row and a linked `observation_logs` row are created.

---

## 1. Database Migration

**Add `journal_entry_id` column to `observation_logs`**:
```sql
ALTER TABLE observation_logs
  ADD COLUMN journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL;
```

**Seed the tier data** into existing `observation_categories` and `observation_concepts` tables. The categories already have `name_hu`, `name_en`, `icon`, `sort_order`. The concepts already have `concept_code` (SNOMED), `bno_code`, `description_hu`, `description_en`.

Seed categories (Tier 1):
- Relational Dynamics / Kapcsolati dinamika
- Emotional State / Érzelmi állapot
- Behavioral Patterns / Viselkedési minták
- Physical / Somatic / Testi jelzések

Seed concepts (Tier 2+3 combined -- each concept belongs to a category and carries the SNOMED/BNO codes):

| Category | Concept (EN) | Concept (HU) | SNOMED | BNO |
|---|---|---|---|---|
| Relational | Boundary testing | Határpróbálgatás | (custom) | F60.3 |
| Relational | Reality distortion | Valóságtorzítás | 425038005 | F60.3 |
| Relational | Conflict escalation | Konfliktusfokozás | (custom) | F60.3 |
| Emotional | Emotional dysregulation | Érzelmi szabályozási nehézség | 28639000 | F32.9 |
| Emotional | Emptiness | Ürességérzet | (custom) | F60.3 |
| Emotional | Intense anger | Intenzív düh | (custom) | F60.3 |
| Behavioral | Impulsivity | Impulzivitás | 55929007 | F60.30 |
| Behavioral | Self-harm ideation | Önsértő gondolatok | (custom) | F60.3 |
| Behavioral | Abandonment avoidance | Elhagyástól való félelem | 225444004 | F60.3 |

Human-friendly descriptions will be added to `description_en` / `description_hu` for each concept (e.g., "High-intensity relational shift" instead of "F60.3").

---

## 2. New Component: `ObservationTree.tsx`

**Location**: `src/components/journal/ObservationTree.tsx`

A stepped wizard component with the Bamboo soft-UI aesthetic:

- **Step 1 (Tier 1)**: Show 4 domain cards loaded from `observation_categories`. User picks one.
- **Step 2 (Tier 2/3)**: Show concepts for that category from `observation_concepts`. Each card shows the human-friendly `description` -- never SNOMED/BNO codes. User picks one.
- **Step 3**: Intensity selector (1-5 circles, same style as existing) + optional frequency toggle.
- On selection complete, fires `onComplete(selectedConceptId, intensity, frequency)` callback.

Step indicator uses the same rounded-circle pattern as `ObservationStepper`. A "Skip" link allows users to create a plain journal entry without the tree.

---

## 3. Modify `JournalForm.tsx`

Add an **optional guided tree step** before the existing form fields:

- New props: `showObservationTree?: boolean`, `onObservationSelected?: (data) => void`
- When `showObservationTree` is true, render `ObservationTree` above the form. The text fields (title, what happened, etc.) appear only after the tree path is selected (or skipped).
- Store selected `conceptId`, `intensity`, and `frequency` in local state, passed up to the parent on submit.

The form's `onSubmit` signature will be extended so the parent can handle creating both records.

---

## 4. Modify `CheckIn.tsx` (Journal page)

Update the journal submit handler:

1. Insert `journal_entries` row (existing logic).
2. If a concept was selected via the tree, insert an `observation_logs` row with `concept_id`, `intensity`, `frequency`, and the new `journal_entry_id` linking back to the journal entry.

The "New Entry" button will open the form with `showObservationTree={true}` by default. A small "Quick note" link can bypass the tree for fast entries.

---

## 5. i18n Updates

Add new keys to `en.ts`, `hu.ts`, and `types.ts`:

```
journal.guidedTreeTitle: "What area are you reflecting on?"
journal.guidedTreeSkip: "Skip -- just write"
journal.guidedTreeIntensity: "How heavy was it?"
journal.guidedTreeFrequency: "How often?"
journal.guidedTreeSelected: "Selected path"
```

(Plus Hungarian translations for all keys.)

---

## 6. Security

- No new RLS policies needed: `observation_logs` already has `auth.uid() = user_id` policy for ALL operations.
- SNOMED/BNO codes are stored in `observation_concepts` (read-only for regular users via existing SELECT policy on `is_active = true`). The codes exist in the DB but are never rendered in the UI for `affected_person` users.

---

## Summary of files changed

| File | Action |
|---|---|
| Database migration | Add `journal_entry_id` column + seed categories/concepts |
| `src/components/journal/ObservationTree.tsx` | **New** -- 3-step guided tree wizard |
| `src/components/journal/JournalForm.tsx` | Add optional tree step before form fields |
| `src/pages/CheckIn.tsx` | Update submit handler to create linked observation_logs |
| `src/i18n/en.ts` | Add guided tree i18n keys |
| `src/i18n/hu.ts` | Add guided tree i18n keys (Hungarian) |
| `src/i18n/types.ts` | Add new key typings |

