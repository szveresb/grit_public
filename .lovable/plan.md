

## Refactor Entry Creation into a Modal Overlay

### Overview

Replace the current inline `JournalForm` and page-level `showJournalForm` state with a single **Dialog-based modal** that houses the full observation-to-journal flow. All entry points (calendar "new entry", QuickPulse mood click) open this same modal. The calendar and page remain mounted and visible beneath the overlay.

### Modal Flow (Sequential Steps)

```text
┌────────────────────────────────────────┐
│  New Entry — March 17                  │
│────────────────────────────────────────│
│  Step 1: Select Category (domain)      │
│    → cards for each obs category       │
│────────────────────────────────────────│
│  Step 2: Select Concept                │
│    → Title auto-fills (locked)         │
│────────────────────────────────────────│
│  Step 3: Severity (1–5 scale)          │
│────────────────────────────────────────│
│  [Save]  [▸ Add more details]          │
│                                        │
│  (collapsible: event_description,      │
│   emotional_state, self_anchor,        │
│   free_text)                           │
│────────────────────────────────────────│
│  [Save]  [Cancel]                      │
└────────────────────────────────────────┘
```

### New Component: `EntryModal`

Create `src/components/checkin/EntryModal.tsx`:

- Uses `<Dialog>` from `@/components/ui/dialog` with `modal={true}` so background doesn't scroll
- Props: `open`, `onOpenChange`, `entryDate: string`, `prefill?: { emotional_state, impact_level }`, `onSaved: () => void`
- Internal state machine with 4 steps: `category → concept → intensity → done`
- Fetches categories/concepts from Supabase (same logic as `ObservationTree`)
- On concept selection: locks the Title field to the concept's localized name
- Step 3 (intensity): 1–5 scale identical to current design
- After step 3: shows primary "Save" button + a "Add more details" collapsible toggle
  - Collapsible section contains: event_description, emotional_state, self_anchor, free_text textareas
- Save handler: inserts `journal_entries` row (title = concept name, entry_date = selected date, impact_level = intensity), then inserts linked `observation_logs` row
- On save success: closes modal, calls `onSaved()` to trigger refresh
- Focus management: `DialogContent` auto-manages focus; internal scroll container with `overflow-y-auto max-h-[80vh]`

### Changes to `CheckIn.tsx`

- Remove `showJournalForm`, `form`, `saving`, `handleJournalSubmit` state/handlers
- Remove inline `<JournalForm>` render
- Add `entryModalOpen` + `entryModalDate` + `entryModalPrefill` state
- QuickPulse `onMoodSelected`: sets `entryModalDate = today`, `entryModalPrefill = { emotional_state, impact_level }`, opens modal
- Calendar `onCreateEntry`: sets `entryModalDate = selected date`, no prefill, opens modal
- Render `<EntryModal>` once at bottom of component

### Changes to `FeedCalendar.tsx`

No changes needed — it already calls `onCreateEntry(date)` which CheckIn handles.

### QuickPulse Integration

When QuickPulse provides a mood, the modal opens with:
- `entryDate` = today
- The collapsible "more details" section pre-expanded with `emotional_state` pre-filled
- Step flow starts at step 1 (category selection) as usual — the mood prefill populates the journal fields, not the observation steps

### Files to Create
- `src/components/checkin/EntryModal.tsx` — the new modal component

### Files to Modify
- `src/pages/CheckIn.tsx` — swap inline JournalForm for EntryModal, update QuickPulse handler

### Files Potentially Removable
- `src/components/journal/JournalForm.tsx` — if no other page uses it (check first; if Journal page still exists separately, keep it)
- `src/components/journal/ObservationTree.tsx` — logic absorbed into EntryModal

