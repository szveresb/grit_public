# Walkthrough: Seed Observation Intensity From Mood Pulse

I have successfully implemented the shared defaulting rule for pre-seeding observation intensity from logged mood pulses on the same date and subject context using the inverse mapping: `6 - pulseLevel`.

## 1. Changes Made

### Hooks

#### [NEW] [useObservationIntensityDefault.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/hooks/useObservationIntensityDefault.ts)
- Created a shared, strictly typed React hook to query the `mood_pulses` table for the active user, date, and subject context.
- Implemented the explicit inverse mapping formula `6 - pulseLevel` mapping:
  - `1` (Struggling) $\rightarrow$ `5` (Overwhelming)
  - `2` (Uneasy) $\rightarrow$ `4` (Heavy)
  - `3` (Okay) $\rightarrow$ `3` (Moderate)
  - `4` (Good) $\rightarrow$ `2` (Light)
  - `5` (Strong) $\rightarrow$ `1` (Minimal)
- Returns `defaultIntensity` (defaults to `3`), the `source` (`'pulse-seeded' | 'fallback'`), and `loading`/`error` states.

---

### Components

#### [MODIFY] [ObservationStepper.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/observations/ObservationStepper.tsx)
- Integrated the new `useObservationIntensityDefault` hook to fetch and map the daily pulse level dynamically.
- Cleaned up duplicated and hardcoded `today` query logic.
- Managed a local `intensitySource` (`'pulse-seeded' | 'fallback' | 'manual'`) state to preserve manual user overrides correctly during the draft session.
- Configured state resets to trigger when the target date or active subject context changes.
- Updated the helper text section to display `"Suggested based on your mood check-in today"` (in HU or EN) when seeded, and `"You've adjusted the weight"` when manually overridden.

#### [MODIFY] [EntryModal.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu-beta/src/components/checkin/EntryModal.tsx)
- Integrated the new `useObservationIntensityDefault` hook for the self perspective context on the selected entry date.
- Added a local `intensitySource` state to track user manual overrides and protect them from async loading overwrites.
- Added the same helper text message block under the intensity buttons for visual parity with the stepper.

---

## 2. Verification Results

### Compilation Check
- Run compilation check using TypeScript compiler:
  ```powershell
  & "C:\Users\veres.sz\AppData\Local\ms-playwright-go\1.57.0\node.exe" node_modules\typescript\bin\tsc --noEmit
  ```
  - **Result**: Successfully compiled with **0 errors**.
