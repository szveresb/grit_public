# Survey Score Interpretation — Full Epic & Story Backlog

---

## Architecture Overview

The feature is built in four sequential layers, each depending on the previous.

```
Epic 1 — Survey-Owned Config      (foundation: which survey uses which profile)
   ↓
Epic 2 — Profile Library          (profiles become DB entities, not code constants)
   ↓
Epic 3 — Study Corpus             (each profile gets a body of source literature)
   ↓
Epic 4 — Interpretation Content   (system produces scored, cited interpretations from the corpus)
```

**Two decision points that determine Epic 4's shape:**
- **Pre-generated:** admin triggers generation once; result is stored and served instantly
- **On-demand:** generation fires when the user sees their score; higher freshness, higher latency and cost

Both paths are specified as separate stories. The team picks one or both.

---

---

# Epic 1 — Survey-Owned Interpretation Config

**Goal:** Replace the current title-matching heuristic with an explicit, survey-owned
configuration. Every survey either has a named interpretation profile or it doesn't.
No inference from titles. No structural fallbacks.

**Delivers:** The data foundation and all display wiring. After this epic the system
is survey-agnostic — score ranges always drive generic display; a profile key drives
knowledge-based display.

---

## Story 1 — Store interpretation config per survey

**Title:** Persist a dedicated interpretation profile key on each survey  
**As a** system owner,  
**I want** each survey to store an explicit, nullable interpretation profile key,  
**so that** interpretation is survey-owned and independent of title text or item count.

**Acceptance Criteria:**
1. The `questionnaires` table has a nullable `interpretation_profile TEXT` column. No constraint on allowed values — the registry handles validation.
2. `NULL` means "no knowledge-based interpretation." The absence is intentional, not a fallback.
3. `score_ranges` and `interpretation_profile` are completely independent fields. Either can be set without the other.
4. The column is included in all existing questionnaire queries (filler, history, editor).
5. Existing score calculation (DB trigger) is unchanged.

**Notes / Dependencies:** Foundation for all other stories. Schema migration required — run with log visibility.

**QA:**
- Insert a survey with `interpretation_profile = 'pvs'`, reload, verify it persists.
- Insert a survey with `interpretation_profile = NULL`, verify it doesn't trigger any interpretation display.
- Complete a survey with no profile — verify score and ranges display normally.

---

## Story 2 — Configure interpretation in the survey editor

**Title:** Add an interpretation profile selector to the survey editor  
**As a** survey manager,  
**I want** to select or clear the interpretation profile for a survey in the editor,  
**so that** I can control whether a survey shows knowledge-based interpretation and which profile it uses.

**Acceptance Criteria:**
1. Inside the scoring section of the editor, a selector appears when scoring is enabled.
2. The selector lists all profiles currently registered in the system, plus a "None" option.
3. Selecting "None" saves `NULL` to the DB.
4. The selected profile is saved on the survey record and reloaded correctly when reopening the editor.
5. When scoring is disabled, the selector is hidden.
6. Clone correctly copies the `interpretation_profile` from the source survey.

**Notes / Dependencies:** Depends on Story 1. In this epic, the selector pulls from the hardcoded TypeScript registry (`INTERPRETATION_REGISTRY`). It will be replaced by a DB query in Epic 2 Story 6.

**QA:**
- Enable scoring, select PVS, save, refresh — verify PVS is still selected.
- Disable scoring — verify selector disappears.
- Clone a PVS-configured survey — verify clone also shows PVS.
- Set profile to None, save — verify no interpretation appears in results.

---

## Story 3 — Display interpretation in results and history

**Title:** Show knowledge-based interpretation in score views  
**As a** survey participant,  
**I want** to see an interpretation note and score bands only when my survey has an interpretation profile assigned,  
**so that** my result is explained by the specific knowledge base for that survey.

**Acceptance Criteria:**
1. After completing a scored survey with a profile assigned, the results view shows the profile's note text and default bands.
2. If the survey also has explicit `score_ranges` configured, those take precedence over the profile's default bands. The profile note still shows.
3. The history view uses the same survey-specific profile — not the survey title.
4. Switching locale does not change which profile is shown.
5. A survey with `interpretation_profile = NULL` shows only the raw score and any configured ranges — no note.
6. The old title-matching and item-count heuristic code is completely removed.

