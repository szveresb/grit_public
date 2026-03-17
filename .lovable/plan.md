

## Merge Napló + Előzmények into One Page

The "Napló" (Journal/CheckIn at `/journal`) and "Előzmények" (Timeline at `/timeline`) pages overlap significantly — both show the same activity data. The plan is to consolidate them into the single `/journal` page and remove `/timeline` as a separate route.

### What changes

1. **Integrate timeline visualizations into CheckIn page** (`src/pages/CheckIn.tsx`):
   - Import and add `MoodTrendChart` (already requested to keep mood tracking)
   - Import and add `HorizontalTimeline` (dot viewer) + `PatternChart`
   - Add the pattern nudge banner from Timeline
   - Fetch the same data Timeline fetches (mood points, obs logs, concept map, timeline items) inside CheckIn
   - Place these sections between QuickPulse and the observation stepper

2. **Remove the "Te történeted" list view** from CheckIn:
   - Remove the `UnifiedFeed` component usage (the list-view feed)
   - Remove the list/calendar view toggle — keep only the calendar (`FeedCalendar`)
   - The HorizontalTimeline dot viewer replaces the list as the quick-scan visual

3. **Remove `/timeline` route and page**:
   - Delete `src/pages/Timeline.tsx`
   - Remove `/timeline` and `/en/timeline` routes from `App.tsx`, add redirect to `/journal`
   - Remove the "Előzmények" sidebar nav item from `AppSidebar.tsx`

4. **Update navigation references**:
   - Remove `cameFromTimeline` back-button logic from CheckIn (no longer needed)
   - Update any `localePath('/timeline')` references across the codebase to `/journal`
   - Clean up i18n keys if desired (can keep `timeline.*` keys since the components still use them)

### Resulting page layout (top → bottom)

```text
┌─ Header: "Napló" ─────────────────────┐
│ QuickPulse (mood selector)            │
│ RecapBanner (if inactive 14+ days)    │
│ JournalForm (when open)               │
│ MoodTrendChart                        │
│ PatternChart (8-week obs frequency)   │
│ HorizontalTimeline (dot viewer)       │
│ ObservationStepper (collapsible)      │
│ FeedCalendar (monthly calendar only)  │
│ EntryReflectDialog                    │
└───────────────────────────────────────┘
```

### Files to modify
- `src/pages/CheckIn.tsx` — add timeline data fetching + visualization components, remove UnifiedFeed list view
- `src/App.tsx` — redirect `/timeline` → `/journal`, remove Timeline import
- `src/components/AppSidebar.tsx` — remove the "Előzmények" nav item
- `src/pages/Timeline.tsx` — delete file
- `src/components/checkin/UnifiedFeed.tsx` — can be deleted (no longer used)

