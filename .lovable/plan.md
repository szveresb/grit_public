

# Create Separate Library Page

## What Changes

1. **New `/library` page** -- A public page showing all published library articles with search/filter, reusing the same card design from the landing page.

2. **Landing page updates:**
   - Library section limited to **max 6 articles** (newest first)
   - Each card links to the article URL (external) or is a static card if no URL
   - Add a "View All" link to `/library` page below the 6 cards
   - **Remove** the entire "Research Summaries" section
   - Update nav links from `#library` anchor to `/library` route

3. **Navigation updates** -- Both desktop and mobile nav: "Konyvtar" links to `/library` page, remove "Kutatasi osszefoglalok" link entirely.

4. **Routing** -- Add `/library` and `/en/library` routes in `App.tsx` (public, no auth required).

---

## Technical Details

### New file: `src/pages/Library.tsx`
- Public page (no ProtectedRoute)
- Fetches all published `library_articles` ordered by `created_at desc`
- Search input + category filter (reuse pattern from ManageLibrary)
- Same card design as landing page
- Uses landing page layout (bamboo bg, header, footer) or a simpler standalone layout

### Modified files:

**`src/App.tsx`** -- Add routes:
- `/library` and `/en/library` pointing to new Library component

**`src/pages/Index.tsx`**:
- Limit articles query to `.limit(6)` 
- Remove Research Summaries section (lines 180-207)
- Change nav links from `#library` / `#research` to `localePath('/library')`
- Remove `#research` nav item from both desktop and mobile menus
- Add "View all" link below the 6-card grid pointing to `/library`
- Update hero "Browse Library" button to link to `/library`

**`src/i18n/hu.ts`** and **`src/i18n/en.ts`**:
- Add `landing.viewAll` key ("Osszes megtekintese" / "View all")
- Keep existing keys, no removals needed

**`src/i18n/types.ts`**:
- Add `viewAll` to the landing section type

### No database changes required.
