# Grit.hu — System Description

## 1. Overview

Grit.hu is a sensemaking information portal for individuals affected by high-conflict relational dynamics. It combines a **public library** of curated research with **private self-report tools** for structured observation, journaling, and questionnaire-based self-checks.

**Tech Stack:** React 18 + Vite + TypeScript + Tailwind CSS, backed by Lovable Cloud (Supabase) for authentication, database, and edge functions.

---

## 2. User Roles

Roles are stored in `user_roles` (never on the profile) using the `app_role` enum:

| Role | Description |
|---|---|
| `affected_person` | Primary user — journals, observations, self-checks |
| `observer` | Read-only access to unpublished questionnaires |
| `admin` | Full system management, user role assignment |
| `editor` | Manages library articles, questionnaires, observation catalog, landing page |
| `guest_editor` | Limited editor — library articles only |
| `analyst` | Access to anonymized aggregate data (20+ user threshold) |

Role checks use `has_role()` and `has_any_role()` — SECURITY DEFINER functions that prevent RLS recursion.

---

## 3. Authentication & Profiles

- Email/password auth via Lovable Cloud Auth
- Email verification required (no auto-confirm)
- On signup, `handle_new_user()` trigger creates a `profiles` row automatically

### 3.1 Consent Flow

Seven granular consent categories (journal storage, mood tracking, free-text AI, pattern detection, questionnaire data, FHIR export, anonymized analytics) are presented as a card carousel during onboarding. The consent gate (`ConsentGate`) shows **only once** — on first registration or when new consent keys are added that the user hasn't addressed.

Consent state is **cached in `localStorage`** (`grit_consent_v1` key, scoped per `userId`) to prevent redundant network fetches and false re-prompts on page refresh. The cache stores consent map, `consentCompleted` flag, and timestamp. Background database sync runs after the cache is served, silently updating if newer data is found.

`profiles.consent_completed` is the authoritative flag — set to `true` once the user has addressed all `CONSENT_KEYS`. The flag is re-evaluated against the current key set, so adding a new key will re-trigger onboarding for that key only.

---

## 4. Database Schema

### 4.1 `profiles`

Stores user display information. Created automatically on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (UNIQUE) | References auth user |
| `display_name` | text | Nullable, set from email or metadata |
| `consent_completed` | boolean | Default `false`; set `true` after all consent keys addressed |
| `premium` | boolean | Default `true`; gates premium features (timeline brush, etc.) |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**RLS:** Users see/update own profile. Admins can view all. No DELETE.

---

### 4.2 `user_roles`

Maps users to application roles. One user can have multiple roles.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | References auth user |
| `role` | `app_role` enum | See §2 |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Users can view/insert/delete own roles. Admins can view/insert/delete all. No UPDATE.

---

### 4.3 `library_articles`

Curated research articles with bilingual support.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `title` | text | Fallback title |
| `title_localized` | jsonb | `{"hu": "...", "en": "..."}` |
| `excerpt` | text | Fallback excerpt |
| `excerpt_localized` | jsonb | `{"hu": "...", "en": "..."}` |
| `category` | text | Default `'Article'` |
| `author` | text | Article author |
| `source` | text | Nullable |
| `url` | text | Nullable |
| `image_url` | text | Nullable; cover image URL |
| `published` | boolean | Default `true` |
| `featured` | boolean | Default `false`; highlighted on landing |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**RLS:** Anyone can SELECT published articles. Editors (admin/editor/guest_editor) have full CRUD.

---

### 4.4 Questionnaire System

#### `questionnaires`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `title` / `title_localized` | text / jsonb | Bilingual |
| `description` / `description_localized` | text / jsonb | Bilingual |
| `is_published` | boolean | Default `false` |
| `scoring_enabled` | boolean | Default `false`; enables score calculation |
| `scoring_mode` | text | `'sum'` (default) or `'weighted'`; determines scoring method |
| `score_ranges` | jsonb | Nullable; array of `{min, max, label, description?}` for result interpretation |
| `repeat_interval` | text | Nullable; suggested repeat cadence |
| `created_by` | uuid | Nullable |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** Authenticated users see published. Editors have full CRUD.

