# Seed Observation Intensity From Mood Pulse

As a user logging a structured clinical observation (either via the standalone stepper or the guided journal flow), the observation intensity should default based on the mood pulse level logged for the same date and subject context. This creates a helpful default using an inverse mapping while still allowing full user override.

## User Review Required

> [!IMPORTANT]
> **Repository Confirmation**: As per the Critical Safety Rules, please confirm which repository (`grit.hu-beta` or `grit.hu`) we should proceed in. We assume `grit.hu-beta` is the correct target based on your request.

> [!NOTE]
> **Helper Text Display**: The helper text ("Suggested based on your mood check-in...") will only render if a matching mood pulse actually exists for the chosen date and subject. If no pulse exists, no helper text is shown.

## Open Questions

*None at this stage.*

---

## Proposed Changes

### Hooks Layer

#### [NEW] [useObservationIntensityDefault.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/hooks/useObservationIntensityDefault.ts)
- Create a shared, reusable hook that accepts:
  - `date: string` (the target date of the observation)
  - `subjectType: 'self' | 'relative'`
  - `subjectId: string | null`
- Query the `mood_pulses` table for the latest pulse for the given date, user, and subject context.
- Implement the inverse defaulting rule: `6 - pulseLevel` (e.g. pulse `2` maps to intensity `4`).
- Return:
  - `defaultIntensity: number` (the seeded value, falling back to `3`)
  - `source: 'pulse-seeded' | 'fallback'` (identifying if it was seeded from a pulse or used the fallback)
  - `loading: boolean`

---

### Components Layer

#### [MODIFY] [ObservationStepper.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/observations/ObservationStepper.tsx)
- Remove the local, duplicated `mood_pulses` fetch logic and `today` hardcoding.
- Integrate the new `useObservationIntensityDefault` hook using the `observationDate` and active stance subject context.
- Introduce the local union state `intensitySource` (`'pulse-seeded' | 'fallback' | 'manual'`) to track if the user has manually changed the intensity within the current draft session.
- Reset the draft session state when the active subject, observation date, or submission reset occurs.
- Render helper text using the shared translations.

#### [MODIFY] [EntryModal.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/checkin/EntryModal.tsx)
- Integrate the new `useObservationIntensityDefault` hook for the user's self stance (`subjectType: 'self'`, `subjectId: null`) and the entry date.
- Manage `intensitySource` local state.
- Update the intensity UI step to render the helper text under the slider when seeded from a pulse.

---

## Verification Plan

### Automated Tests
- Run TypeScript compiler validation to ensure no type errors are introduced:
  ```powershell
  & "C:\Users\veres.sz\AppData\Local\ms-playwright-go\1.57.0\node.exe" node_modules\typescript\bin\tsc --noEmit
  ```

### Manual Verification
1. **Self Observation Seeding**:
   - Log a mood pulse of `2/5` for today (Self).
   - Open the standalone observation stepper. Verify the default intensity is preselected as `4/5`, and the helper text says *"Suggested based on your mood check-in today"*.
   - Reopen a guided entry modal for today. Verify default intensity is `4/5`.
2. **Relative Observation Seeding**:
   - Log a mood pulse of `2/5` for a relative for today.
   - Switch stance to that relative, and open the stepper. Verify the default intensity is `4/5`.
3. **No Pulse Seeding**:
   - Go to a backdated day without any mood pulse.
   - Open both the stepper and the entry modal. Verify the intensity defaults to the neutral `3/5` and no helper text is shown.
4. **Stance Isolation**:
   - Ensure a relative's mood pulse does not seed a self observation, and vice versa.
5. **Manual Override Persistence**:
   - Change the intensity manually. Verify that the helper text changes to *"You've adjusted the weight"*.
   - Move back/forth in steps, or toggle categories. Ensure the manual selection is not lost or overwritten during the active draft session.
6. **Date Changes**:
   - Log a pulse for a past date.
   - Open a backdated entry/observation for that past date. Verify it seeds from the correct date's pulse.
