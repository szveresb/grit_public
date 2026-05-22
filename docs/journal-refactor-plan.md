# Refactor Plan: Symptom-First Journal Journey (ICD-SNOMED Driven, No Implementation)

## Summary
Design a new self-journal flow in `grit.hu` where users start with symptom cards generated from ICD-SNOMED terms/descriptions, then optionally add narrative details.
Source of truth for cards will be `icd-snomed`’s `icd_snomed_map`, with v1 scope focused on ICD chapters **R, F, Z**, while preserving the “Clinical Core, Human Surface” rule by hiding clinical codes in UI.

## Implementation Changes (Spec Only)
1. **Card Taxonomy and Generation Rules**
- Define a card-generation spec that transforms `icd_snomed_map` rows into app-facing symptom card objects: `card_id`, `label_hu`, `label_en`, `description_hu`, `description_en`, `icd_code`, `snomed_code`, `chapter_tag`.
- Add deterministic deduplication policy: group duplicates by normalized `(icd_code, snomed_code)` and select one canonical card text.
- Define filtering policy for v1: include only rows where ICD code falls under R/F/Z scope; exclude non-user-friendly or empty descriptions.
- Define language rendering contract: every card must have HU+EN parity before exposure; fallback behavior is explicit (card withheld if parity missing).

2. **New User Journey (Self Stance)**
- Replace current category›concept-first entry path with **Symptom Cards › Intensity › Optional Details › Save**.
- Step 1 (cards): user selects one or more symptom cards from scoped sets (R/F/Z) with search and quick categories.
- Step 2 (intensity): apply current 1–5 impact control to selected card set.
- Step 3 (optional details): existing narrative fields (`what happened`, `feeling`, `my truth`, `notes`) stay optional and secondary.
- Save behavior spec: one journal event persists, with linked structured symptom selections retained for downstream patterning and exports.

3. **Interfaces and Data Contracts (Planned)**
- Introduce planned UI-domain type (example shape): `SymptomCard`, `SymptomSelection`, `JournalSymptomPayload`.
- Define adapter boundary between external ICD-SNOMED mapping and internal journaling UI model (so future mapping-source changes do not leak into UI components).
- Define planned compatibility contract with existing observation/pattern modules: selected cards remain mappable to current concept analytics surfaces, or pass through a translation layer.
- Define i18n key plan for new journey text in both `src/i18n/hu.ts` and `src/i18n/en.ts` (no hardcoded labels).

4. **Rollout and Compatibility Plan**
- Phase 1: design-only artifacts (flow spec, card schema, mapping rules, i18n key matrix, acceptance criteria).
- Phase 2: parallel-run strategy (new card flow behind feature flag for self stance only) while legacy observation flow remains intact.
- Phase 3: telemetry and quality gates (selection completion rate, drop-off by step, save success, missing-localization incidents) before default switch.

## Test Plan (Acceptance Scenarios for Future Implementation)
1. Self user can complete card-first flow using only symptom cards + intensity and save successfully.
2. Self user can complete card-first flow with optional narrative fields filled.
3. HU and EN both render identical card sets semantically (no missing key, no code leakage).
4. Out-of-scope ICD rows (outside R/F/Z in v1) never appear in symptom card UI.
5. Duplicate ICD-SNOMED mappings do not create duplicate cards in selector.
6. Saved structured selections remain available for timeline/pattern logic without breaking existing charts.
7. Relative/observer flows remain unchanged unless explicitly included in a later phase.

## Assumptions and Defaults
- Repository target for planned implementation is `grit.hu`; `icd-snomed` is treated as terminology source/reference.
- Scope is **design/spec only** in this turn; no code, migration, or runtime changes.
- Default journey is **cards first, details second**, with details optional.
- Default terminology source is `icd_snomed_map` from `icd-snomed`.
- Initial chapter scope is **R + F + Z** per your preference (interpreted as priority scope for v1).
