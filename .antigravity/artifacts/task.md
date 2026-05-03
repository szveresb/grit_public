# State of Play: Active Tasks

- [x] **Phase 1: Assets & Metadata**
    - [x] Capture Desktop screenshot for manifest using browser subagent.
    - [x] Capture Mobile screenshot for manifest using browser subagent.
    - [x] Update `vite.config.ts` with full manifest (short_name: "G", categories, maskable icons, screenshots).
    - [x] Update `index.html` with theme-color and apple-specific meta tags.
- [x] **Phase 2: Safety & Components**
    - [x] Upgrade `EmergencyExit.tsx` with cache-clearing logic.
    - [x] Create `ReloadPrompt.tsx` using `virtual:pwa-register`.
    - [x] Create `OfflineStatus.tsx` for "Sync Pending" notifications.
- [x] **Phase 3: Integration & Polish**
    - [x] Integrate PWA components into `App.tsx`.
    - [x] Verify PWA manifest validity and service worker registration.
    - [x] Finalize with a walkthrough.
