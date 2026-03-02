

# Regulatory Compliance Audit: Grit.hu

## Summary

The system is **largely compliant** with the regulatory guardrails but has **4 gaps** that need to be addressed.

---

## Audit Findings

### PASS: Human-in-the-Loop Observation Tagging
The `ObservationStepper` requires explicit 3-step user action: select category, select concept, confirm with qualifiers. No auto-tagging occurs.

### PASS: AI System Prompts (Non-Diagnostic Language)
Both `journal-reflect` and `journal-patterns` edge functions include strict system prompts that prohibit clinical/diagnostic language, DSM terminology, and treatment suggestions.

### PASS: Analyst Export Privacy Threshold
The `analyst-export` edge function enforces a 10+ user minimum before releasing anonymized data.

### PASS: Timeline Pattern Nudges as Passive Notifications
The Timeline page nudges ("X logged 3+ times this week") are static, user-data-driven threshold alerts -- not AI-generated. This aligns with the "passive notification system" requirement.

### PASS: No Automated Clinical Decision-Making
No code path evaluates user mental state or suggests treatment.

---

### GAP 1: Exports Missing "Non-Diagnostic Data" Disclaimer (CRITICAL)

**Requirement:** All system outputs (PDF, JSON exports, dashboards) must include the watermark: *"Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment."*

**Current state:** The disclaimer text exists only on the About Legal page. The actual export files (`Export.tsx` personal export, therapist export, and `analyst-export` edge function) do **not** include this disclaimer in the exported JSON data.

**Fix:** Add a `disclaimer` field to all three export payloads:
- Personal export JSON in `Export.tsx` (`handleExport`)
- Therapist export JSON in `Export.tsx` (`handleTherapistExport`)
- Analyst export JSON in `analyst-export/index.ts`

Both in English and Hungarian (bilingual).

---

### GAP 2: PatternSummary AI Output Missing Disclaimer (MODERATE)

**Requirement:** All generated summaries must be labeled as non-diagnostic.

**Current state:** The `PatternSummary` component displays AI-generated pattern analysis without any disclaimer. The AI system prompt avoids clinical language, but the output itself carries no visible "non-diagnostic" label.

**Fix:** Add a small disclaimer text below the AI-generated pattern summary in `PatternSummary.tsx`.

---

### GAP 3: Journal Reflection AI Output Missing Disclaimer (MODERATE)

**Requirement:** Same as above.

**Current state:** The journal reflection responses (from `journal-reflect`) are displayed in `JournalEntryCard` without a non-diagnostic disclaimer.

**Fix:** Add a small disclaimer beneath reflected content in the journal entry card.

---

### GAP 4: Dashboard Has No Disclaimer on Activity Summary (LOW)

**Requirement:** Dashboard outputs should carry the watermark.

**Current state:** The Dashboard shows recent activity (titles, impact levels) without a disclaimer. This is relatively low risk since it displays raw user input, not generated summaries. However, the impact level display ("Impact: 3/5") could be misinterpreted as a clinical score.

**Fix:** Add a subtle footnote to the Dashboard recent activity section clarifying the data is user-reported, not clinically assessed.

---

## Implementation Plan

### 1. Add disclaimer to all export payloads
Add a `disclaimer` object to each JSON export with bilingual text:

```text
// Added to each export JSON:
{
  "disclaimer": {
    "en": "Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment.",
    "hu": "Nem diagnosztikai adat: A jelentes felhasznalo altal rogzitett megfigyeleseket tartalmaz, szabvanyos orvosi terminologiara lekepezve. Nem minosul klinikai ertekelesesnek."
  },
  // ... existing export data
}
```

**Files:** `src/pages/Export.tsx`, `supabase/functions/analyst-export/index.ts`

### 2. Add disclaimer to PatternSummary component
Add a muted-text footnote below the AI-generated markdown content.

**File:** `src/components/journal/PatternSummary.tsx`

### 3. Add disclaimer to journal reflection display
Add a similar footnote when AI reflection text is shown in journal entry cards.

**File:** `src/components/journal/JournalEntryCard.tsx`

### 4. Add footnote to Dashboard activity section
Add a subtle `text-xs text-muted-foreground` note: "User-reported observations. Not a clinical assessment."

**File:** `src/pages/Dashboard.tsx`

### 5. Add i18n keys for disclaimer text
Add the disclaimer strings to both `src/i18n/en.ts` and `src/i18n/hu.ts` so all UI disclaimers are properly localized.

---

## Scope

- **6 files modified** (Export.tsx, analyst-export/index.ts, PatternSummary.tsx, JournalEntryCard.tsx, Dashboard.tsx, i18n files)
- **No database changes** required
- **No new dependencies**
- Edge function redeployment required for analyst-export