**Notes / Dependencies:** Depends on Stories 1 and 2. Touches `ScoreResults.tsx`, `ScoreHistory.tsx`, `QuestionnaireFiller.tsx`, and `score-interpretation.ts`.

**QA:**
- Complete a PVS survey → interpretation note appears, no bands (PVS is directional only).
- Complete a BRCS survey → note + low/medium/high bands appear.
- Complete a survey with no profile → no note.
- Complete a survey with custom ranges + BRCS profile → custom ranges shown, BRCS note shown.
- Switch to Hungarian, repeat — same note appears (locale-independent).

---

## Story 4 — Backfill existing surveys with interpretation profiles

**Title:** Assign correct interpretation profiles to already-published surveys  
**As a** system owner,  
**I want** existing PVS and BRCS surveys to receive the correct profile key,  
**so that** the new system works for surveys that were created before this feature existed.

**Acceptance Criteria:**
1. Existing PVS surveys have `interpretation_profile = 'pvs'` after the migration.
2. Existing BRCS surveys have `interpretation_profile = 'brcs'` after the migration.
3. All other surveys have `interpretation_profile = NULL`.
4. No `total_score`, answer data, or `score_ranges` values are altered.

**Notes / Dependencies:** Depends on Story 1. Migration SQL must be reviewed against actual production titles before running. Must be executed with the user present to watch logs.

**QA:**
- Open a PVS survey in the editor — verify PVS is shown in the profile selector.
- Complete the same survey — verify note appears.
- Open an unrelated survey — verify profile is empty, behaviour unchanged.
- Cross-check row count: `SELECT COUNT(*) FROM questionnaires WHERE interpretation_profile IS NOT NULL` matches expected number.

---

---

# Epic 2 — Interpretation Profile Library

**Goal:** Move interpretation profiles from hardcoded TypeScript constants to a
database-managed library. Admins can create and maintain profiles without a code
deploy. The survey editor now queries the DB for available profiles.

**Delivers:** The profile concept as a first-class, admin-managed entity. No AI, no
document upload yet — just metadata and the wiring to make profiles DB-owned.

---

## Story 5 — Create and name interpretation profiles

**Title:** Add new interpretation profiles through the admin UI  
**As an** admin,  
**I want** to create a named interpretation profile with a key, display name, and description,  
**so that** new profiles can be added without a code change or deployment.

**Acceptance Criteria:**
1. A new `interpretation_profiles` table exists with at least: `key TEXT UNIQUE`, `display_name_hu TEXT`, `display_name_en TEXT`, `description_hu TEXT`, `description_en TEXT`, `created_at`, `created_by`.
2. An admin UI screen (or panel within the questionnaire admin) allows creating a new profile with the fields above.
3. The `key` field is validated: lowercase, alphanumeric with underscores, unique.
4. A duplicate key is rejected with a clear error message.
5. New profiles appear immediately in the survey editor profile selector (Story 2).

**Notes / Dependencies:** Depends on Epic 1 being complete. The TypeScript `INTERPRETATION_REGISTRY` constant becomes read-only legacy — it is not deleted yet but is no longer the source of truth.

**QA:**
- Create a profile with key `gad7` — verify it appears in the survey editor selector.
- Attempt to create a second `pvs` key — verify duplicate is rejected.

---

## Story 6 — Edit and retire interpretation profiles

**Title:** Manage existing interpretation profiles  
**As an** admin,  
**I want** to edit a profile's display name and description, and soft-delete profiles that are no longer used,  
**so that** the profile library stays accurate over time.

**Acceptance Criteria:**
1. Admins can edit `display_name` and `description` fields. The `key` is immutable after creation.
2. A profile assigned to at least one survey cannot be hard-deleted — it can only be archived/retired.
3. Retired profiles no longer appear in the survey editor selector for new assignments but remain on surveys that already reference them.
4. Surveys referencing a retired profile continue to display their interpretation correctly.

**Notes / Dependencies:** Depends on Story 5.

**QA:**
- Edit the BRCS display name — verify the change appears in the editor dropdown.
- Attempt to delete PVS while it is assigned to a survey — verify it is blocked or archived instead.

---

## Story 7 — Seed built-in profiles into the DB

**Title:** Migrate hardcoded PVS and BRCS registry entries to the profile library  
**As a** system owner,  
**I want** PVS and BRCS to exist as rows in the `interpretation_profiles` table,  
**so that** all profiles are managed in one place and the TypeScript registry can be removed.

