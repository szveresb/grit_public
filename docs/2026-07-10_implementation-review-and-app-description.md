# Grit.hu Implementation Review And Independent App Description

**Timestamp:** 2026-07-10 18:26 CEST

## Review Findings

### 1. Closed beta access is not enforced in the active route graph

The codebase still contains a `BetaGate` screen and a `useBetaAccess` hook, but the live router does not register a `/beta-gate` route and the shared route guard does not check `beta_access`.

- `src/App.tsx` defines the authenticated routes, but there is no `/beta-gate` or `/en/beta-gate` entry and no import of the `BetaGate` page in the active route table.
- `src/components/ProtectedRoute.tsx` only checks authentication, consent completion, and an optional role. It does not evaluate `beta_access`.
- `src/pages/BetaGate.tsx` assumes a protected route will block non-authorized users and later allow `/journal`, but that assumption is currently false.

Practical effect: the closed-beta model described in the architecture documents is dormant in the current implementation.

### 2. The profile-level "export all data" action does not export all user data

`src/pages/Profile.tsx` exposes a button labeled as full data export, but its `handleExport()` function only exports:

- `journal_entries`
- `questionnaire_responses`
- nested questionnaire answers

It omits other first-class user data already present in the app:

- `mood_pulses`
- `observation_logs`
- `subjects`
- `user_consents`
- `consent_history_logs`
- `user_feedback`

Practical effect: the profile page overstates export completeness. The dedicated `Export` page is materially more complete.

### 3. Mood pulse recording is treated as one-record-per-day in the UI, but not enforced structurally

`src/components/checkin/QuickPulse.tsx` loads the latest pulse for a date/subject pair, updates that record if found, and inserts a new row otherwise. That creates an application-level expectation of one pulse per day per subject, but there is no evidence in the migrations of a unique constraint enforcing that rule.

Practical effect:

- duplicate rows are possible outside the expected UI path
- the widget resolves duplicates by taking the latest row rather than reconciling the day as a single fact
- trend and export data may contain inconsistent same-day duplicates

This is primarily a data integrity issue, not a privacy issue.

## Independent App Description

Grit.hu is a bilingual, stance-aware personal documentation and sensemaking application for people living in high-conflict relational environments. It combines four product layers:

1. A public knowledge layer: articles, legal pages, category pages, and publicly previewable surveys.
2. A private self-documentation layer: journal entries, daily mood pulses, and structured observations.
3. A multi-perspective layer: the same logging model can be switched from "self" to a selected supported person.
4. A measurement layer: repeatable questionnaires with scoring, subscales, historical trends, and evidence-backed interpretations.

The app is not a social network. It is a private logging, reflection, export, and admin-managed content system built on React, Vite, TypeScript, and Supabase.

Its core product idea is consistent across the code: the frontend speaks in warm, low-friction language, while the backend stores more structured, clinically interoperable data such as observation concepts, SNOMED-style codes, BNO mappings, scoring ranges, and exportable observation payloads.

## Data Protection Evaluation And Overview

### Overall assessment

The current implementation has a serious privacy-oriented design intent and several real controls, but the protection model is mixed. Some controls are enforced at the database and workflow layers, while others are only UI conventions or documented aspirations.

### Protection strengths

- Supabase Row Level Security is clearly the main containment model. Core user tables are modeled as user-owned and queried with user-scoped filters throughout the frontend.
- Consent is first-class in the product. `ProtectedRoute` enforces consent completion before most authenticated routes, and `ConsentGate` disables feature surfaces like mood tracking, questionnaire logging, and pattern detection unless the relevant consent exists.
- The app separates self and supported-person data using `subject_type` and `subject_id` across mood pulses, observations, and questionnaire responses.
- Export functionality includes a therapist-oriented summary and a FHIR-shaped observation export, which is a structured rather than ad hoc data-release path.
- Feedback collection includes contextual metadata, but access is limited to admin review surfaces.
- The app uses `friendlyDbError()` to avoid raw database errors surfacing to end users.

