

# BNO-10 (ICD-10-HU) Integration

## Summary

Add BNO-10 codes alongside existing SNOMED CT codes in the observation system, creating a dual-code catalog that serves both international clinical interoperability (SNOMED) and Hungarian healthcare compatibility (BNO). Includes a "Therapist Export" feature generating a BNO-grouped summary.

---

## Phase 1: Database -- Add `bno_code` Column

Add a nullable `bno_code` text column to `observation_concepts`. This keeps SNOMED CT as the primary clinical code while adding the Hungarian administrative code.

**Migration:**
```sql
ALTER TABLE observation_concepts
  ADD COLUMN bno_code text;

COMMENT ON COLUMN observation_concepts.bno_code
  IS 'BNO-10 (ICD-10-HU) code for Hungarian healthcare interoperability';
```

Then seed existing concepts with BNO mappings via the data insert tool:

| Concept (name_en) | SNOMED code | BNO code |
|---|---|---|
| Feeling ignored | 247735008 | Z63.0 |
| Impaired communication | 386806002 | Z63.0 |
| Emotional withdrawal | 247592009 | F43.2 |
| Conflict behavior | 276079006 | Z63.0 |
| Avoidance behavior | 225901009 | Z63.5 |
| Communication problem | 386807006 | Z63.0 |
| Boundary violation | 282473006 | Z60.4 |
| Controlling behavior | 370597003 | Z63.0 |
| Breach of privacy | 225824009 | Z60.4 |

---

## Phase 2: Personal Export -- "Therapist Export" Button

Add a second export option on the Export page that generates a BNO-grouped summary designed for Hungarian therapists.

**Format:** JSON download with observations grouped by BNO code, including the official Hungarian BNO label, date range, frequency counts, and average intensity per code.

**Structure:**
```json
{
  "export_type": "therapist_summary",
  "exported_at": "...",
  "bno_summary": [
    {
      "bno_code": "Z63.0",
      "bno_label_hu": "Házastárssal vagy partnerrel kapcsolatos problémák",
      "observation_count": 12,
      "avg_intensity": 3.5,
      "date_range": { "from": "2026-01-15", "to": "2026-02-28" },
      "observations": [
        { "concept_hu": "Félreértés érzése", "intensity": 4, "logged_at": "2026-02-20", "context": "otthon" }
      ]
    }
  ]
}
```

**UI changes to `src/pages/Export.tsx`:**
- Keep existing "Export all data" button as-is
- Add a new card below it: "Terapeuta export / Therapist Export" with a description explaining the BNO-grouped format
- New button triggers `handleTherapistExport` which queries `observation_logs` + `observation_concepts` (including `bno_code`, `name_hu`), groups by BNO code, and downloads

**BNO label mapping:** Store a static lookup of BNO code to official Hungarian name in the export logic (keeps it self-contained without needing another DB table for a small set of codes).

---

## Phase 3: FHIR Dual-Coding in Personal Export

Update `buildPersonalFhirObservations` in `Export.tsx` to include BNO as a second coding entry alongside SNOMED:

```json
"code": {
  "coding": [
    { "system": "http://snomed.info/sct", "code": "247735008", "display": "Feeling ignored" },
    { "system": "http://hl7.org/fhir/sid/icd-10", "code": "Z63.0", "display": "Problems in relationship with spouse or partner" }
  ]
}
```

This makes the FHIR output valid for both international and Hungarian contexts.

---

## Phase 4: i18n Updates

Add new dictionary keys for the therapist export UI:

| Key path | HU | EN |
|---|---|---|
| `export.therapistTitle` | Terapeuta export | Therapist Export |
| `export.therapistDesc` | BNO-10 kódok szerint csoportosított összefoglaló, amelyet megoszthat terapeutájával. | Summary grouped by BNO-10 codes to share with your therapist. |
| `export.therapistExport` | Terapeuta export letöltése | Download Therapist Export |
| `export.noObservations` | Nincsenek megfigyelések az exporthoz. | No observations to export. |

---

## Phase 5: Update Documentation

Update `SYSTEM_DESCRIPTION.md` to document:
- The new `bno_code` column on `observation_concepts`
- The dual SNOMED/BNO coding strategy
- The therapist export feature

---

## File Changes Summary

| File | Change |
|---|---|
| Database migration | ADD `bno_code` column to `observation_concepts` |
| Database (insert tool) | UPDATE `bno_code` values for existing concepts |
| `src/pages/Export.tsx` | Add therapist export card + handler; update FHIR builder for dual coding |
| `src/i18n/types.ts` | Add therapist export keys |
| `src/i18n/hu.ts` | Add Hungarian labels |
| `src/i18n/en.ts` | Add English labels |
| `SYSTEM_DESCRIPTION.md` | Document BNO integration |

