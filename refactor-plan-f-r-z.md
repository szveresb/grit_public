# Refactor Plan: Coverage-First Symptom/Event Journal Journey (ICD-SNOMED, F/R/Z)

## 1. Summary
Refactor the `/journal` logging experience into a card-first journey where users start from intuitive concepts (for example: "racing thoughts") and only optionally add narrative details.

Core rules:
- Clinical core remains SNOMED + ICD linked.
- User-facing language remains warm, non-clinical, and bilingual (HU/EN parity).
- Candidate sourcing starts from ICD chapters `F`, `R`, `Z`, but inclusion decisions are semantic, not chapter-only.
- v1 scope includes both self and supported-person stance flows.

## 2. Objectives and Success Criteria

### Objectives
1. Guarantee that context-relevant concepts from `R` and `Z` are not accidentally dropped.
2. Ensure card selection starts with intuitive user language, not clinical labels.
3. Preserve interoperability and pattern analytics via stable concept-level identity.
4. Maintain strict bilingual parity and no clinical code leakage in UI.

### Success Criteria
1. 100% of `F/R/Z` candidate concepts have explicit decision state: `included`, `excluded`, or `review_pending`.
2. Required concepts list (including "racing thoughts") is fully present in the published catalog.
3. New journey can be completed with cards + intensity only, narrative optional.
4. Existing timeline/pattern surfaces continue to work with new structured selections.
5. No HU/EN parity violations in published card set.

## 3. Terminology Source and Canonical Data Model

### 3.1 Canonical Source Contract
Lock one v1 terminology source schema before implementation. Minimum required fields:
- `icd_code`
- `icd_description`
- `snomed_code`
- `snomed_term`
- `map_type` (advice text / mapping context)

If source changes later (table vs CSV), adapter must preserve this contract.

### 3.2 Canonical Concept Identity
Use SNOMED concept as the primary identity. ICD linkage is metadata.

Canonical entities:
1. `TerminologyConcept`
- `concept_id` (internal stable id)
- `snomed_code`
- `preferred_term_raw`
- `synonym_terms[]`
- `icd_links[]` (`icd_code`, `chapter_tag`, `icd_description`)
- `map_advice[]`

2. `JournalCard`
- `card_id`
- `lane` (`symptom` or `context_event`)
- `label_hu`
- `label_en`
- `description_hu` (optional)
- `description_en` (optional)
- `snomed_code`
- `icd_links[]`
- `coverage_state` (`included|excluded|review_pending`)
- `coverage_reason`
- `active`

### 3.3 Deduplication and Canonicalization Rules
1. Normalize strings (trim, collapse spaces, normalize case for matching).
2. Remove exact row duplicates.
3. Group rows by `snomed_code` as master concept identity.
4. Merge ICD links into many-to-many set.
5. Build synonym pool from distinct `snomed_term` values.
6. Select deterministic canonical raw term using fixed precedence:
- non-empty preferred term
- shortest clinically equivalent term
- lexical tie-breaker for determinism

## 4. Coverage-First Semantic Inclusion Pipeline

### 4.1 Candidate Pool
- Include all normalized concepts with at least one ICD link in chapters `F`, `R`, or `Z`.

### 4.2 Semantic Buckets
Classify each candidate into one or more buckets:
1. Internal symptom domains:
- cognition
- affect/mood
- arousal/stress
- somatic experience
- behavior/impulse
2. Context/event domains:
- interpersonal conflict
- family/relationship strain
- social/economic stressor
- legal/occupational/education stressor
- environmental exposure context

### 4.3 Decision States and Governance
Every candidate must get one explicit state:
1. `included`: journaling-relevant and user-observable.
2. `excluded`: not appropriate for user-facing cards (must store explicit reason code).
3. `review_pending`: ambiguous concepts requiring editorial/clinical review.

No silent drops allowed.

### 4.4 Required Concepts Guard
Maintain `must_include_concepts` list (concept-level guard) and `must_include_aliases` fallback for retrieval.

Rules:
1. If a required concept is missing from final included set, catalog build fails.
2. "Racing thoughts" must be represented as at least one active `JournalCard` with searchable aliases.

### 4.5 Golden Set Usage (Regression Only)
Keep a curated expected-items set for regression safety. It is not completeness proof.

