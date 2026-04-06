# Grit.hu — System Description

## 1. Overview

Grit.hu is a sensemaking information portal for individuals affected by high-conflict relational dynamics. It combines a **public library** of curated research with **private self-report tools** for structured observation, journaling, and questionnaire-based self-checks. The platform is currently in a **Closed Beta** phase.

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

### 3.1 Global Identity Personalization

The system prioritizes personal recognition over generic labels. Primary UI elements (Header Account button, App Sidebar menu, and Workspace Registry cards) dynamically inject the user's `display_name` (from metadata) or `email`. The generic Hungarian "Fiók" and "Saját profil" labels act as fallback states only for guest users or accounts without metadata.

### 3.2 Consent Flow

Seven granular consent categories (journal storage, mood tracking, free-text AI, pattern detection, questionnaire data, FHIR export, anonymized analytics) are presented as a card carousel during onboarding. The consent gate (`ConsentGate`) shows **only once** — on first registration or when new consent keys are added that the user hasn't addressed.

Consent state is **cached in `localStorage`** (`grit_consent_v1` key, scoped per `userId`) to prevent redundant network fetches and false re-prompts on page refresh. The cache stores consent map, `consentCompleted` flag, and timestamp. Background database sync runs after the cache is served, silently updating if newer data is found.

`profiles.consent_completed` is the authoritative flag — set to `true` once the user has addressed all `CONSENT_KEYS`. The flag is re-evaluated against the current key set, so adding a new key will re-trigger onboarding for that key only.

**Registration Routing:** The `Auth` component implements purely reactive programmatic navigation relying on a hydrated `user` object. This eliminates synchronous routing race conditions, structurally guaranteeing that newly registered users are flawlessly evaluated by the `ProtectedRoute` gate and forcefully redirected to the initial `/consent` onboarding.

### 3.3 Closed Beta Access

During the private testing phase, the application is protected by a **Closed Beta Gate**.

- **`beta_access` check**: A `BOOLEAN` flag on the `profiles` table determines if a user can bypass the gate.
- **`BetaGate` component**: Authenticated users without `beta_access` are redirected to `/beta-gate`, where they must enter a valid **Invite Code**.
- **Redemption logic**: The `redeem_invite_access` PostgreSQL function (RPC) validates codes against the `invite_codes` table, grants access to the user's profile, and marks the code as used.
- **Deadlock prevention**: The `BetaGate` component implements an auto-redirect hook; once `beta_access` is detected (via async resolve or manual redemption), the user is immediately pushed to the dashboard to avoid entrapment after page refreshes.

#### Consent Tables

##### `user_consents`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | Auth user |
| `consent_key` | text | One of 7 consent categories |
| `granted` | boolean | Default `false` |
| `updated_at` | timestamptz | Default `now()` |

**RLS:** Users can view/insert/update own consents. No DELETE.

##### `consent_history_logs`

Immutable audit trail — populated by `log_consent_change()` trigger on `user_consents` UPDATE.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | Auth user |
| `consent_key` | text | Which consent changed |
| `granted` | boolean | New value |
| `changed_at` | timestamptz | Default `now()` |
| `scope_snapshot` | jsonb | Nullable; snapshot of all consent states at time of change |

**RLS:** Users can SELECT own history only. No INSERT/UPDATE/DELETE from client.

---

## 4. Database Schema

### 4.1 `profiles`

Stores user display information. Created automatically on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (UNIQUE) | References auth user |
| `display_name` | text | Nullable, set from email or metadata |
| `beta_access` | boolean | Default `false`; gates access to protected routes |
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

**Constraints:** `UNIQUE(user_id, role)` — prevents duplicate role entries.

