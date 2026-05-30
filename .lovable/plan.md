## Goal

On tablet/mobile (below `md`), the authenticated app header currently hides its whole nav (`hidden md:flex`). On `md` (tablet) it shows Library, Surveys, Check-in, and About — but Library, Surveys, and Check-in are already in the AppSidebar. Only **About (Rólunk)** has no sidebar equivalent.

Per request: at tablet/mobile widths, the top header nav should show only those items that are NOT already linked in the side menu — i.e. just **Rólunk**.

## Change

**`src/components/DashboardLayout.tsx`** — header `<nav>` block (lines 98–107):

- Always render the nav (drop `hidden md:flex`; use `flex`).
- Show Library / Surveys / Check-in only at `lg+` (they live in the sidebar, which is what's available on smaller widths).
- Always show the About link.

Effectively:
```tsx
<nav className="flex items-center justify-center flex-1 gap-4 md:gap-8">
  <Link ... className="hidden lg:inline-flex ...">{t.nav.library}</Link>
  <button ... className="hidden lg:inline-flex ...">{t.nav.surveys}</button>
  <button ... className="hidden lg:inline-flex ...">{t.nav.checkIn}</button>
  <a href={`${localePath('/')}#about`} className="...">{t.nav.about}</a>
</nav>
```

The `lg` breakpoint (1024px) matches `useIsMobile`'s threshold, so the rule reads: while the sidebar is the primary navigation surface (mobile + tablet), the top bar exposes only the items the sidebar lacks.

## Out of scope

- `PublicHeader` (unauthenticated pages) — unchanged.
- AppSidebar — already contains Library/Surveys/Check-in.
- No i18n or business-logic changes.