### Protection limits and tradeoffs

- Consent is enforced mainly as product gating, not as a hard data-lifecycle policy. The code does not indicate deletion, redaction, or retroactive suppression of already stored data when consent is withdrawn.
- Consent state is cached in `localStorage`. That improves UX, but it also stores a local footprint of sensitive preference data on the device.
- The profile-level export is incomplete, which weakens user transparency.
- The documented closed-beta access model is not actively enforced in the route layer.
- Subject creation and relative logging create third-party data inside the user's private workspace. This is intentional product behavior, but it raises a higher sensitivity threshold than self-only journaling.

### Practical protection rating

- Access control: strong
- Subject isolation: strong
- Consent UX: strong
- Consent as hard governance control: partial
- Data transparency/export consistency: partial
- Beta access restriction: currently weak/inactive

## Mood Pulse Logs And Their Relations

`mood_pulses` is the lightest-weight logging table in the app. A pulse records:

- `user_id`
- `level` from 1 to 5
- a user-facing `label`
- `entry_date`
- `subject_type`
- optional `subject_id`

In the product, mood pulses are the first action in the check-in flow. The `QuickPulse` component sits at the top of each workspace and supports both self and supported-person logging, including backdated entry by date picker.

Relations and downstream use:

- `mood_pulses` feeds `useMoodTrendData()`, which renders the mood chart for the active subject context.
- `ObservationStepper` and `EntryModal` both call `useObservationIntensityDefault()`, which maps the day's mood pulse to a suggested observation intensity using the inverse rule `6 - pulseLevel`.
- Because the same `subject_type` and `subject_id` model is used, a self pulse cannot seed a relative observation and vice versa.
- Mood pulses are also included in the richer export flow on the dedicated `Export` page.

Functional interpretation: mood pulses are not just a chart input. They are a daily anchor signal that informs the heavier observation workflow.

## Observation Logging

Observation logging is the app's structured behavioral documentation layer.

It is built on three entities:

- `observation_categories`
- `observation_concepts`
- `observation_logs`

The user flow is implemented in `ObservationStepper`:

1. Confirm current perspective.
2. Choose a category.
3. Choose a concept inside that category.
4. Assign intensity.
5. Optionally add context and narrative.

Stored observation data includes:

- selected concept
- intensity
- optional frequency
- optional context modifier
- optional free narrative
- logging date
- self vs relative stance
- optional `journal_entry_id` link

The system uses observations in several ways:

- timeline cards and calendar feed
- pattern charts
- pattern nudges over recent history
- therapist summary export grouped by BNO code
- FHIR-like observation export for the full export flow

Observation logging therefore acts as the app's main evidence-building layer.

## Multi Perspective Logging

The app's most distinctive structural feature is stance-aware logging.

`useStance()` holds the active perspective:

- `self`
- `relative` with a selected `subject_id`

That context is reused across:

- `mood_pulses`
- `observation_logs`
- `questionnaire_responses`

The product consequence is straightforward:

- self journaling remains personal
- supported-person workspaces are parallel but isolated
- charts, timelines, histories, and exports change with stance

Important nuance:

- `journal_entries` are self-only
- `mood_pulses`, `observation_logs`, and `questionnaire_responses` are stance-aware
- `SubjectWorkspaceSection` mounts isolated workspaces and uses `ScopedStanceProvider` so each workspace can behave like a separate context

This makes the app less like a single diary and more like a multi-subject evidence notebook with strong scope separation.

## Surveys And Their Results

The survey system is considerably more advanced than a basic form builder.

### Survey definition model

The admin side supports:

- bilingual titles and descriptions
- category assignment
- publish state
- repeat interval
- scoring toggle
- scoring mode
- interpretation ranges
- branching logic
- subscales
- study attachments
- generated interpretations

### Runtime behavior

The filler flow supports:

