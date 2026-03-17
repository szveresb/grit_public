

## Horizontal Linear Timeline

**Goal**: Replace the current vertical linear timeline with a horizontal scrollable timeline where entries appear as dots/icons on a horizontal line, with click-to-expand details and pinch-to-zoom on mobile.

### Changes

**1. Rewrite `LinearTimeline` sub-component** in `src/pages/Timeline.tsx`

- **Horizontal layout**: A horizontal line (`h-px`) running left-to-right inside a scrollable container (`overflow-x-auto`), with date markers and entry dots/icons placed along it
- **Entry rendering**: Each entry is a colored dot or type-specific icon (`FBookOpen`, `FEye`, `FClipboardCheck`) positioned on the horizontal axis, grouped by date with date labels below
- **Click to expand**: Clicking a dot/icon shows a popover or an inline detail card below the timeline strip with title, type label, date, and detail text
- **Pinch-to-zoom on mobile**: Set `touch-action: manipulation` on the scrollable container and wrap the inner content in a scalable div. Use CSS `transform: scale()` driven by touch gesture state (tracking two-finger pinch distance) to allow zooming into dense areas. Alternatively, use a simpler approach: make the inner track wider than viewport (e.g., `min-width: max(100%, items * spacing)`) so horizontal scroll + pinch-zoom works natively
- **Selected state**: Highlighted ring/scale on the active dot, with the detail card appearing below

**2. Styling details**
- Horizontal scrollbar hidden with `scrollbar-hide` utility or `-webkit-scrollbar: none`
- Date labels appear at intervals (one per date group) below the line
- Dots: `h-3 w-3 rounded-full` colored by type; on hover/focus scale up
- Month boundaries get a subtle vertical separator

**3. No new i18n keys needed** — reuses existing labels

### Files
- **Edit** `src/pages/Timeline.tsx` — rewrite `LinearTimeline` to horizontal layout with zoom support