**RLS:** Users can view own roles. Users can ONLY self-insert the `affected_person` role (strict equality check). Admins can view/insert/delete all. No UPDATE. **Users cannot delete their own roles**, eliminating vulnerability bypasses.

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
| `title` / `title_localized` | text / jsonb | Bilingual; visible in selection and filling views |
| `description` / `description_localized` | text / jsonb | Bilingual; visible in selection and filling views |
| `is_published` | boolean | Default `false` |
| `scoring_enabled` | boolean | Default `false`; enables score calculation |
| `scoring_mode` | text | `'sum'` (default) or `'weighted'`; determines scoring method |
| `score_ranges` | jsonb | Nullable; array of `{min, max, label, description?}` for result interpretation |
| `repeat_interval` | text | Nullable; suggested repeat cadence |
| `snomed_code` | text | Nullable; SNOMED CT code for clinical interoperability |
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
| `logic_rules` | jsonb | Nullable; array of `{condition: {answer_equals}, action: "jump_to"|"skip_to_end", target_question_id?}`. Forward-only. First match wins. |
| `sort_order` | integer | Default `0` |

**RLS:** Authenticated users see questions of published questionnaires (or observers). Editors have full CRUD.

**Editor features:** Questions can be duplicated (deep copy of all settings; logic rules cleared on duplicate). Scale questions support a "Reverse scoring" toggle that auto-populates `answer_scores` with inverted values using `score(n) = (min + max) - n`. Entire questionnaires can be **cloned** (deep copy of questionnaire + all questions + remapped logic rules) as unpublished drafts with a "(copy)" suffix.

**Conditional Branching (Logic Jumps):** Each non-text question can define forward-only `logic_rules` — when a respondent selects a matching answer, the system jumps to a later question or skips to end. Questionnaires with any logic rules automatically render in **stepper mode** (one question at a time) instead of the default flat list. This mode features a dynamic progress bar and breadcrumb-style question numbering to reduce cognitive load. 

**Data Integrity (Skipped Questions):** To maintain statistical consistency in scoring, questions hidden by logic jumps are recorded with a `"__SKIPPED__"` sentinel string in the `answer` field. The `validate_logic_rules` utility enforces forward-only constraints and detects unreachable nodes.

**Scoring:** Supports `sum` and `weighted` modes. Score ranges accept **zero and negative values** for both `min` and `max` bounds — enabling instruments with inverse or baseline-adjusted scoring.

#### `questionnaire_responses`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | Auth user |
| `questionnaire_id` | uuid (FK) | → `questionnaires.id` |
| `total_score` | integer | Nullable; computed total when scoring is enabled |
| `subject_type` | `subject_type` enum | Default `'self'`; `'self'` or `'relative'` |
| `subject_id` | uuid (FK) | Nullable; → `subjects.id`; set when `subject_type = 'relative'` |
| `completed_at` | timestamptz | Default `now()` |

**RLS:** Users manage own responses only. 
**Submission Availability:** Submitting questionnaire results is now globally available to all authenticated roles (including `observer` and `affected_person`). Role-based submission locks have been removed.
**Stance Isolation:** Both availability interval-checking and historical score retrieval query responses strictly by `subject_type` and `subject_id`, guaranteeing that self and supported-person completions naturally track independent cadences even for the same user.

#### `questionnaire_answers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `response_id` | uuid (FK) | → `questionnaire_responses.id` |
| `question_id` | uuid (FK) | → `questionnaire_questions.id` |
| `answer` | jsonb | |

**RLS:** Users manage own answers (validated via response ownership). No admin bypass.
**Scoring Engine:** The system employs an `AFTER INSERT ON questionnaire_answers` PostgreSQL trigger (`calculate_answer_score()`) that parses the generic JSONB payload against the structure's `answer_scores` configuration. It computes the algorithmic weighted point value natively in the database, sequentially aggregating and isolating the `total_score` on the master `questionnaire_responses` row in O(1) time without trusting client-side arithmetic. The trigger includes a `__SKIPPED__` sentinel guard — answers with value `"__SKIPPED__"` (inserted for questions hidden by logic jumps) are silently ignored, contributing zero to the total score.

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
**Consent Gate:** The Subject creation process explicitly enforces a mandatory Observer Consent confirmation (a visual checkbox port from `ObserverConsentCard`). Users cannot register a relative without validating their consent to track and manage third-party metadata.

