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
| `editor` | Manages library articles, questionnaires, observation catalog |
| `guest_editor` | Limited editor — library articles only |
| `analyst` | Access to anonymized aggregate data (10+ user threshold) |

Role checks use `has_role()` and `has_any_role()` — SECURITY DEFINER functions that prevent RLS recursion.

---

## 3. Authentication & Profiles

- Email/password auth via Lovable Cloud Auth
- Email verification required (no auto-confirm)
- On signup, `handle_new_user()` trigger creates a `profiles` row automatically

---

## 4. Database Schema

### 4.1 `profiles`

Stores user display information. Created automatically on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (UNIQUE) | References auth user |
| `display_name` | text | Nullable, set from email or metadata |
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
| `source` | text | Nullable |
| `url` | text | Nullable |
| `published` | boolean | Default `true` |
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
| `created_by` | uuid | Nullable |
| `created_at` / `updated_at` | timestamptz | |

**RLS:** Authenticated users see published. Editors have full CRUD.

#### `questionnaire_questions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `questionnaire_id` | uuid (FK) | → `questionnaires.id` |
| `question_text` / `question_text_localized` | text / jsonb | |
| `question_type` | text | Default `'text'` |
| `options` / `options_localized` | jsonb | For multiple-choice |
| `sort_order` | integer | Default `0` |

**RLS:** Authenticated users see questions of published questionnaires (or observers). Editors have full CRUD.

#### `questionnaire_responses`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | Auth user |
| `questionnaire_id` | uuid (FK) | → `questionnaires.id` |
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

**RLS:** Users CRUD own entries only.

---

### 4.6 Structured Observation Engine

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
| `concept_code` | text (UNIQUE) | Internal identifier |
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
| `intensity` | integer | 1–5, default `3`, validated by trigger |
| `frequency` | text | `once` / `sometimes` / `often` / `constant` |
| `context_modifier` | text | E.g. "at home", "at work" |
| `user_narrative` | text | Free-text anchor |
| `logged_at` | date | Default `CURRENT_DATE` |
| `created_at` | timestamptz | |

**RLS:** Users manage own logs only.

**Validation:** `validate_observation_intensity()` trigger enforces intensity ∈ [1, 5].

---

## 5. Database Functions

| Function | Purpose | Security |
|---|---|---|
| `has_role(uuid, app_role)` | Check single role | DEFINER |
| `has_any_role(uuid, app_role[])` | Check any of multiple roles | DEFINER |
| `handle_new_user()` | Auto-create profile on signup | DEFINER (trigger) |
| `update_updated_at_column()` | Auto-set `updated_at` on UPDATE | Trigger |
| `validate_observation_intensity()` | Enforce intensity 1–5 | Trigger |
| `analyst_journal_aggregates()` | Anonymized journal stats | DEFINER |
| `analyst_questionnaire_aggregates()` | Anonymized questionnaire stats | DEFINER |
| `analyst_role_distribution()` | Role count distribution | DEFINER |

---

## 6. Edge Functions

| Function | Purpose |
|---|---|
| `analyst-export` | Serves anonymized aggregate data; enforces 10+ user privacy threshold |
| `journal-patterns` | AI-powered pattern detection across journal entries |
| `journal-reflect` | AI-powered reflective prompts for journal entries |

---

## 7. Frontend Architecture

### Pages

| Route | Component | Auth Required |
|---|---|---|
| `/` | `Index` (landing) | No |
| `/auth` | `Auth` (login/signup) | No |
| `/dashboard` | `Dashboard` | Yes |
| `/journal` | `Journal` | Yes |
| `/self-checks` | `SelfChecks` (questionnaires + observations tabs) | Yes |
| `/timeline` | `Timeline` | Yes |
| `/profile` | `Profile` | Yes |
| `/export` | `Export` | Yes |
| `/manage-library` | `ManageLibrary` | Yes (editor+) |
| `/manage-users` | `ManageUsers` | Yes (admin) |
| `/analyst-export` | `AnalystExport` | Yes (analyst) |

### Key Components

- **`DashboardLayout`** — Sidebar navigation + top header with auth controls
- **`AppSidebar`** — Role-aware navigation links
- **`ProtectedRoute`** — Auth guard wrapper
- **`EmergencyExit`** — Quick-exit safety button (always visible)
- **`LanguageToggle`** — HU/EN language switcher
- **`ObservationStepper`** — 3-step progressive disclosure for logging observations
- **`ObservationHistory`** — Chronological view of logged observations
- **`JournalForm` / `JournalEntryCard`** — Journal creation and display

### Internationalization

Full bilingual support (Hungarian primary, English secondary) via `src/i18n/` with typed dictionary keys. Language preference stored in `localStorage`.

---

## 8. Data Privacy & Security

- **RLS everywhere** — All tables have Row-Level Security enabled
- **No direct auth.users access** — Profile data in separate `profiles` table
- **Role isolation** — Roles in `user_roles`, checked via SECURITY DEFINER functions
- **Analyst anonymization** — Aggregate functions never expose `user_id`; 10+ user threshold enforced before any data release
- **No admin access to personal data** — Individual user content is strictly private
