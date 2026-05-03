## Goal
Make the beta waitlist obvious from the admin navigation by adding a dedicated **"Beta Signups"** entry in the sidebar's Management group that routes to `/manage-users`, with a small badge showing the pending applicant count.

## Changes

### 1. `src/components/AppSidebar.tsx`
- In the `editorItems` array, add a new admin-only item just above the existing `manageUsers` entry:
  - title: `t.nav.betaSignups` (new i18n key, fallback "Beta Signups")
  - url: `/manage-users`
  - icon: `FUsers` (or `FHeartPulse` — sticking with `FUsers` for consistency)
- Render a small pending-count badge to the right of the label (using existing `Badge` styling). Count comes from a tiny inline query: `select id from waitlist_emails where status = 'pending'`, fetched once when the sidebar mounts for an admin user. Hide the badge when count is 0.
- Keep the existing "Manage Users" entry intact (it still groups roles + invite codes + signups on the same page).

### 2. `src/i18n/hu.ts`, `src/i18n/en.ts`, `src/i18n/types.ts`
- Add `nav.betaSignups`:
  - HU: `"Béta jelentkezők"`
  - EN: `"Beta Signups"`

### 3. `src/pages/ManageUsers.tsx` (small UX polish)
- Add `id="beta-signups"` to the Beta Signups card so the new nav link can deep-link to it via `/manage-users#beta-signups` and smooth-scroll on arrival.
- Update the AppSidebar entry's `url` to `/manage-users#beta-signups`.

## Out of scope
- No changes to RLS, edge functions, or the waitlist data model.
- No changes to the public landing page.

## Acceptance
- Logged in as admin (`szveresb@gmail.com`), the left sidebar Management group shows **Beta Signups** with a "2" badge.
- Clicking it navigates to `/manage-users` and scrolls to the Beta Signups card.
- Non-admins do not see the entry.
- HU/EN labels both render correctly.