**Acceptance Criteria:**
1. A migration seeds `pvs` and `brcs` rows into `interpretation_profiles`.
2. The TypeScript `INTERPRETATION_REGISTRY` constant is deleted. `getProfileByKey()` now queries the DB (or a cached copy of it).
3. `score-interpretation.ts` no longer contains any hardcoded profile data.
4. All existing surveys with `interpretation_profile = 'pvs'` or `'brcs'` continue to work.

**Notes / Dependencies:** Depends on Stories 5 and 6. Run with log visibility.

**QA:**
- Verify PVS and BRCS rows exist in `interpretation_profiles` after migration.
- Complete a PVS survey — interpretation note still appears.
- TypeScript build has zero references to the old `INTERPRETATION_REGISTRY`.

---

---

# Epic 3 — Study Corpus per Profile

**Goal:** Each interpretation profile can have a body of source literature attached to it.
Admins can add studies as PDFs, as DOI/URL links, or as manually structured data entries.
No generation yet — this epic is about storing and managing the documents.

**Delivers:** The data layer for the knowledge base. After this epic, each profile has a
queryable corpus of source material that Epic 4 can use.

---

## Story 8 — Upload a study document to a profile

**Title:** Attach a PDF or text document to an interpretation profile  
**As an** admin,  
**I want** to upload a study document (PDF or plain text) to an interpretation profile's corpus,  
**so that** the profile has source material to ground its interpretations in.

**Acceptance Criteria:**
1. A new `profile_studies` table exists with: `id`, `profile_key`, `source_type` (`pdf` | `doi` | `manual`), `title`, `authors`, `year`, `citation_string`, `storage_path` (nullable), `doi` (nullable), `status` (`pending` | `indexed` | `error`), `created_at`.
2. Admins can upload a PDF from the profile management screen. The file is stored in Supabase Storage under a restricted, non-public bucket.
3. On upload, the study is created with `status = 'pending'`.
4. A maximum file size limit is enforced (suggest 20 MB).
5. Only `admin` role can upload documents.

**Notes / Dependencies:** Depends on Story 5. Requires a Supabase Storage bucket. Actual indexing (text extraction, chunking) is handled in Epic 4.

**QA:**
- Upload a PDF to the PVS profile — verify the row appears with `status = pending`.
- Attempt upload as an `editor` role — verify it is blocked.
- Upload a file over the size limit — verify it is rejected with a clear message.

---

## Story 9 — Add a study by DOI or URL

**Title:** Link a study to a profile by DOI or URL  
**As an** admin,  
**I want** to add a study by entering its DOI or URL,  
**so that** I can reference papers without uploading files, including open-access publications.

**Acceptance Criteria:**
1. The study entry form accepts a DOI (format-validated: `10.XXXX/...`) or a URL.
2. When a DOI is provided, the system attempts to auto-populate `title`, `authors`, `year`, and `citation_string` by fetching metadata from CrossRef (or similar).
3. If auto-population fails, the admin can fill the fields manually.
4. The study is saved with `source_type = 'doi'` and `status = 'pending'`.

**Notes / Dependencies:** Depends on Story 8 (same table). Requires a CrossRef or similar metadata API call. This call goes through a Supabase Edge Function to avoid exposing keys client-side.

**QA:**
- Enter a valid DOI — verify title/authors are auto-populated.
- Enter an invalid DOI format — verify format error appears before submission.
- Enter a valid DOI for a paywalled paper — verify partial metadata is fetched and the admin can complete the rest manually.

---

## Story 10 — Enter structured study data manually

**Title:** Add a study by typing in its key data  
**As an** admin,  
**I want** to manually enter the key findings, cutoff values, and citation for a study,  
**so that** I can capture data from paywalled or hard-to-fetch papers without uploading their full text.

**Acceptance Criteria:**
1. The study entry form has a `manual` mode with fields for: `title`, `authors`, `year`, `citation_string`, and a free-text `key_findings` field (Markdown supported).
2. Manually entered studies are saved with `source_type = 'manual'` and `status = 'indexed'` immediately (no extraction needed).
3. The `key_findings` text is stored and available to the interpretation generation step in Epic 4.

**Notes / Dependencies:** Depends on Story 8. Manual entries skip the extraction pipeline.

**QA:**
- Enter a study manually — verify it appears in the corpus list with status `indexed`.
- Verify `key_findings` Markdown renders correctly in the admin preview.