#### `questionnaire_questions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `questionnaire_id` | uuid (FK) | → `questionnaires.id` |
| `question_text` / `question_text_localized` | text / jsonb | |
| `question_type` | text | Default `'text'`; supports `scale`, `multiple_choice` |
| `options` / `options_localized` | jsonb | For multiple-choice |
| `answer_scores` | jsonb | Nullable; maps option/scale values to numeric scores. Used for weighted mode and **reverse scoring** in sum mode |
| `sort_order` | integer | Default `0` |

**RLS:** Authenticated users see questions of published questionnaires (or observers). Editors have full CRUD.

**Editor features:** Questions can be duplicated (deep copy of all settings). Scale questions support a "Reverse scoring" toggle that auto-populates `answer_scores` with inverted values using `score(n) = (min + max) - n`. Entire questionnaires can be **cloned** (deep copy of questionnaire + all questions) as unpublished drafts with a "(copy)" suffix.

**Scoring:** Supports `sum` and `weighted` modes. Score ranges accept **zero and negative values** for both `min` and `max` bounds — enabling instruments with inverse or baseline-adjusted scoring.

#### `questionnaire_responses`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | Auth user |
| `questionnaire_id` | uuid (FK) | → `questionnaires.id` |
| `total_score` | integer | Nullable; computed total when scoring is enabled |
| `completed_at` | timestamptz | Default `now()` |

**RLS:** Users manage own responses only.

#### `questionnaire_answers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `response_id` | uuid (FK) | → `questionnaire_responses.id` |
| `question_id` | uuid (FK) | → `questionnaire_questions.id` |
| `answer` | jsonb | |

**RLS:** Users manage own answers (validated via response ownership).

---

### 4.5 Journal System

#### `journal_entries`

Self-reflection journal — only available in self stance (hidden in observer mode).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | Auth user |
| `title` | text | Required |
| `entry_date` | date | Default `CURRENT_DATE` |
| `emotional_state` | text | Nullable |
| `impact_level` | integer | Nullable (1–5) |
| `event_description` | text | Nullable |
| `self_anchor` | text | Nullable |
| `reflection` | text | Nullable |
| `free_text` | text | Nullable |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** Users CRUD own entries only. No stance columns — journal entries are always personal.

---

### 4.6 Mood Pulse System

#### `mood_pulses`

Lightweight one-tap mood recordings from the QuickPulse widget.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | Auth user |
| `level` | integer | 1–5 (struggling → strong) |
| `label` | text | Localized mood label at time of recording |
| `entry_date` | date | Default `CURRENT_DATE` |
| `subject_type` | `subject_type` enum | Default `'self'`; `'self'` or `'relative'` |
| `subject_id` | uuid (FK) | Nullable; → `subjects.id`; set when `subject_type = 'relative'` |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Users manage own pulses only.

### 4.6.1 Subjects (Supported Persons)

#### `subjects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | Auth user (the caregiver) |
| `name` | text | Display name for the supported person |
| `relationship_type` | `relationship_type` enum | `child`, `spouse`, `parent`, `sibling`, `other` |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Users manage own subjects only.

#### Stance-aware filtering

The `useStance` context tracks the current perspective: `self` or `relative` (with a `selectedSubjectId`). When the user switches stance:

- **Self mode:** Shows only `mood_pulses` with `subject_type = 'self'`, journal entries, and questionnaire data.
- **Observer mode:** Shows only `mood_pulses` and `observation_logs` matching the selected `subject_id`; journal entries and questionnaire results are hidden.
- **Questionnaire responses** do not yet have `subject_type`/`subject_id` columns — in observer mode the questionnaire history is hidden entirely.

Each supported person receives a **deterministic color palette** derived from their UUID (hue, background, border, text, dot), drawn from a pre-defined set of 8 distinguishable hues (amber, teal, purple, rose, green, gold, blue, magenta). These colors are applied to `RoleIndicator`, `StanceBanner`, `MoodTrendChart` accent, and `ObservationStepper` badges.

#### `SubjectCardRegistry`

A horizontally scrollable card carousel on the Dashboard that shows all subjects (self + supported persons). Clicking a card triggers a global stance switch via `useStance.setActiveSubjectContext()`. The active card is visually distinguished with a primary border and "Aktív" badge. Each subject card displays the person's name, relationship type, and deterministic color accent.

---

### 4.7 Structured Observation Engine

A SNOMED CT-inspired three-level hierarchy for logging interpersonal patterns.