#### Stance-aware filtering

The `useStance` context tracks the current perspective: `self` or `relative` (with a `selectedSubjectId`). When the user switches stance:

- **Self mode:** Shows only self-scoped `mood_pulses`, personal journal entries, and questionnaire responses where `subject_id IS NULL` and `subject_type` is `self` or legacy `NULL`.
- **Observer mode:** Shows only `mood_pulses`, `observation_logs`, and questionnaire responses matching the selected supported person's `subject_id`.
- **QuickPulse mounting:** Each `SubjectWorkspaceSection` mounts its own `QuickPulse` instance with `key={subjectId}` and an explicit `subjectId` prop, so supported-person cards keep isolated pulse logging/history context while preserving `theme-observer` styling tokens.

Each supported person receives a **deterministic color palette** derived from their UUID (hue, background, border, text, dot), drawn from a pre-defined set of 8 distinguishable hues (amber, teal, purple, rose, green, gold, blue, magenta). These colors are applied to `RoleIndicator`, `StanceBanner`, `MoodTrendChart` accent, and `ObservationStepper` badges.

#### `SubjectCardRegistry`

A horizontally scrollable dashboard module management system for subjects (self + supported persons). The "Self" card is personalized with the user's name (e.g., "Szentiványi Marcell") instead of the generic "Saját profil". Clicking a card triggers a global stance switch via `useStance.setActiveSubjectContext()` and automatically navigates the user to `/journal`. The active card is visually distinguished with a primary-tinted background, explicitly highlighted borders, and a scaled-up hover state.

#### `SubjectWorkspaceSection`

The primary stance-aware container for personal and supported-person documentation. To prioritize immediate interaction and feedback, the workspace enforces a strict **"Action -> Result" vertical hierarchy**:
1. **QuickPulse Entry (Circles):** Positioned at the very top for high-frequency logging.
2. **Mood Trend Chart:** Positioned directly below the entry, providing instant visual feedback for the user's current and past mood states.
3. **Observation & Patterns:** Detailed clinical documentation (Stepper, Patterns) follows below in a responsive grid.

In **Focus Mode** (single subject), the "Action-Result" block stretches to `col-span-12` (full width), while the clinical tools split into an 8/4 grid below. In **Parallel Mode** (comparison), each Subject workspace is a unified vertical stack using `flex-col gap-6` to ensure cards never touch, even in high-density views.

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
- Testi jelzések / Physical Signs (BNO-10/SNOMED CT mapped: Heart racing, stomach knot, etc.)

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

- **Navigation:** `FHome`, `FDashboard`, `FHeartPulse` (check-in/journal), `FClock`, `FDownload`, `FUser`, `FLibrary`, `FUsers`, `FBarChart`, `FFileText`, `FInfo`, `FLock`, `FCalendar`, `FList`, `FTimeline`
- **Actions:** `FSave`, `FClose`, `FPlus`, `FEdit`, `FTrash`, `FChevronDown/Up/Left/Right`, `FExternalLink`, `FArrowLeft/Right`, `FSearch`, `FCheck`
- **Domain:** `FShield`, `FShieldAlert` (boundaries), `FSparkles` (patterns), `FBrain` (mind), `FEye` (observation), `FTrendingUp` (trends), `FBookOpen` (journal), `FClipboardCheck` (task/survey), `FHeartPulse` (physical signals)
- **Mood (QuickPulse):** `FMoodStruggling` → `FMoodUneasy` → `FMoodOkay` → `FMoodGood` → `FMoodStrong` — circular faces with expressive features, using opacity-graded sage-green (30% to 100%) to represent emotional intensity.
- **Roles:** `FUserCheck`, `FUserSearch`, `FShieldCheck`, `FPenTool`, `FUserPen`