---

## Story 11 — View and remove studies from a corpus

**Title:** Manage the studies attached to an interpretation profile  
**As an** admin,  
**I want** to view the list of studies in a profile's corpus and remove individual entries,  
**so that** I can keep the knowledge base accurate and free of outdated references.

**Acceptance Criteria:**
1. The profile detail screen shows all attached studies with title, year, source type, and status.
2. An admin can delete a study. Deletion is permanent and requires a confirmation step.
3. If a deleted study was the only source used to generate existing interpretation content (Epic 4), a warning is shown: "Regeneration recommended."
4. Study status (`pending`, `indexed`, `error`) is visible and explained.

**Notes / Dependencies:** Depends on Stories 8–10.

**QA:**
- Add two studies, delete one — verify only the remaining one is listed.
- Delete the last study while interpretation content exists — verify the warning appears.

---

---

# Epic 4 — Interpretation Content

**Goal:** Use the corpus (Epic 3) to produce score-specific, literature-grounded
interpretation text with citations. Two generation paths are specified; one or both
can be built.

**Path A — Pre-generated:** An admin triggers generation once per profile. The output
is stored. Users see it instantly, with no AI cost at result time.

**Path B — On-demand:** Generation fires when the user sees their score. Output is
fresh and score-specific. Higher latency and per-request AI cost.

Both paths share the same display story (Story 16).

---

## Story 12 — Author interpretation content manually (no AI)

**Title:** Write score-band interpretations by hand for a profile  
**As an** admin,  
**I want** to type interpretation text per score band for a profile, with citations,  
**so that** surveys have human-authored, literature-backed explanations without requiring AI generation.

**Acceptance Criteria:**
1. A new `profile_interpretations` table exists with: `id`, `profile_key`, `score_min`, `score_max`, `body_hu`, `body_en`, `citations` (JSON array of study IDs from `profile_studies`), `generated_by` (`manual` | `ai`), `created_at`, `updated_at`.
2. Admins can create, edit, and delete interpretation entries per score band.
3. The citation picker shows the studies in the profile's corpus and allows selecting which ones support this band's text.
4. Content supports Markdown.
5. A band with `score_min = NULL` and `score_max = NULL` is treated as a "general note" shown regardless of the exact score.

**Notes / Dependencies:** Depends on Epic 3 (corpus must exist to pick citations from). Does not depend on AI infrastructure.

**QA:**
- Author a general note for PVS with one citation — complete the survey, verify note + citation appear.
- Author a band 17–20 entry for BRCS — score into that band, verify the correct entry is shown.

---

## Story 13 — Pre-generate interpretation content from the corpus (Path A)

**Title:** Generate and store score-band interpretations from the attached studies  
**As an** admin,  
**I want** to trigger a one-time AI generation run for a profile that reads the corpus and produces score-specific interpretation text per band,  
**so that** users see literature-grounded, cited interpretations instantly without per-request AI cost.

**Acceptance Criteria:**
1. A "Generate interpretations" action is available on the profile management screen.
2. The action calls a Supabase Edge Function that: extracts/reads all `indexed` studies in the corpus, passes them with the profile's score range structure to an LLM, and writes the output to `profile_interpretations` with `generated_by = 'ai'`.
3. The generation output includes: interpretation text per band (or a general note), and a `citations` array referencing the study IDs used.
4. Generation status is shown: `running`, `complete`, `error`.
5. Previously generated content is not overwritten automatically — the admin must explicitly approve a re-generation.
6. If a study has `status = 'pending'` (not yet indexed), it is skipped and flagged in the generation log.

**Notes / Dependencies:** Depends on Story 12 for the storage table. Requires an LLM-capable Edge Function (Gemini or equivalent). Blocked until the AI Sensemaking infrastructure decisions are made (see `BLUEPRINT.md`).

**QA:**
- Trigger generation with two indexed studies — verify output rows appear in `profile_interpretations`.
- Trigger with a pending study — verify it is skipped and logged.
- Complete a survey after generation — verify generated text appears with citations.

---

## Story 14 — On-demand score interpretation at result time (Path B)

**Title:** Generate a fresh interpretation when the user sees their score  
**As a** survey participant,  
**I want** to receive an AI-generated, literature-backed interpretation of my specific score when I complete a survey,  
**so that** the explanation is tailored to my exact result rather than a pre-written band.

