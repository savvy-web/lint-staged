---
"@savvy-web/lint-staged": minor
---

## Features

- `savvy-lint init` now writes `.husky/pre-commit` as two ordered managed
  sections via silk-effects' `ManagedSection.syncMany`: a shared `savvy-base`
  preamble (`ROOT`, `in_ci`, `detect_pm`, `PM`, `pm_exec`) followed by a
  one-line `savvy-lint` tool section
  (`in_ci || pm_exec lint-staged --config "$ROOT/<config>"`). Consumers can add
  custom shell above, below, or between the managed sections.
- Repo hygiene in `.husky/post-checkout` and `.husky/post-merge` moves into a
  co-owned `savvy-hooks` section that is shared with `@savvy-web/commitlint`.
  Either tool's `init` writes identical content, and both are idempotent across
  repeated runs.
- The package-manager runner standardizes on local `exec` semantics for every
  package manager (`pnpm exec` / `yarn exec` / `bun x` / `npx --no --`),
  replacing the previous `bunx` form so the helper works regardless of how
  `bun` was installed.

## Refactoring

- `savvy-lint init` now removes the legacy `SAVVY-LINT` hygiene block from
  `.husky/post-checkout` and `.husky/post-merge` before writing the new
  `savvy-hooks` section, so a single re-run reconciles a repo bootstrapped
  with an earlier version. The `pre-commit` `SAVVY-LINT` marker is unchanged;
  its body is rewritten in place from the old multi-line `case "$PM" in` block
  to the new one-liner.
- `--force` now resets only the `pre-commit` hook and the lint-staged config
  file. The hygiene hooks always reconcile through `sync` because they are
  co-owned with other Silk Suite tools and must not be force-overwritten.
- `savvy-lint check` validates the `savvy-base` and `savvy-lint` sections in
  `.husky/pre-commit` and the co-owned `savvy-hooks` section in each hygiene
  hook independently. Section health degrades the final verdict so a stale
  or missing section is no longer hidden by a present file.
