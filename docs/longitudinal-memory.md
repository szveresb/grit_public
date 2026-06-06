# Longitudinal Memory — Plan (saved)

Stay 100% inside Lovable Cloud (Supabase Postgres). No new tables, no second
datastore. Build a **query layer** of `SECURITY INVOKER` SQL functions (so
per-user RLS is preserved automatically), then a dedicated `/patterns` page
that surfaces three lenses in phases. A small manifesto block makes the
distinction legible to users.

## Manifesto (draft — to refine)

Header of `/patterns`, short version on landing:

> **"We don't diagnose. We remember — with you, across time."**
> *Grit őrzi az időt veled. Mintákat mutat, nem ítéletet.*

Three sub-claims:
1. **Longitudinal, not snapshot** — every entry stays linked to its context, week over week.
2. **Relational, not isolated** — patterns include what you noticed in others, with consent.
3. **Yours, not extracted** — queries run under your row-level security; nothing leaves your account without your export.

## Architecture (pure query layer)

```text
/patterns page
  Manifesto block
  ├─ Tab: Sequences  (Phase 1)
  ├─ Tab: Relations  (Phase 2)
  └─ Tab: Ontology   (Phase 3)
        │ supabase.rpc(...)
        ▼
  SECURITY INVOKER SQL functions
  (RLS on observation_logs / journal_entries /
   questionnaire_responses applies unchanged)
        │
        ▼
  Recursive CTEs + window funcs over existing tables
```

No new tables, no matviews, no edge functions in Phase 1.

## Phase 1 — Sequences

Goal: "After concept A, concept B tends to follow within N days."

- Migration: `rpc_concept_sequences(p_window_days int default 7, p_min_support int default 3)` — `SECURITY INVOKER`. Self-join `observation_logs` for `auth.uid()` within window; returns `(antecedent_id, consequent_id, n, avg_lag_days, lift)`.
- Migration: `rpc_concept_weekly_load()` — per-ISO-week count + avg intensity per concept (moves logic from `PatternChart.tsx` into SQL).
- UI: `src/pages/Patterns.tsx`, `src/components/patterns/{SequenceList,WeeklyHeatstrip,PatternsManifesto}.tsx`. Reuses `surface-card`, FreudIcons, i18n.
- Route: add `/patterns` and `/en/patterns` in `App.tsx`; sidebar entry with `FTimeline` icon.

## Phase 2 — Relations

Goal: correlate self-observations with subject observations on a shared timeline.

- Migration: `rpc_self_vs_subject_correlation(p_subject_id uuid, p_concept_id uuid, p_lag_days int default 0)` — Pearson over daily aggregates (port `pearsonAtLag` from `src/lib/correlation.ts`).
- Migration: `rpc_subject_pattern_summary(p_subject_id uuid)` — top co-occurring (subject concept, self concept) pairs.
- UI: `RelationsTab.tsx` — subject picker, concept pair matrix, lag slider, reuses `CorrelationScatter`.

## Phase 3 — Ontology

Goal: roll observations up to BNO-10 / SNOMED parents.

- Migration: `rpc_concept_rollup_by_category()` — group `observation_logs` by `observation_concepts.category_id`, weekly counts.
- UI: `OntologyTab.tsx` — category load treemap + drilldown.
- Recursive parent traversal deferred until a `parent_id` column exists on concepts.

## Safety + compliance

- All RPCs `SECURITY INVOKER`, `SET search_path = public`, explicit `GRANT EXECUTE ... TO authenticated`.
- RLS on `observation_logs`, `journal_entries`, `questionnaire_responses`, `subjects` enforced unchanged — every RPC scoped to `auth.uid()`.
- `/patterns` header carries the standard non-diagnostic disclaimer; exports keep the `Non-Diagnostic Data` watermark.
- No social/community surfaces. No cross-user reads.

## Out of scope

- No new tables, no `clinical_entity_relations`, no materialized views, no graph DB, no nightly jobs.
- No AI on `/patterns` in Phase 1 (deterministic SQL only). AI narration can come later, reusing `journal-patterns`.
- No changes to `/journal` or `/timeline`; `/patterns` is purely additive.

## Deliverables per phase

| Phase | Migration | UI files | Sidebar |
|------|-----------|----------|---------|
| 1 | `rpc_concept_sequences`, `rpc_concept_weekly_load` | `Patterns.tsx`, `SequenceList.tsx`, `WeeklyHeatstrip.tsx`, `PatternsManifesto.tsx` | yes |
| 2 | `rpc_self_vs_subject_correlation`, `rpc_subject_pattern_summary` | `RelationsTab.tsx` | tab |
| 3 | `rpc_concept_rollup_by_category` | `OntologyTab.tsx` | tab |

## Open questions for pickup

1. Final manifesto copy.
2. Sidebar label: "Patterns / Minták" vs "Across time / Időben".
3. Ship Phase 1 only, or scaffold all three tabs with placeholders for visibility.
