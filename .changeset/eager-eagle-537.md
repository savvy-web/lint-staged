---
"@savvy-web/lint-staged": minor
---

Fix lint-staged handler execution order for reliable auto-staging.

In-place file modifications (sorting package.json, formatting YAML/pnpm-workspace)
were not being staged by lint-staged v16 because it only auto-stages changes made
by commands it executes, not by handler function bodies.

**New `savvy-lint fmt` CLI subcommand** with three formatters:
- `fmt package-json` — sorts package.json fields with sort-package-json
- `fmt pnpm-workspace` — sorts and formats pnpm-workspace.yaml
- `fmt yaml` — formats YAML files with Prettier

**New `fmtCommand()` static methods** on PackageJson, PnpmWorkspace, and Yaml
handlers that return CLI command strings instead of modifying files in function
bodies, enabling lint-staged to detect and auto-stage the changes.

**Restructured `createConfig()`** to use lint-staged array syntax for sequential
execution — sort/format via CLI command first, then lint/validate as a second step.

**New `Command.findSavvyLint()` utility** that locates the `savvy-lint` binary via
standard tool search with a fallback to the dev build for dogfooding scenarios.

**New types:** `LintStagedEntry` for array syntax support, `skipFormat` option on
`PackageJsonOptions`.