#### `observation_categories` — Top-level domains

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name_hu` / `name_en` | text | Bilingual labels |
| `icon` | text | Lucide icon name |
| `sort_order` | integer | Default `0` |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamptz | |

**RLS:** Authenticated users see active categories. Editors (admin/editor) have full CRUD.

**Seed data:**
- Érzelmi állapot / Emotional State
- Kommunikációs minták / Communication Patterns
- Határok / Boundaries

#### `observation_concepts` — Specific observations

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `category_id` | uuid (FK) | → `observation_categories.id` |
| `concept_code` | text (UNIQUE) | SNOMED CT identifier (e.g. `247735008`) |
| `bno_code` | text | Nullable; BNO-10 (ICD-10-HU) code for Hungarian interoperability |
| `name_hu` / `name_en` | text | User-facing labels |
| `description_hu` / `description_en` | text | Nullable |
| `sort_order` | integer | Default `0` |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamptz | |

**RLS:** Same as categories.

#### `observation_logs` — User entries

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | Auth user |
| `concept_id` | uuid (FK) | → `observation_concepts.id` |
| `journal_entry_id` | uuid (FK) | Nullable; → `journal_entries.id`; links observation to a journal entry |
| `intensity` | integer | 1–5, default `3`, validated by trigger |
| `frequency` | text | `once` / `sometimes` / `often` / `constant` |
| `context_modifier` | text | E.g. "at home", "at work" |
| `user_narrative` | text | Free-text anchor |
| `logged_at` | date | Default `CURRENT_DATE` |
| `status` | text | FHIR Observation status; default `'final'` |
| `subject_type` | `subject_type` enum | Default `'self'`; `'self'` or `'relative'` |
| `subject_id` | uuid (FK) | Nullable; → `subjects.id`; required when `subject_type = 'relative'` (enforced by trigger) |
| `created_at` | timestamptz | |

**RLS:** Users manage own logs only.

**Validation:** `validate_observation_intensity()` trigger enforces intensity ∈ [1, 5] and requires `subject_id` when `subject_type = 'relative'`.

---

### 4.8 Landing Page CMS

#### `landing_sections`

Admin/editor-managed content sections for the public landing page.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `section_key` | text | Unique section identifier |
| `title` / `title_localized` | text / jsonb | Bilingual |
| `subtitle` / `subtitle_localized` | text / jsonb | Nullable; bilingual |
| `cta_text` / `cta_text_localized` | text / jsonb | Nullable; bilingual call-to-action |
| `config` | jsonb | Nullable; section-specific configuration |
| `is_active` | boolean | Default `true` |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** Anyone can SELECT active sections. Editors (admin/editor) have full CRUD.

---

## 5. Database Functions

| Function | Purpose | Security |
|---|---|---|
| `has_role(uuid, app_role)` | Check single role | DEFINER |
| `has_any_role(uuid, app_role[])` | Check any of multiple roles | DEFINER |
| `handle_new_user()` | Auto-create profile on signup | DEFINER (trigger) |
| `update_updated_at_column()` | Auto-set `updated_at` on UPDATE | Trigger |
| `validate_observation_intensity()` | Enforce intensity 1–5 + require `subject_id` for relative logs | Trigger |
| `validate_mood_pulse_level()` | Enforce mood level 1–5 | Trigger |
| `log_consent_change()` | Audit log on consent update → `consent_history_logs` | DEFINER (trigger) |
| `analyst_journal_aggregates()` | Anonymized journal stats | DEFINER |
| `analyst_questionnaire_aggregates()` | Anonymized questionnaire stats | DEFINER |
| `analyst_role_distribution()` | Role count distribution | DEFINER |
| `analyst_observation_aggregates()` | Anonymized observation concept stats (SNOMED-coded) | DEFINER |

---

## 6. Edge Functions

| Function | Purpose |
|---|---|
| `analyst-export` | Serves anonymized aggregate data; enforces 20+ user privacy threshold |
| `journal-patterns` | AI-powered pattern detection across journal entries |
| `journal-reflect` | AI-powered reflective prompts for journal entries |

---

## 7. Frontend Architecture

### Design Philosophy: "Clinical Core, Human Surface"

The UI uses warm, low-cognitive-load language ("How heavy was it?", "My truth", "What happened?") while the backend silently records SNOMED CT and BNO-10 coded clinical data. Users experience a supportive sensemaking journal; practitioners receive standardized interoperable data.

### Iconography: Freud Icon Set

The app uses a custom icon library (`src/components/icons/FreudIcons.tsx`) inspired by the [freud Mental Health & Mindfulness UI Icon Set](https://dribbble.com/shots/23883954). Icons feature thick rounded strokes, organic bubbly shapes, and mental-health-themed metaphors — replacing generic Lucide icons throughout. Key icons include:

- **Navigation:** `FHome`, `FDashboard`, `FHeartPulse` (check-in/journal), `FClock`, `FDownload`, `FUser`, `FLibrary`, `FUsers`, `FBarChart`, `FFileText`, `FInfo`, `FLock`
- **Actions:** `FSave`, `FClose`, `FPlus`, `FEdit`, `FTrash`, `FChevronDown/Right`, `FExternalLink`
- **Domain:** `FShield` (boundaries), `FSparkles` (patterns), `FBrain` (mind), `FEye` (observation), `FTrendingUp` (trends)
- **Mood (QuickPulse):** `FMoodStruggling` (wilting sprout) → `FMoodUneasy` (drooping leaf) → `FMoodOkay` (balanced branch) → `FMoodGood` (blooming leaf) → `FMoodStrong` (full bamboo) — botanical metaphors with opacity-graded sage-green, matching the bamboo soft-UI aesthetic
- **Roles:** `FUserCheck`, `FUserSearch`, `FShieldCheck`, `FPenTool`, `FUserPen`

### URL Structure & Routing

All routes are served under both `/` (Hungarian default) and `/en/` (English prefix). Language is auto-detected from URL prefix and persisted in `localStorage`.

| Route | Component | Auth Required | Notes |
|---|---|---|---|
| `/` | `Index` (landing) | No | Public — featured articles, CMS sections; authenticated users see live `QuickPulse` instead of static mood preview |
| `/library` | `Library` | No | Full library with search & category filter |
| `/library/:id` | `Article` | No | Individual article detail page with bilingual content |
| `/auth` | `Auth` (login/signup) | No | |
| `/dashboard` | `Dashboard` | Yes | Quick Pulse widget + recent activity |
| `/journal` | `CheckIn` | Yes | **Unified** — Quick Pulse + ObservationStepper + calendar feed + mood trends + pattern charts |
| `/surveys` | `Surveys` | Yes | Tabbed view: questionnaire filler + score history with trend charts |
| `/export` | `Export` | Yes | Personal data export (JSON, FHIR, therapist BNO summary) |
| `/profile` | `Profile` | Yes | Display name, role management, data export |
| `/manage-library` | `ManageLibrary` | Yes (editor+) | Article CRUD with bilingual fields |
| `/manage-questionnaires` | `SelfChecks` | Yes (editor+) | Questionnaire management with scoring, reverse scoring, question duplication, drag-and-drop reordering, question numbering |
| `/manage-landing` | `ManageLanding` | Yes (editor+) | Landing page CMS |
| `/manage-users` | `ManageUsers` | Yes (admin) | User role assignment |
| `/analyst-export` | `AnalystExport` | Yes (analyst) | Anonymized aggregate data download |
| `/about-legal` | `AboutLegal` | No | About & legal information |
| `/terms` | `Terms` | No | Terms of service |
| `/cookies` | `Cookies` | No | Cookie policy |
| `/gdpr` | `Gdpr` | No | GDPR / privacy policy |

**Legacy redirects:** `/check-in` → `/journal`, `/self-checks` → `/surveys`, `/timeline` → `/journal`

### Key Components

- **`PublicHeader`** — Shared top navigation for all public/legal pages: brand link, nav links (Library, Check-in, About), `LanguageToggle`, auth/dashboard button, mobile hamburger menu (Sheet). Gated nav for protected routes redirects unauthenticated users to `/auth`.
- **`DashboardLayout`** — Sidebar navigation + top header with auth controls (authenticated pages)
- **`AppSidebar`** — Role-aware navigation with Navigate / Explore / Management sections
- **`ProtectedRoute`** — Auth guard wrapper
- **`EmergencyExit`** — Quick-exit safety button (always visible); redirects to neutral site
- **`LanguageToggle`** — HU/EN language switcher; visible on every page (public header + dashboard)
- **`ArticleCard`** — Library card linking to individual article detail page
- **`QuickPulse`** — 5 botanical Freud-style mood icons (wilting sprout → full bamboo, opacity-graded sage-green); one-tap writes to `mood_pulses` table and optionally opens journal form pre-filled. Fetches managed labels/title from `landing_sections` (`mood_preview` config) so admin CMS changes are reflected everywhere.
- **`FeedCalendar`** — Calendar-based chronological feed of journal entries, observation logs, mood pulses, and questionnaire completions
- **`ObservationStepper`** — 3-step progressive disclosure with warm labels ("What's going on?" → "How heavy?" → "Anything to add?")
- **`EntryModal`** — Journal entry creation/editing dialog with optional observation linking
- **`RecapBanner`** — Weekly recap prompt when user has sufficient activity
- **`MoodTrendChart`** — Recharts area chart of mood pulse history; timeline `<Brush>` slider is gated behind premium (non-premium users see an upsell badge)
- **`PatternChart`** — Bar chart of observation concept frequency (pattern nudges for 3+/week)
- **`HorizontalTimeline`** — Horizontal scrollable timeline of recent activity
- **`JournalForm` / `JournalEntryCard`** — Fully localized journal creation and display with progressive disclosure for clinical codes
- **`ScoreResults`** — Post-completion scoring breakdown: total score with progress bar, matched range label/description, and per-question point breakdown
- **`ScoreHistory`** — Historical score tracking with `recharts` LineChart for repeated questionnaires, trend indicators (↑/↓), and last-5-completions list
- **`EntryReflectDialog` / `ObservationReflectDialog`** — AI-powered reflection prompts for journal entries and observations

### Internationalization

Full bilingual support (Hungarian primary, English secondary) via `src/i18n/` with typed dictionary keys (~150+ keys covering navigation, journal, check-in, pulse, observations, questionnaires, export, admin, legal, and disclaimer labels). Language preference stored in `localStorage` and reflected in URL prefix (`/en/`).

---

## 8. Data Privacy & Security

### 8.1 Access Control
- **RLS everywhere** — All tables have Row-Level Security enabled
- **No direct auth.users access** — Profile data in separate `profiles` table
- **Role isolation** — Roles in `user_roles`, checked via SECURITY DEFINER functions (`has_role`, `has_any_role`) with `SET search_path = public`
- **No admin access to personal data** — Individual user content is strictly private

### 8.2 Edge Function Security
- **JWT validation** — All edge functions validate the `Authorization` header and verify user identity via `supabase.auth.getUser()` before processing
- **Role-based authorization** — `analyst-export` enforces analyst/admin role via service-role client lookup
- **No error leakage** — 500 responses return generic messages; raw errors logged server-side only

### 8.3 Error Handling
- **`friendlyDbError()` utility** (`src/lib/db-error.ts`) — Maps Postgres error codes (23505, 23503, 42501, 23502) to safe user-facing messages; used across all database operations to prevent schema/constraint leakage

### 8.4 Anonymization & Privacy
- **20-user threshold** — Analyst export requires ≥20 active users before releasing any aggregate data
- **k-anonymity rounding** — `active_user_count` in export payload is rounded down to nearest 10
- **Aggregate-only functions** — `analyst_*_aggregates()` SECURITY DEFINER functions return only anonymized statistics; never expose `user_id`

### 8.5 Safety Features
- **Emergency Exit** — Persistent floating button for immediate redirection to a neutral site
- **No social features** — Strictly no community, messaging, or social interaction to protect user safety and privacy

### 8.6 Clinical Data Interoperability
- **SNOMED CT coding** — `observation_concepts.concept_code` uses standard SNOMED CT identifiers for clinical interoperability
- **BNO-10 dual-coding** — `observation_concepts.bno_code` stores ICD-10-HU codes for Hungarian healthcare compatibility; FHIR exports include both SNOMED and ICD-10 coding entries
- **FHIR export** — Personal export includes observation logs as FHIR Observation resources with dual SNOMED/BNO coding; analyst export supports `?format=fhir` for a FHIR Bundle of aggregated data
- **Therapist export** — BNO-grouped summary export designed for sharing with Hungarian therapists, including observation counts, average intensity, and date ranges per BNO code
- **Non-diagnostic disclaimer** — All exports carry a mandatory bilingual watermark clarifying data is not a clinical assessment
