

## Recap / Catch-Up CTA for Inactive Users

**Goal**: Show a prominent banner when the user hasn't logged a journal entry in 14+ days, encouraging them to catch up and optionally create a backdated entry.

### Approach

1. **Detect inactivity**: In `CheckIn.tsx`, after entries load (via `calendarItems` or a dedicated query), compute `daysSinceLastEntry` from the most recent `entry_date`. If ≥ 14 days, show the CTA.

2. **New component `RecapBanner.tsx`** (`src/components/checkin/RecapBanner.tsx`):
   - Warm, encouraging card with the number of days since last entry
   - "Catch up" button that opens `JournalForm` pre-filled with today's date
   - Dismiss button (session-only, state in parent)
   - Styled consistently with existing `bg-card/60 backdrop-blur border rounded-3xl` pattern

3. **Placement**: Between the QuickPulse section and the observation stepper in `CheckIn.tsx`. Also show on the `/journal` page above the entry list.

4. **i18n**: Add to `checkIn` section in types/en/hu:
   - `recapTitle` — e.g. "It's been a while" / "Rég jártál itt"
   - `recapMessage` — e.g. "You haven't logged in {days} days. How have you been?" / "Nem írtál {days} napja. Hogy vagy?"
   - `recapCta` — "Catch up" / "Írj pár sort"

5. **Logic details**:
   - Query `journal_entries` for `max(entry_date)` for the current user
   - Compare against today; if diff ≥ 14, render `RecapBanner`
   - Clicking CTA calls `openJournalForm()` (existing function)
   - Banner hides after dismiss or after a new entry is saved (via `refreshKey` change)

### Files to create/modify
- **Create** `src/components/checkin/RecapBanner.tsx`
- **Edit** `src/pages/CheckIn.tsx` — add inactivity check + render banner
- **Edit** `src/pages/Journal.tsx` — same banner above entry list
- **Edit** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/hu.ts` — new strings

