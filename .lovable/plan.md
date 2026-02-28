

# Consolidate Journal and Self-Check: "Clinical Core, Human Surface"

## Summary

Unify the journal and observation workflows into a single, emotionally safe experience. The user interacts with warm, human language ("What's on your mind?", "How heavy was it?") while the database silently records SNOMED/BNO-coded clinical data. No new database tables needed -- this is a UI/UX consolidation of existing data flows.

---

## What Changes

### 1. Unified "Check-in" Page (replaces separate Journal + Self-Checks pages)

Merge the current `/journal` and `/self-checks` into a single `/check-in` page with a tab-free, progressive flow:

**Top section: "Quick Pulse"** -- a fast daily check-in (always visible)
- Row of 5 emoji-style mood buttons (1-5 intensity) with labels like "Struggling", "Uneasy", "Okay", "Good", "Strong"
- One-tap logs a lightweight journal entry with today's date, the selected mood as `impact_level`, and `emotional_state` auto-set from the label
- Optional: tap to expand into the full journal form

**Middle section: "What happened?"** -- the structured observation stepper
- Reframe step labels: "What's going on?" -> "How heavy?" -> "Anything to add?"
- Keep the existing 3-step ObservationStepper but with warmer placeholder text
- Concept labels already use `name_hu`/`name_en` (human-friendly); no change needed there

**Bottom section: "Your story"** -- unified chronological feed
- Interleave journal entries, observation logs, and questionnaire completions in one scrollable list
- Each card shows type indicator (subtle icon), human title, date, and expandable detail
- Replaces the separate JournalEntryCard list and ObservationHistory

### 2. Localize All Hardcoded English Strings

Currently hardcoded in `JournalForm.tsx` and `JournalEntryCard.tsx`:
- "New Journal Entry", "Edit Journal Entry", "Title", "Date", "What happened?", "Impact Level", "How are you feeling?", "Self-Anchor", "Additional Notes", "Save Entry"
- "Delete entry?", "Impact:", "What happened:", "Feeling:", "Self-Anchor:", "Notes:", "Saved Reflection", "New Reflection", "Reflect on this entry", "Save Reflection", "Dismiss", "Remove"

Add ~25 new i18n keys under `journal.*` in types.ts, en.ts, hu.ts. Use warm Hungarian phrasing (e.g., "Mi tortent?" not clinical terms).

### 3. Reframe Labels to "Human Surface" Language

| Current Label | New Label (EN) | New Label (HU) |
|---|---|---|
| Self-Checks | Check-in | Bejelentkezes |
| Observations | Discoveries | Felfedezesek |
| Impact Level | How heavy was it? | Mennyire volt nehez? |
| Intensity | Weight | Suly |
| Log Observation | Note this | Feljegyzem |
| Self-Anchor | My truth | Az en igazsagom |
| Event Description | What happened? | Mi tortent? |

### 4. Progressive Disclosure on Observation Cards

In the unified feed, observation entries show only the human label and intensity dot by default. An "Advanced" or "Details" expandable section reveals:
- SNOMED concept code
- BNO code
- Frequency and context metadata

This satisfies the "data collection" without overwhelming the user.

### 5. Dashboard "Daily Pulse" Widget

Replace the current ActionGrid's "Log Observation" card with an inline quick-pulse row:
- 5 tappable circles labeled with mood words
- Single tap creates a minimal journal entry and shows a toast
- Below: "Want to go deeper?" link to `/check-in`

### 6. Timeline Pattern Nudges

Add a small insight banner at the top of the Timeline page when patterns are detected:
- Query observation_logs for the current week, count by concept
- If any concept appears 3+ times, show: "You've noticed [concept name] [count] times this week"
- Use human labels, never clinical codes

---

## Routing Changes

| Old Route | New Route | Notes |
|---|---|---|
| `/journal` | `/check-in` | Unified page |
| `/self-checks` | `/check-in` | Redirect or merge |
| `/journal` | redirect to `/check-in` | Keep old URL working |
| `/self-checks` | redirect to `/check-in` | Keep old URL working |

The sidebar nav collapses "Journal" and "Self-Checks" into a single "Check-in" entry.

---

## File Changes

| File | Change |
|---|---|
| `src/pages/CheckIn.tsx` | **NEW** -- Unified page with Quick Pulse, ObservationStepper, and merged chronological feed |
| `src/pages/Journal.tsx` | Redirect to `/check-in` (keep file minimal) |
| `src/pages/SelfChecks.tsx` | Redirect to `/check-in`; questionnaire editor stays accessible via a "Manage" tab for editors |
| `src/App.tsx` | Add `/check-in` route, keep old routes as redirects |
| `src/components/AppSidebar.tsx` | Replace Journal + Self-Checks nav items with single "Check-in" item |
| `src/components/ActionGrid.tsx` | Replace "Log Observation" card with inline pulse widget |
| `src/components/journal/JournalForm.tsx` | Replace hardcoded English with i18n keys; reframe labels |
| `src/components/journal/JournalEntryCard.tsx` | Replace hardcoded English with i18n keys; add progressive disclosure for clinical codes |
| `src/components/checkin/QuickPulse.tsx` | **NEW** -- 5-mood one-tap component |
| `src/components/checkin/UnifiedFeed.tsx` | **NEW** -- Merged chronological feed of journals + observations + questionnaires |
| `src/components/observations/ObservationStepper.tsx` | Reframe step labels to warmer language |
| `src/pages/Timeline.tsx` | Add pattern nudge banner |
| `src/pages/Dashboard.tsx` | Include observations in recent activity feed |
| `src/i18n/types.ts` | Add ~30 new keys for journal form, entry card, check-in, pulse |
| `src/i18n/en.ts` | Add English values with warm, non-clinical phrasing |
| `src/i18n/hu.ts` | Add Hungarian values with official but approachable phrasing |
| `SYSTEM_DESCRIPTION.md` | Document the "Clinical Core, Human Surface" philosophy and unified check-in |

---

## What Stays Unchanged

- **Database schema** -- no migrations needed; existing tables handle all data
- **SNOMED/BNO coding** -- remains invisible to users, fully intact in the backend
- **RLS policies** -- no changes
- **Edge functions** (reflect, patterns, export) -- no changes
- **Questionnaire editor** -- moves into a sub-tab of Check-in for editors only
- **Export page** -- unchanged, continues to output FHIR/BNO data

