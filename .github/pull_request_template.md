## UI Quality Checklist (Required for UI-affecting PRs)

- [ ] Uses semantic tokens only (no raw Tailwind color classes or raw CSS colors).
- [ ] Uses `surface-card` pattern where card surfaces are introduced or changed.
- [ ] Contrast checked for changed UI states (normal, hover, focus, disabled).
- [ ] HU/EN parity done for all user-facing text keys.
- [ ] Self/Observer stance behavior verified on affected screens.

## Design/Codex Sync (Required)

- [ ] Pattern changes are updated in code and codex artifacts in the same PR.
- [ ] If implementation and codex disagree, codex update is included before merge.
- [ ] Codex-related file changes have explicit approval from designated reviewer.

## Scope Discipline

- [ ] High-impact inconsistencies fixed first (contrast, card hierarchy, status-state clarity, sidebar noise).
- [ ] No broad redesign outside ticket scope.