**Acceptance Criteria:**
1. When a user completes a scored survey with a profile that has an indexed corpus but no pre-generated content, the system calls an Edge Function at result time.
2. The Edge Function retrieves the relevant corpus documents (or chunks), passes the user's score and the profile's score range context, and returns an interpretation paragraph with citations.
3. The response is shown in the results view within an acceptable time (target < 5 seconds; show a skeleton/loader in the meantime).
4. The generated output is cached per `(profile_key, score)` pair so the same score on the same profile does not trigger a second LLM call.
5. No personal user data (answers, identity) is included in the LLM prompt — only the score value and the corpus.

**Notes / Dependencies:** Depends on Story 13 (same corpus infrastructure). Significant AI cost and latency considerations. Should be gated behind the `scoring_enabled` flag and only called if `interpretation_profile` is set. Blocked until AI Sensemaking infrastructure is in place.

**QA:**
- Complete a PVS survey with score 24 — verify a score-specific paragraph appears with a latency < 5 s.
- Complete the same survey a second time with score 24 — verify no second LLM call is made (cache hit).
- Verify the LLM prompt logged server-side contains no user ID, answers, or PII.

---

## Story 15 — Display citations alongside interpretation

**Title:** Show source citations with the interpretation note  
**As a** survey participant,  
**I want** to see the source studies cited in my interpretation,  
**so that** I can verify the basis of the explanation and access the original literature.

**Acceptance Criteria:**
1. The results view and history view show cited studies below the interpretation text.
2. Each citation shows: author(s), year, title, and either a DOI link or a note that the source is a manual entry.
3. DOI links open in a new tab.
4. Citations are shown in a compact, readable format — not raw JSON.
5. If no citations are recorded for the interpretation, no citation section is rendered.

**Notes / Dependencies:** Depends on Story 12 (manual) or Story 13/14 (AI-generated). The `citations` field in `profile_interpretations` drives this display. Purely a rendering story — no new data structures required.

**QA:**
- View a result with two cited studies — verify both appear with correct metadata.
- Click a DOI link — verify it opens the correct paper URL.
- View a result with a manually-entered study (no DOI) — verify the citation shows without a broken link.

---

## Story 16 — Fallback and edge-case handling for interpretation display

**Title:** Handle missing, pending, or errored interpretation gracefully  
**As a** survey participant,  
**I want** the app to never crash or show broken UI when interpretation content is unavailable,  
**so that** I always see at least the raw score and configured ranges.

**Acceptance Criteria:**
1. If a profile is assigned but has no corpus and no authored content, the results view shows only the score and ranges — no error, no spinner.
2. If on-demand generation (Path B) times out or errors, the results view falls back to pre-generated content if available, or to score-only if not.
3. If a study linked in a citation has been deleted since the interpretation was generated, the citation is omitted silently (no broken reference shown to the user).
4. All fallback states are covered by an `ErrorBoundary` — interpretation failure never breaks the score display.

**Notes / Dependencies:** Cross-cutting. Should be built alongside Stories 12–15.

**QA:**
- Assign a profile with no content — complete the survey — verify score displays, no error shown.
- Simulate a generation timeout — verify fallback to score-only.

---

---

## Dependency Map

```
Story 1  (schema)
  └─ Story 2  (editor)
       └─ Story 3  (display) ← also depends on Story 1 directly
            └─ Story 4  (backfill)

Story 5  (profile entity)
  ├─ Story 6  (edit/retire)
  └─ Story 7  (seed PVS/BRCS to DB)

Story 8  (PDF upload)
  ├─ Story 9  (DOI/URL)
  ├─ Story 10 (manual entry)
  └─ Story 11 (view/remove)

Story 12 (manual authoring)
  ├─ Story 13 (pre-generate AI)       ← requires AI infrastructure
  ├─ Story 14 (on-demand AI)          ← requires AI infrastructure
  └─ Story 15 (citations display)
       └─ Story 16 (fallback handling)
```

## Blocked Until

- **Stories 13 & 14** are blocked until the **AI Sensemaking infrastructure** is
  decided (model, Edge Function scaffold, rate-limiting strategy). This remains
  suspended in `BLUEPRINT.md` pending the SNOMED CT / BNO-10 clinical entity work.

- **Stories 8–11** require a Supabase Storage bucket decision (bucket name, retention
  policy, access control, size quotas).
