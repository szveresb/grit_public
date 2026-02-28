

# FHIR and SNOMED CT Integration for Grit.hu

## Summary

This plan adds healthcare interoperability standards to the observation system: SNOMED CT codes for terminology and FHIR-compliant JSON export. The user-facing UI remains unchanged -- only backend data and export formatting are affected.

---

## Phase 1: SNOMED CT Terminology Seeding

Update the `concept_code` values in `observation_concepts` to use real SNOMED CT identifiers. The `name_hu` and `name_en` columns remain the user-facing Display terms.

**Mapping (current internal codes to SNOMED CT IDs):**

| Current concept | SNOMED CT ID | SNOMED Term |
|---|---|---|
| Feeling unheard | 247735008 | Feeling ignored |
| Narrative distortion | 386806002 | Impaired communication |
| Emotional withdrawal | 247592009 | Emotional withdrawal |
| Circular arguing | 276079006 | Conflict behavior |
| Stonewalling | 225901009 | Avoidance behavior |
| Being positioned as aggressor | 386807006 | Communication problem |
| Boundary crossing | 282473006 | Boundary violation |
| Controlling behavior | 370597003 | Controlling behavior |
| Privacy violation | 225824009 | Breach of privacy |

**Implementation:** Use the data insert tool to run UPDATE statements on `observation_concepts`, setting `concept_code` to the SNOMED ID for each row matched by current `concept_code`.

---

## Phase 2: Add `status` Column to `observation_logs`

Add a `status` column to align with the mandatory FHIR Observation `status` field.

**Database migration:**
```sql
ALTER TABLE observation_logs
  ADD COLUMN status text NOT NULL DEFAULT 'final';
```

Valid FHIR values: `registered`, `preliminary`, `final`, `amended`, `cancelled`. Default is `final` since logged observations are considered complete. No existing rows break because the default covers them.

**Frontend impact:** Minimal. The ObservationStepper insert already omits columns with defaults, so the new column is automatically set to `'final'` on insert. No UI changes needed unless we later want users to amend/cancel observations.

---

## Phase 3: FHIR-Compliant Export

### 3a: New aggregation function for observation data

Create a new `analyst_observation_aggregates()` SECURITY DEFINER function that returns anonymized observation statistics (concept counts, average intensity) -- no user IDs exposed.

```sql
CREATE OR REPLACE FUNCTION analyst_observation_aggregates()
RETURNS TABLE(
  concept_code text,
  concept_name_en text,
  log_count bigint,
  avg_intensity numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    oc.concept_code,
    oc.name_en AS concept_name_en,
    COUNT(*)::bigint AS log_count,
    ROUND(AVG(ol.intensity)::numeric, 2) AS avg_intensity
  FROM observation_logs ol
  JOIN observation_concepts oc ON oc.id = ol.concept_id
  GROUP BY oc.concept_code, oc.name_en
  ORDER BY log_count DESC;
$$;
```

### 3b: Update `analyst-export` edge function

Add observation aggregates to the existing export payload **and** add an optional `?format=fhir` query parameter that wraps the observation data as a FHIR Bundle of Observation resources.

**FHIR Bundle structure (when `?format=fhir`):**

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "timestamp": "2026-02-28T...",
  "entry": [
    {
      "resource": {
        "resourceType": "Observation",
        "status": "final",
        "code": {
          "coding": [{
            "system": "http://snomed.info/sct",
            "code": "247735008",
            "display": "Feeling ignored"
          }]
        },
        "valueInteger": 3,
        "note": [{"text": "Aggregated: 42 observations, avg intensity 3.21"}]
      }
    }
  ]
}
```

The 10+ user threshold check remains enforced. No individual user data is ever included.

**Default format (no query param):** Existing JSON structure plus a new `observation_aggregates` array.

### 3c: Personal FHIR export (user's own data)

Update `src/pages/Export.tsx` to include the user's own observation logs in their personal export, formatted as FHIR Observation resources. This is the user's own data (protected by RLS), not aggregated.

Each observation log becomes a FHIR Observation:
- `subject`: anonymous reference (no user ID in output)
- `code.coding[0]`: SNOMED CT code from `observation_concepts.concept_code`
- `effectiveDateTime`: `logged_at`
- `valueInteger`: `intensity`
- `status`: from the new `status` column
- `component`: frequency and context as additional components

---

## Phase 4: Update SYSTEM_DESCRIPTION.md

Add documentation for:
- SNOMED CT coding in `observation_concepts.concept_code`
- New `status` column on `observation_logs`
- FHIR export capability
- New `analyst_observation_aggregates()` function

---

## Technical File Changes

| File | Action |
|---|---|
| Database (insert tool) | UPDATE `observation_concepts` concept_code values to SNOMED IDs |
| Database (migration) | ADD `status` column to `observation_logs` |
| Database (migration) | CREATE `analyst_observation_aggregates()` function |
| `supabase/functions/analyst-export/index.ts` | Add observation aggregates + optional FHIR Bundle format |
| `src/pages/Export.tsx` | Include observation logs in personal export as FHIR Observations |
| `src/i18n/types.ts`, `hu.ts`, `en.ts` | Add export-related labels for observation data |
| `SYSTEM_DESCRIPTION.md` | Document SNOMED CT and FHIR integration |

---

## What stays unchanged

- **ObservationStepper UI** -- users still see `name_hu`/`name_en` labels; SNOMED codes are invisible
- **ObservationHistory** -- no changes needed
- **RLS policies** -- already correct on all relevant tables
- **Privacy threshold** -- 10+ user check remains enforced in analyst-export

