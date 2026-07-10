# Story 2: Observed Person Demographics In Profile Registry

Introduce biological sex and birth year fields for observed people (subjects) in the profile registry under `/profile`. This aligns the demographics data model and user experience of observed people with the user's own profile demographics (Story 1).

## User Review Required

> [!IMPORTANT]
> **Repository Confirmation**: As per the Critical Safety Rules, you must explicitly confirm which repository (`grit.hu` or `grit.hu-beta`) we should proceed in. All proposed changes listed below assume the chosen repository.
> Please reply in chat to confirm the repository before we execute this plan.

> [!NOTE]
> **Database Migrations**: Running database migrations requires the user to watch the logs, so we will wait for confirmation before applying the SQL migration file.

---

## Proposed Changes

### Database Layer

#### [NEW] [20260710182000_add_subject_demographics.sql](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/supabase/migrations/20260710182000_add_subject_demographics.sql)
- Add a new SQL migration to add optional `biological_sex` and `birth_year` columns to the `subjects` table.
- Use identical constraints and types as those used in `profiles` (Story 1):
  ```sql
  ALTER TABLE public.subjects
  ADD COLUMN biological_sex TEXT CHECK (biological_sex IN ('female', 'male', 'intersex', 'unknown')),
  ADD COLUMN birth_year INTEGER CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2100));
  ```

---

### Types Layer

#### [MODIFY] [types.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/integrations/supabase/types.ts)
- Update the `subjects` table interfaces manually to include `biological_sex` and `birth_year` for `Row`, `Insert`, and `Update` types:
  - `biological_sex: string | null` (and `biological_sex?: string | null` for Insert/Update)
  - `birth_year: number | null` (and `birth_year?: number | null` for Insert/Update)

#### [MODIFY] [SubjectSelector.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/observations/SubjectSelector.tsx)
- Update the local `Subject` interface to include optional fields:
  ```typescript
  export interface Subject {
    id: string;
    name: string;
    relationship_type: string;
    biological_sex?: string | null;
    birth_year?: number | null;
  }
  ```

---

### Components Layer

#### [MODIFY] [ManagedRelatives.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/premium/ManagedRelatives.tsx)
- Update the local `Subject` interface to include optional fields.
- Update `fetchSubjects` to select `biological_sex` and `birth_year` from Supabase.
- Add form states:
  - For creation: `newBiologicalSex` (null/string), `newBirthYear` (string)
  - For editing: `editBiologicalSex` (null/string), `editBirthYear` (string)
- In `handleAdd`, perform birth year validation (4-digit string, 1900 <= year <= current year) if a value is entered. Toast a localized error if invalid. Pass the parsed values to the `.insert()` payload.
- In `handleSaveEdit`, perform identical birth year validation if entered. Pass the parsed values to the `.update()` payload.
- In `startEdit` and `cancelEdit`, correctly set/reset edit states.
- Render the new optional fields:
  - **Add Form**: Optional biological sex select dropdown and numeric-only 4-digit birth year input field.
  - **Edit Form**: Optional biological sex select dropdown and numeric-only 4-digit birth year input field.
  - **List Display**: Display demographic details (e.g. `• Female, born 2012`) next to the relationship type if specified, dynamically translated.

---

## Verification Plan

### Automated Tests
- Run TypeScript compilation checks to ensure type safety:
  ```powershell
  & "C:\Users\veres.sz\AppData\Local\ms-playwright-go\1.57.0\node.exe" node_modules\typescript\bin\tsc --noEmit
  ```

### Manual Verification
1. **Creation Flow**:
   - Create an observed person with both biological sex and birth year specified.
   - Create an observed person with only one field specified.
   - Confirm consent check is still required.
2. **Edit Flow**:
   - Reopen edit mode and confirm the saved values are loaded and visible.
   - Modify the demographics (e.g. clear birth year or change sex) and verify they update/persist.
   - Confirm that editing name or relationship type without changing demographics preserves the demographics.
3. **Validation Flow**:
   - Enter an invalid birth year (e.g., `1850` or `2035` or letters) and verify that validation blocks the action and shows a localized error toast.
