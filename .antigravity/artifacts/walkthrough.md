# Walkthrough — Cookie Banner & Policy Protection

Implemented a bilingual, responsive, glassmorphic cookie banner on `grit.hu-live` and established protection to prevent automated code releases from `grit.hu-beta` from overwriting these files on production.

## 1. Git Protection Configuration
- **File modified:** [.github/workflows/release-to-prod.yml](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/.github/workflows/release-to-prod.yml)
- **Changes:** Added `"src/components/CookieBanner.tsx"` and `"src/pages/Cookies.tsx"` to the `protected_paths` array. 
- **Effect:** During syncs, `rsync` will completely ignore and preserve the versions of these files on production, preventing them from being overwritten or deleted.

## 2. Bilingual Translations
- **File modified:** [types.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/i18n/types.ts) — Defined the `cookieBanner` dictionary structure under `legal`.
- **File modified:** [hu.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/i18n/hu.ts) — Added Hungarian cookie banner translations.
- **File modified:** [en.ts](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/i18n/en.ts) — Added English cookie banner translations.

## 3. Cookie Banner Component
- **File created:** [CookieBanner.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/components/CookieBanner.tsx)
- **Features:**
  - Premium design using a glassmorphic background overlay (`bg-card/85 backdrop-blur-xl`), soft borders, and shadow styling to align with the "Clinical Core, Human Surface" design system.
  - Interactive transitions using `framer-motion` (slide-up entry, fade-out exit).
  - Multi-language support mapping dynamically to the active locale (`hu`/`en`).
  - Domain filtering: The banner only displays on `grit.hu`, `www.grit.hu`, or local environments (`localhost`, `127.0.0.1`, `::1`), keeping it silent on other development/beta branches if they don't require it.
  - Local storage caching using `grit_cookie_consent_v1` to persist user choice.

## 4. App Integration
- **File modified:** [App.tsx](file:///c:/Users/veres.sz/Documents/GitHub/grit.hu/src/App.tsx)
- **Changes:** Imported and rendered `<CookieBanner />` inside the `<LanguageProvider>` wrapper to ensure it is present on all routes and has access to current translation functions.

---

## How to Verify Manually

1. **Clear Local Storage:**
   - Open Developer Tools in your browser (F12).
   - Go to **Application** -> **Local Storage** -> `http://localhost:5173` (or your active local domain).
   - Clear any existing keys or delete `grit_cookie_consent_v1`.

2. **Verify Banner Appearance:**
   - Refresh the page.
   - You should see the premium floating cookie banner animate up at the bottom-right/center.

3. **Verify Language Switch:**
   - Toggle languages (HU / EN) using the language indicator.
   - Ensure the banner text and buttons update instantly without layout shifts.

4. **Accept & Dismiss:**
   - Click **Accept** (or **Elfogadom**).
   - Verify that the banner animates out smoothly.
   - Check Local Storage to confirm that `grit_cookie_consent_v1` is set to `"true"`.
   - Refresh the page and confirm the banner does not reappear.