### URL Structure & Routing

All routes are served under both `/` (Hungarian default) and `/en/` (English prefix). Language is auto-detected from URL prefix and persisted in `localStorage`. 

**Layout Standardization:** The primary interactive pages (`/journal`, `/surveys`, `/library`, etc.) share a consistent, centered layout using **`space-y-6`** (24px) vertical spacing and `max-w-2xl mx-auto w-full` containers (for focused content).

**Fluid Grid Strategy:** The dashboard and workspace management cards transition from mobile vertical stacks to side-by-side grids at the **`md` (768px)** breakpoint. This threshold is synchronized across the workspace action block (`QuickPulse` + `Chart`), the header navigation, and the `SubjectCardRegistry` to ensure all UI elements transition as a single, cohesive unit. This includes fluid sizing for `QuickPulse` icons (`w-11` to `w-14`) and gaps (`gap-1.5` to `gap-4`) to prevent overflow on landing-page showcases.

| Route | Component | Auth Required | Notes |
|---|---|---|---|
| `/` | `Index` (landing) | No | Public — featured articles, CMS sections; authenticated users see live `QuickPulse` instead of static mood preview |
| `/library` | `Library` | No | Full library with search & category filter |
| `/library/:id` | `Article` | No | Individual article detail page with bilingual content |
| `/beta-gate` | `BetaGate` | Yes | Closed Beta invite code entry. Implements auto-dismissal for authorized sessions. |
| `/auth` | `Auth` (login/signup) | No | Compact centered auth card with reduced control heights and streamlined spacing |
| `/journal` | `CheckIn` | Yes | **Unified Emotional Hub** — Primary workspace for Quick Pulse, ObservationStepper, calendar feed, mood trends, and pattern charts. Features a strict **Action-Result vertical flow** (Pulse above Trend Chart) at the top of every profile workspace. |
| `/surveys` | `Surveys` | Yes | Questionnaire hub with logic-aware respondent stepper. Uses standardized `space-y-6` vertical rhythm. |
| `/export` | `Export` | Yes | Personal data export with compact centered layout. |
| `/profile` | `Profile` | Yes | Identity management, role management, subject registry, and data export. Optimized for clarity with reduced vertical gaps (`space-y-6`). |
| `/manage-library` | `ManageLibrary` | Yes (editor+) | Article CRUD with bilingual fields |
| `/manage-questionnaires` | `SelfChecks` | Yes (editor+) | Questionnaire management with logic jump editor, scoring, and cloning. |
| `/manage-landing` | `ManageLanding` | Yes (editor+) | Landing page CMS |
| `/manage-users` | `ManageUsers` | Yes (admin) | User role assignment |
| `/analyst-export` | `AnalystExport` | Yes (analyst) | Anonymized aggregate data download |
| `/about-legal` | `AboutLegal` | No | About & legal information |
| `/terms` | `Terms` | No | Terms of service |
| `/cookies` | `Cookies` | No | Cookie policy |
| `/gdpr` | `Gdpr` | No | GDPR / privacy policy |

**Legacy redirects:** `/dashboard` → `/journal`, `/check-in` → `/journal`, `/self-checks` → `/surveys`, `/timeline` → `/journal`

**Type generation note:** The `logic_rules` column on `questionnaire_questions` is deployed in the database but may not appear in the auto-generated `types.ts` until the next type sync. Code uses `as any` casts for reads and inserts involving this column until regeneration.

### Key Components

