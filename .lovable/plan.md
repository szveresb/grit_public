

# Align Codebase with Project Knowledge Documents

## Findings

After auditing `DESIGN_CODEX.md`, `SYSTEM_DESCRIPTION.md`, and the actual codebase, here are the misalignments to fix:

---

## 1. Update DESIGN_CODEX.md -- Icon Section is Outdated

**Problem:** Section 9 ("Icon Usage") still says "All icons from `lucide-react`" and references Lucide sizing conventions. The app now uses the custom Freud icon library exclusively.

**Fix:** Rewrite Section 9 to document the Freud Icon Set (`src/components/icons/FreudIcons.tsx`), including the icon categories (Navigation, Actions, Mental Health Metaphors, Mood, Roles) and the standard sizing rules that remain unchanged (`h-4 w-4`, `h-3.5 w-3.5`, `h-3 w-3`).

---

## 2. Update DESIGN_CODEX.md -- Add ObservationTree and Guided Journal Patterns

**Problem:** Section 8 ("Component Patterns") documents JournalEntryCard and AI Reflection but does not mention the new ObservationTree wizard or the QuickPulse botanical mood widget -- both key interaction patterns.

**Fix:** Add entries for:
- **ObservationTree** -- 3-step guided wizard (Domain, Concept, Intensity/Frequency) with step indicator circles, `animate-fade-in`, and glassmorphism domain cards.
- **QuickPulse** -- 5 fixed-size mood buttons (`w-14 h-14 rounded-2xl`) with opacity-graded Freud mood icons and external labels.

---

## 3. Update DESIGN_CODEX.md -- File Architecture is Stale

**Problem:** Section 12 ("File Architecture") still shows the old tree without the `icons/`, `checkin/`, `observations/` directories, the `CheckIn.tsx` page, or `types/journal.ts`.

**Fix:** Update the tree to reflect the current structure including:
- `src/components/icons/FreudIcons.tsx`
- `src/components/checkin/QuickPulse.tsx`, `UnifiedFeed.tsx`
- `src/components/observations/ObservationStepper.tsx`, `ObservationHistory.tsx`
- `src/components/journal/ObservationTree.tsx`
- `src/pages/CheckIn.tsx`

---

## 4. Update SYSTEM_DESCRIPTION.md -- Observation Categories Icon Field References Lucide

**Problem:** Section 4.6 documents `observation_categories.icon` as "Lucide icon name". The app now maps these to Freud icons via an `iconMap` in `ObservationTree.tsx`.

**Fix:** Change the column description from "Lucide icon name" to "Icon key (mapped to Freud icon set in frontend)".

---

## 5. Update SYSTEM_DESCRIPTION.md -- Missing `journal_entry_id` on `observation_logs`

**Problem:** Section 4.6 does not document the `journal_entry_id` column added to `observation_logs` (from the Guided Journal Tree migration).

**Fix:** Add `journal_entry_id` (uuid, FK to `journal_entries.id`, ON DELETE SET NULL, nullable) to the `observation_logs` table documentation.

---

## 6. Update SYSTEM_DESCRIPTION.md -- Seed Data is Incomplete

**Problem:** Section 4.6 lists seed categories as "Emotional State, Communication Patterns, Boundaries" but the actual seed now includes "Relational Dynamics, Emotional State, Behavioral Patterns, Physical/Somatic". The old three may still exist alongside.

**Fix:** Update the seed data listing to match the current database state (4 categories + 9 concepts from the Guided Journal Tree migration).

---

## 7. Dashboard Uses `max-w-4xl` Instead of `max-w-2xl`

**Problem:** The Design Codex (Section 4) specifies `max-w-2xl` for main content areas. `Dashboard.tsx` uses `max-w-4xl`.

**Fix:** This is intentional for the Dashboard since it includes the ActionGrid which benefits from wider layout. Add a note in the Codex: "Exception: Dashboard uses `max-w-4xl` for its action grid layout."

---

## 8. Language Violations -- "Impact" Label in Dashboard

**Problem:** The Design Codex Section 11 prohibits clinical language. `Dashboard.tsx` line 41 outputs `Impact: ${j.impact_level}/5` which is hardcoded English and uses clinical framing.

**Fix:** Replace with a localized, human-friendly label. Add i18n keys like `dash.weight` ("Weight: {n}/5" in EN, "Sulyossag: {n}/5" in HU) following the "How heavy was it?" metaphor already used elsewhere.

---

## Summary of Files Changed

| File | Changes |
|---|---|
| `DESIGN_CODEX.md` | Rewrite Section 9 (icons), expand Section 8 (new patterns), update Section 12 (file tree), add max-width exception note |
| `SYSTEM_DESCRIPTION.md` | Fix icon field description, add `journal_entry_id` column, update seed data listing |
| `src/pages/Dashboard.tsx` | Replace hardcoded "Impact" string with localized weight label |
| `src/i18n/en.ts` | Add `dash.weight` key |
| `src/i18n/hu.ts` | Add `dash.weight` key (Hungarian) |
| `src/i18n/types.ts` | Add `weight` to dash type |