- self and supported-person completion
- repeat-interval availability logic
- logic-based stepper progression
- skipped-question handling
- score calculation
- subscale calculation
- immediate results display
- historical score charts
- cited interpretation text when survey interpretations exist

### Result model

A completed survey produces:

- one `questionnaire_responses` row
- many `questionnaire_answers` rows
- optional `total_score`
- optional `subscale_scores`
- scope metadata via `subject_type` and `subject_id`

### Interpretation layer

`ScoreResults` and `ScoreHistory` merge scoring data with:

- configured `score_ranges`
- `survey_interpretations`
- `survey_studies`

This means the app can show not only "what score did you get" but also "what does this range mean" and "which attached studies support that interpretation".

## Screen Descriptions

### Public screens

- `Index`: landing page with managed sections, research framing, and top-level navigation.
- `Library`: public article index with search/category behavior.
- `Article`: public article detail page.
- `Surveys` when logged out: public survey discovery and preview, with category grouping and login/signup call to action.
- `Terms`, `Cookies`, `Gdpr`, `AboutLegal`, `Impressum`: legal and informational surfaces.
- `Auth`: sign-in/sign-up entry point.

### Gated onboarding screens

- `ConsentOnboarding`: consent carousel that persists the initial consent set.
- `BetaGate`: invite-code access screen, present in code but not active in the router.

### Core authenticated user screens

- `CheckIn`: the central workspace hub. Users choose focus or parallel view across self and supported people.
- `SubjectWorkspaceSection`: per-subject workspace with pulse entry, chart, observation stepper, timeline, calendar, nudges, and pattern chart.
- `Profile`: account details, partial export action, managed relatives, and consent dashboard.
- `Export`: richer structured export surface, including therapist summary and FHIR-style observation output.
- `Timeline`: deeper longitudinal history and comparison views.
- `Surveys` when logged in: self and supported-person questionnaire completion surfaces.

### Admin and staff screens

- `AdminDashboard`: management landing surface.
- `ManageLibrary`: article CRUD with bilingual fields and formatting helpers.
- `SelfChecks`: questionnaire builder and administration, including categories, logic, scoring, subscales, studies, and interpretations.
- `ManageLanding`: landing-page section CMS.
- `ManageUsers`: role assignment and beta invite code generation.
- `ManageFeedback`: feedback review with kind and urgency filters.
- `AnalystExport`: anonymized aggregate export surface for analyst role.

## Data Model Overview

### Identity and access

- `profiles`
- `user_roles`
- `invite_codes`
- `user_consents`
- `consent_history_logs`

### Content and CMS

- `library_articles`
- `landing_sections`
- `questionnaire_categories`
- `questionnaires`
- `questionnaire_questions`
- `survey_studies`
- `survey_interpretations`

### Personal and relational tracking

- `subjects`
- `journal_entries`
- `mood_pulses`
- `observation_categories`
- `observation_concepts`
- `observation_logs`

### Measurement and history

- `questionnaire_responses`
- `questionnaire_answers`
- `questionnaire_score_trends`

### Feedback and analytics

- `user_feedback`
- analyst aggregate functions
- export audit and monitoring tables

### Relationship summary

- A user owns a profile and one or more roles.
- A user may define zero or more supported persons in `subjects`.
- Mood pulses, observations, and questionnaire responses are scoped either to self or to one subject.
- Journal entries are self-only, but can optionally link to an observation.
- Questionnaires own questions.
- Questionnaire responses own answers.
- Surveys can own supporting studies and generated interpretation records.

## Bottom Line

The current implementation is a private bilingual evidence-tracking platform with four real pillars: journaling, mood pulse logging, structured observations, and stance-aware questionnaires. Its strongest engineering idea is scope separation by subject context. Its strongest product idea is combining warm UX language with structured, exportable evidence.

From a protection perspective, the database ownership model and subject isolation are solid. The main gaps are not in the existence of privacy intent, but in incomplete enforcement consistency: the dormant beta gate, incomplete profile export, and a few places where the runtime contract is looser than the product model suggests.


