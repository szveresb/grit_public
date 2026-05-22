# Design Quality Governance (Beta)

## Enforceable CI Rules
- ESLint blocks raw Tailwind color utility usage in TS/TSX literals and template strings.
- Stylelint blocks raw CSS colors (`#hex`, `rgb`, `rgba`) in stylesheet code.
- `scripts/design-codex-guard.mjs` enforces:
  - no new usage of legacy classes (`reference-surface`, `context-panel`, `subject-card-self`) on PR diffs
  - no new raw color utility tokens on PR diffs
  - HU/EN translation key parity globally

## Ownership
- Design-system owner: `@szveresb`
- UI pattern changes require design-system owner review via `CODEOWNERS`.
- Codex-related guardrail/policy changes require explicit owner review via `CODEOWNERS`.

## Drift Cleanup Sprint (One-Time)
- Prioritize and fix in this order:
  1. Contrast violations
  2. Card hierarchy inconsistencies
  3. Status-state clarity gaps
  4. Sidebar noise
- No broad redesign. Fix high-impact inconsistencies only.

## Monthly Drift Audit
- Automated monthly workflow runs design drift scan and opens a ticket on violations.
- Manual quick review must cover top flows:
  - Naplo
  - Kerdivek
  - Dashboard
- Violations are closed in small batches.

## Codex + Code Sync Rule
- Pattern changes must update implementation and codex artifacts in the same PR.
- If temporary divergence occurs, implementation may ship only with immediate codex follow-up in that PR.
