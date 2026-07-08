# Active Tasks: Cookie Banner & Sync Protection

- [x] **Phase 1: Configuration & Git Protection**
    - [x] Update `.github/workflows/release-to-prod.yml` to include cookie banner and page files in `protected_paths`.
- [x] **Phase 2: Translation Additions**
    - [x] Update `src/i18n/types.ts` with `cookieBanner` structure under `legal`.
    - [x] Update `src/i18n/hu.ts` with Hungarian translation strings.
    - [x] Update `src/i18n/en.ts` with English translation strings.
- [x] **Phase 3: Cookie Banner Component**
    - [x] Create `src/components/CookieBanner.tsx` with premium floating glassmorphic layout, domain checking, and local storage state.
- [x] **Phase 4: App Integration**
    - [x] Modify `src/App.tsx` to import and render `<CookieBanner />` globally.
- [x] **Phase 5: Verification & Walkthrough**
    - [x] Verify that the application builds correctly.
    - [x] Create a `walkthrough.md` artifact.
