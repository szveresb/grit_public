

# Structured Self-Check Observation Engine

## Overview

Add a SNOMED CT-inspired structured observation logging system as a new tab ("Megfigyelesek" / "Observations") within the existing Self-Checks page. The current questionnaire system remains untouched on its own tab. The observation catalog (categories, concepts, qualifiers) is stored in the database and manageable by editors.

---

## Architecture

The system introduces a three-level hierarchy for structured observations:

```text
Category (Domain)
  e.g., "Erzelmi allapot" / "Emotional State"
  |
  +-- Concept (Specific Observation)
  |     e.g., "Megertetlenseg erzese" / "Feeling of being unheard"
  |     hidden: concept_code = "interpersonal_conflict_unheard"
  |
  +-- Qualifiers: Intensity (1-5), Frequency, Context modifier
  |
  +-- user_narrative (free-text anchor)
```

Users never see codes or clinical labels. The UI shows only the `name_hu` / `name_en` fields.

---

## Database Changes (Migration)

### New Tables

**1. `observation_categories`** -- Top-level domains
- `id` (uuid, PK)
- `name_hu` (text, NOT NULL)
- `name_en` (text, NOT NULL)
- `icon` (text, nullable) -- lucide icon name
- `sort_order` (integer, default 0)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

**2. `observation_concepts`** -- Specific observations within a category
- `id` (uuid, PK)
- `category_id` (uuid, FK -> observation_categories)
- `concept_code` (text, UNIQUE, NOT NULL) -- internal SNOMED-like identifier
- `name_hu` (text, NOT NULL)
- `name_en` (text, NOT NULL)
- `description_hu` (text, nullable)
- `description_en` (text, nullable)
- `sort_order` (integer, default 0)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

**3. `observation_logs`** -- User entries
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `concept_id` (uuid, FK -> observation_concepts)
- `intensity` (integer, 1-5)
- `frequency` (text, nullable) -- e.g. 'once', 'sometimes', 'often', 'constant'
- `context_modifier` (text, nullable) -- e.g. "at home", "at work"
- `user_narrative` (text, nullable) -- free-text anchor
- `logged_at` (date, default CURRENT_DATE)
- `created_at` (timestamptz)

### RLS Policies

- **observation_categories**: SELECT for all authenticated users; ALL for admin/editor roles
- **observation_concepts**: SELECT for all authenticated users; ALL for admin/editor roles
- **observation_logs**: ALL restricted to `auth.uid() = user_id` (users manage only their own)

### Seed Data

Insert initial categories and concepts (all in HU + EN):

| Category (HU/EN) | Concepts |
|---|---|
| Erzelmi allapot / Emotional State | Megertetlenseg erzese / Feeling unheard, Tunetes elbeszelese / Narrative distortion, Erzelmi elzaras / Emotional withdrawal |
| Kommunikacios mintak / Communication Patterns | Koros ervelés / Circular arguing, Csend falazas / Stonewalling, Tamadokent valo beallitas / Being positioned as the aggressor |
| Hatarok / Boundaries | Hataratlepes / Boundary crossing, Kontrollalas / Controlling behavior, Maganelete megsertese / Privacy violation |

---

## Frontend Changes

### 1. Dictionary Updates (`src/i18n/types.ts`, `hu.ts`, `en.ts`)

Add a new `observations` section to the Dictionary type:
- Tab labels: "Kerdoivek" / "Questionnaires" and "Megfigyelesek" / "Observations"
- Step labels: "Valassz teruletet" / "Choose a domain", "Valassz megfigyeles" / "Pick an observation"
- Qualifier labels: intensity, frequency, context, notes
- Frequency options: "egyszer" / "once", "neha" / "sometimes", "gyakran" / "often", "allandoan" / "constant"
- Success/empty messages

### 2. Self-Checks Page Refactor (`src/pages/SelfChecks.tsx`)

Add a `Tabs` component at the top with two tabs:
- Tab 1: "Kerdoivek" / "Questionnaires" -- existing questionnaire content (unchanged)
- Tab 2: "Megfigyelesek" / "Observations" -- new structured observation flow

### 3. New Components

**`src/components/observations/ObservationStepper.tsx`**
- Progressive disclosure stepper (3 steps)
- Step 1: Category selection -- rounded buttons with icon + label, sage-green highlight on active
- Step 2: Concept list -- filterable list of descriptive observations for the selected category
- Step 3: Qualifiers -- Intensity slider (1-5 circles like existing scale UI), frequency toggle group, context text input, free-text narrative textarea
- Submit button saves to `observation_logs`
- "Back" navigation between steps
- All labels pull from `t.observations.*`

**`src/components/observations/ObservationHistory.tsx`**
- Shows recent observation logs for the current user
- Grouped by date, showing concept name + intensity badge
- Expandable to see full narrative/context

**`src/components/observations/CategoryManager.tsx`** (editor-only)
- CRUD interface for categories and concepts
- Accessible via a "Manage" button visible to admin/editor roles
- Uses the same glassmorphism card + rounded-3xl pattern
- Confirmation dialogs for deletion

### 4. Visual Design (Codex-compliant)

- Step indicators: small numbered circles connected by a line, active step in `bg-primary`
- Category buttons: `bg-card/60 backdrop-blur border border-border rounded-3xl p-5` with sage-green border on selection (`border-primary`)
- Intensity selector: reuse the existing 1-5 circle buttons pattern from the questionnaire scale UI
- Frequency: `ToggleGroup` with `rounded-2xl` items
- All fonts: Quicksand; all inputs `rounded-2xl`; cards `rounded-3xl`
- Quick Exit button remains visible throughout

---

## Technical Details

### File changes summary

| File | Action |
|---|---|
| `supabase/migrations/...` | New migration: create 3 tables + RLS + seed data |
| `src/i18n/types.ts` | Add `observations` section to Dictionary |
| `src/i18n/hu.ts` | Add Hungarian translations |
| `src/i18n/en.ts` | Add English translations |
| `src/pages/SelfChecks.tsx` | Wrap existing content in Tabs; add Observations tab |
| `src/components/observations/ObservationStepper.tsx` | New: 3-step stepper component |
| `src/components/observations/ObservationHistory.tsx` | New: user's logged observations list |
| `src/components/observations/CategoryManager.tsx` | New: editor CRUD for catalog |

### Data flow

1. On tab switch to "Observations", fetch `observation_categories` (active only) from database
2. On category select, fetch `observation_concepts` filtered by `category_id`
3. On submit, insert into `observation_logs` with `user_id = auth.uid()`
4. History view queries `observation_logs` joined with `observation_concepts` and `observation_categories`

### Validation

- Intensity must be 1-5 (enforced via UI circles, validated via trigger on insert)
- `concept_id` must reference a valid active concept
- `user_id` is set from `auth.uid()` (not user-supplied)