- **`PublicHeader`** — Shared top navigation for all public/legal pages: brand link, nav links (Library, Check-in, About), `LanguageToggle`, auth/dashboard button, mobile hamburger menu (Sheet). Gated nav for protected routes redirects unauthenticated users to `/auth`.
- **`DashboardLayout`** — Sidebar navigation + top header with auth controls (authenticated pages)
- **`AppSidebar`** — Role-aware navigation with Navigate / Explore / Management sections
- **`ProtectedRoute`** — Auth guard wrapper
- **`EmergencyExit`** — Quick-exit safety button (always visible); redirects to neutral site
- **`LanguageToggle`** — HU/EN language switcher; visible on every page (public header + dashboard)
- **`ArticleCard`** — Library card linking to individual article detail page
- **`QuickPulse`** — 5 expressive Freud-style mood icons (faces with opacity-graded sage-green); one-tap writes to `mood_pulses` table. Strategically placed as the **first element at the top** of each subject workspace to encourage daily logging. Accepts an explicit `subjectId` override so stacked self/support-person cards save in the correct context.
- **`FeedCalendar`** — Calendar-based chronological feed of journal entries, observation logs, mood pulses, and questionnaire completions. Features a **mood heatmap** where cells display color-coded backgrounds (emerald → red) derived from the daily average `impact_level` of journal entries. Displays moon phases and day-detail drill-downs. 
- **`ObservationStepper`** — 3-step progressive disclosure with warm labels ("What's going on?" → "How heavy?" → "Anything to add?"). Supports retrospective `observationDate` overrides for backdated logs.
- **`ObservationModal`** — Date-aware dialog wrapper for the `ObservationStepper`, launched from the `FeedCalendar` to allow explicit historical observation logging in supported-person contexts.
- **`EntryModal`** — Journal entry creation/editing dialog with optional observation linking, triggered contextually from the timeline or calendar for self-reporting.
- **`RecapBanner`** — Weekly recap prompt when user has sufficient activity
- **`MoodTrendChart`** — Recharts area chart of mood pulse history; positioned immediately below the `QuickPulse` entry for real-time visual feedback. Timeline `<Brush>` slider is gated behind premium.
- **`PatternChart`** — Bar chart of observation concept frequency (pattern nudges for 3+/week)
- **`HorizontalTimeline`** — Horizontal scrollable timeline of recent activity
- **`JournalForm` / `JournalEntryCard`** — Fully localized journal creation and display with progressive disclosure for clinical codes
- **`ScoreResults`** — Post-completion scoring breakdown: total score with progress bar, matched range label/description, and per-question point breakdown
- **`ScoreHistory`** — Historical score tracking with `recharts` LineChart for repeated questionnaires, trend indicators (↑/↓), and last-5-completions list; filters strictly by the active subject context so self and supported-person histories stay separated
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

---

## 9. PWA & Offline Strategy

Grit.hu is a Progressive Web App (PWA) using `vite-plugin-pwa` for offline reliability and discreet usage.

### 9.1 Safety First (Visionary Stance)
For users in high-conflict dynamics, the PWA is designed to be discreet.
- **Manifest Short Name**: Set to a single character (`short_name: "G"`) to avoid drawing attention on a device's home screen.
- **Icons**: Uses a minimalist, abstract "G" monogram icon instead of medical or high-conflict imagery, ensuring it remains discreet on the home screen.

### 9.2 Caching Strategy
The service worker uses a dual caching model via Workbox:
- **Static Assets (Cache-First)**: Scripts, styles, and images are cached for 30 days to ensure core UI availability even during network drops.
- **Supabase API (Network-First)**: Database calls (REST API) always prioritize the live network to prevent "stale" or duplicate submissions of sensitive reflections.

### 9.3 Emergency Exit Faktor
The **Emergency Exit** button (see §8.5) is explicitly excluded from service worker caching (`navigateFallbackDenylist`). This ensures that clicking "Exit" always triggers an immediate, clean redirect to the target neutral site (e.g., Google) without interference from offline fallbacks or cached page states.

### 9.4 Offline Handling
When a network connection is unavailable (`navigator.onLine === false`), the UI allows entries to be "typed" or "logged" locally. A clear **"Sync Pending"** visual cue (toast notification) is provided to the user rather than silently caching submissions, ensuring the user is aware of the current connectivity status of their sensitive data.
