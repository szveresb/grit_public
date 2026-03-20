

## Granular Consent Mechanism — "Sovereign Consent"

### Overview

A card-based consent carousel that activates after first login, educating users on data handling while collecting granular consent. Revisitable from the Profile page as a "Privacy & AI Control" section with toggleable data categories.

### Database

**New table: `user_consents`**
- `id` uuid PK
- `user_id` uuid NOT NULL (references auth.users)
- `consent_key` text NOT NULL (e.g. `journal_storage`, `observation_storage`, `mood_tracking`, `free_text_ai`, `pattern_detection`, `fhir_export`, `anonymized_analytics`)
- `granted` boolean NOT NULL DEFAULT false
- `updated_at` timestamptz DEFAULT now()
- UNIQUE(`user_id`, `consent_key`)
- RLS: users can only read/write own rows (`auth.uid() = user_id`)

**New column on `profiles`:**
- `consent_completed` boolean DEFAULT false — tracks whether the user has completed the initial consent flow

### Consent Categories (7 cards)

1. **Journal & Observations** — storing personal entries and observation logs
2. **Mood Tracking** — QuickPulse data collection
3. **Free Text Processing** — AI analysis of narrative fields
4. **Pattern Detection** — AI-powered trend identification across date ranges
5. **Questionnaire Data** — storing survey responses and scores
6. **FHIR Export** — mapping data to clinical codes for portability
7. **Anonymized Analytics** — contributing to aggregate (k-anonymous) statistics

Each card shows: icon, human-surface title, 2-sentence plain explanation, toggle switch, and a "Learn more" expandable section.

### Components

1. **`src/components/consent/ConsentCarousel.tsx`** — Embla carousel with 7 consent cards + summary card. Each card is a rounded-3xl soft-UI card with a Switch toggle. Final card shows a summary of all choices with a "Confirm & Continue" button. Saves all consents to `user_consents` and sets `profiles.consent_completed = true`.

2. **`src/components/consent/ConsentCard.tsx`** — Individual card: icon, title, description, toggle, optional "Learn more" collapsible.

3. **`src/components/consent/ConsentSummary.tsx`** — Summary card showing all 7 toggles with their current state, used both as the final carousel slide and in the Profile page.

4. **`src/components/consent/ConsentDashboard.tsx`** — Profile-embeddable version with "Advanced Settings" progressive disclosure (category-specific date ranges and sub-toggles for Pattern Detection).

### Integration Points

**ProtectedRoute** — After auth check, if `consent_completed` is false, redirect to `/consent` (or `/en/consent`).

**Auth.tsx** — No changes needed; the redirect happens in ProtectedRoute after successful login.

**App.tsx** — Add `/consent` and `/en/consent` routes pointing to a new `ConsentOnboarding` page (protected but exempt from consent check).

**Profile.tsx** — Add a new card section "Privacy & AI Control" with the `ConsentDashboard` component, allowing users to review and update their consents at any time.

**RecapBanner** — After completing consent, show a one-time banner on the journal page confirming privacy settings are active.

### New Page

**`src/pages/ConsentOnboarding.tsx`** — Full-screen page (no sidebar) with the ConsentCarousel centered. Bamboo background, same aesthetic as Auth page. On completion, navigates to `/journal`.

### i18n

Add `consent` section to Dictionary with keys for each card title, description, learn-more text, summary heading, confirm button, and profile section labels. Both `hu.ts` and `en.ts`.

### Flow

```text
Sign Up → Email Verify → First Login
  → ProtectedRoute checks profiles.consent_completed
  → false → redirect to /consent
  → ConsentCarousel (7 cards + summary)
  → "Confirm" → upsert user_consents rows + set consent_completed
  → Navigate to /journal with RecapBanner

Profile → Privacy & AI Control section
  → ConsentDashboard with toggles
  → Changes saved immediately via upsert
  → "Advanced Settings" expands date-range/category filters for Pattern Detection
```

### Implementation Steps

1. Database migration: create `user_consents` table with RLS; add `consent_completed` to `profiles`
2. Create consent components (ConsentCard, ConsentCarousel, ConsentSummary, ConsentDashboard)
3. Create ConsentOnboarding page
4. Update ProtectedRoute to check consent status
5. Add consent routes to App.tsx
6. Add ConsentDashboard to Profile page
7. Add all i18n keys (hu + en)

