# Implementation Plan — Cookie Banner & Policy Protection

Implement a bilingual cookie banner on `grit.hu-live` (production) and safeguard it (along with the cookie policy page) so that automated code promotions from `grit.hu-beta` do not overwrite or remove them on production.

## User Review Required

> [!IMPORTANT]
> **Repository Confirmation Required:** Under the project safety rules, I must explicitly ask you to confirm which repository (`grit.hu` or `grit.hu-beta`) I should perform the changes in. 
> Since we want the code integration to be robust, we propose checking the changes into the common repository branch (so the code is available in both and integrates smoothly into `App.tsx`), but we will use domain detection and git protection to ensure the banner only activates on production and its configuration cannot be overwritten. Please confirm which repository you want me to commit the changes to.

> [!NOTE]
> The Cookie Policy page itself ([Cookies.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/pages/Cookies.tsx)) is already implemented in the frontend and displays the legal text from the database (falling back to the local translation dictionary). We will protect this page from any sync overwrites.

## Open Questions

> [!IMPORTANT]
> 1. **Which Repository to Target:** Please confirm whether I should work in `grit.hu` (production) or `grit.hu-beta` (beta). (Usually, checking the base setup into both repositories and applying domain checks + git sync exclusions is the most robust approach to avoid future merge conflicts).
> 2. **Cookie Banner Design:** We will design a floating banner at the bottom of the viewport using glassmorphism styling (`backdrop-blur`), complying with the "Clinical Core, Human Surface" styling guidelines. Please let us know if you prefer a different layout.

---

## Proposed Changes

### Configuration Layer

#### [MODIFY] [release-to-prod.yml](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/.github/workflows/release-to-prod.yml)
- Add the new cookie banner file and the cookies page file to the `protected_paths` array. This ensures that any `rsync` sync run from `grit.hu-beta` to `grit.hu-live` will exclude/preserve these files.
- Protected paths to add:
  - `"src/components/CookieBanner.tsx"`
  - `"src/pages/Cookies.tsx"`

### Translation Layer

#### [MODIFY] [types.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/i18n/types.ts)
- Add types for the `cookieBanner` dictionary structure under `legal`.

#### [MODIFY] [hu.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/i18n/hu.ts)
- Add Hungarian translations for the cookie banner text, accept button, and policy link.

#### [MODIFY] [en.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/i18n/en.ts)
- Add English translations for the cookie banner text, accept button, and policy link.

### Frontend Layer

#### [NEW] [CookieBanner.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/CookieBanner.tsx)
- Create a beautiful, responsive, floating cookie banner using Tailwind CSS and Framer Motion.
- Restrict rendering to live domains (`grit.hu`, `www.grit.hu`) and `localhost` (for testing/development).
- Persist consent selection in `localStorage` under the key `grit_cookie_consent_v1`.

#### [MODIFY] [App.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/App.tsx)
- Import and render `<CookieBanner />` globally within the routing context.

---

## Verification Plan

### Automated Tests
- Run `npm run dev` to verify compilation and check for lint or TypeScript errors.

### Manual Verification
- Verify that the cookie banner is shown on `localhost` if no consent has been stored yet.
- Verify translation toggles (HU <-> EN) in the cookie banner.
- Click "Accept" and verify that the banner disappears and `grit_cookie_consent_v1` is stored in `localStorage`.
- Refresh the page and ensure the banner does not reappear.
