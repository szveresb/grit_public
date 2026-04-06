# [PLAN] Clinical Entity Architecture (SNOMED CT / BNO-10)

This plan establishes the foundational postgres and application logic required to map user observations into standardized clinical terminologies. This is a prerequisite for subsequent AI-powered sensemaking, as the pattern detection logic must target verified clinical codes (BNO-10/SNOMED) rather than unstructured text.

## User Review Required

> [!IMPORTANT]
> This plan involves structural database changes to the `observation_concepts` and the addition of a global `clinical_registry`. These changes must be validated against existing data to prevent migration breakages.

## Proposed Changes

### Database Layer (Supabase Migrations)

#### [MODIFY] `observation_concepts`
- Add `clinical_entity_id` foreign key.
- Maintain legacy `concept_code` and `bno_code` as fallback fields during the transitional period.

#### [NEW] `clinical_entities` table
- Columns: `id` (UUID), `system` (enum: 'SNOMED', 'BNO'), `code` (string), `display_name_hu` (string), `display_name_en` (string), `metadata` (JSONB).

### Frontend Layer (Types and Logic)

#### [MODIFY] `src/integrations/supabase/types.ts`
- Update schema definitions to include new clinical tables.

#### [MODIFY] `src/components/observations/ObservationStepper.tsx`
- Refactor the concept selection logic to fetch directly from the registry rather than hardcoded lists.

## Verification Plan

### Automated Tests
- `npm run test` for schema validation.
- Supabase CLI tests for RLS policy integrity on the new registry.

### Manual Verification
- Verify that "Physical" and "Mental" categories still render correctly and map to the new registry IDs.
- Export a mockup FHIR bundle to confirm dual-coding (SNOMED + BNO) is operational.