Completeness proof comes from:
- full candidate accounting
- explicit decision states
- review queue resolution
- required-concept guard

## 5. Intuitive Card UX Layer (Clinical Core, Human Surface)

### 5.1 Language Rules
1. User-facing labels are humanized, not raw clinical terms.
2. Clinical identifiers never shown in card browsing, selection, or save confirmation.
3. Every active card must have HU and EN labels before publication.

### 5.2 Search and Discovery
1. Search index uses `label_hu`, `label_en`, and alias terms.
2. User phrase recall must support natural queries (e.g., racing thoughts, overthinking, mind spinning).
3. Lane filters and quick chips should expose symptom vs context pathways clearly.

## 6. New Journal Journey Specification

Journey order:
1. Card Selection (symptom + context cards)
2. Intensity/Impact
3. Optional Narrative
4. Review and Save

### 6.1 Step 1: Card Selection
- User selects one or more cards from two logical lanes:
  - symptom lane (mostly F/R mental-somatic signals)
  - context-event lane (mostly Z/R contextual stressors)
- Search and quick categories available.

### 6.2 Step 2: Intensity/Impact
- Apply 1–5 intensity for selected symptom cards.
- Context cards may optionally capture impact/severity marker where relevant.

### 6.3 Step 3: Optional Narrative
- Existing narrative fields remain optional:
  - what happened
  - feeling
  - my truth
  - notes

### 6.4 Step 4: Review and Save
- Show human-readable summary only.
- Save one journal event with linked structured card selections.

## 7. Persistence and Compatibility Contract

### 7.1 Planned Payload Types
1. `CardSelection`
- `card_id`
- `snomed_code`
- `icd_codes[]`
- `lane`
- `intensity?`
- `context_modifiers?`

2. `JournalStructuredPayload`
- `stance` (`self|relative`)
- `subject_id?`
- `selections[]`
- `narrative?`
- `logged_at`

### 7.2 Adapter Boundary
Define explicit adapter from terminology catalog to journaling UI model so source swaps (CSV/table) do not leak into UI logic.

### 7.3 Existing Module Compatibility
Structured selections must stay mappable to current concept-based analytics/pattern surfaces through direct concept links or translation layer.

## 8. Localization and Content Standards
1. All new user-visible texts added to `src/i18n/hu.ts` and `src/i18n/en.ts`.
2. No hardcoded strings in components.
3. Active card publication blocked when HU/EN parity is missing.
4. Excluded/review_pending cards logged in governance report with reason codes.

## 9. Rollout Plan

### Phase 1: Design and Artifacts
- Finalize catalog schema, decision-state taxonomy, semantic rules, i18n matrix, and acceptance criteria.

### Phase 2: Feature-Flagged Parallel Run
- Introduce new card-first flow behind flag for controlled cohorts.
- Keep legacy observation path available until quality gates pass.

### Phase 3: Quality Gates and Default Switch
Minimum release gates before making new flow default:
1. Required concept coverage: 100% pass.
2. Candidate decision coverage: 100% pass.
3. Save success rate above agreed threshold.
4. Missing-localization incidents: 0.
5. Critical UX drop-off by step within agreed threshold.

## 10. Test Plan (Implementation Acceptance)

### 10.1 Catalog Build and Coverage
1. Includes only candidates linked to F/R/Z for v1 pool.
2. Produces deterministic canonical concepts across repeated runs.
3. Assigns decision state to every candidate.
4. Fails build when required concepts are missing.

### 10.2 Journey Behavior
1. User can save with structured selections only.
2. User can save with structured selections + optional narrative.
3. Step order and validations behave identically in HU and EN.

### 10.3 Stance and Persistence
1. Self stance saves to self context correctly.
2. Relative stance saves to selected supported-person context correctly.
3. Structured selections remain available for timeline/pattern surfaces.

### 10.4 Regression and Interop
1. Existing charts/pattern summaries still resolve concept labels.
2. No UI code leakage of SNOMED/ICD identifiers.
3. Export/interoperability paths continue to receive stable clinical links.

## 11. Explicit Assumptions
1. This document is spec-only; no runtime or schema mutation is part of this step.
2. F/R/Z is v1 candidate scope, not final inclusion guarantee by itself.
3. Golden expected-items list is regression guard only, not completeness proof.
4. Completeness assurance is based on semantic crosscheck + full candidate accounting + review governance.
