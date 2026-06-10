---
"@savvy-web/lint-staged": minor
---

## Breaking Changes

### Package Deprecation

The composable lint-staged handlers (Biome, Markdown, YAML, TypeScript) have moved into the Silk Suite monorepo and now ship via `@savvy-web/silk`, driven by the unified `savvy` CLI.

#### Migration
- Replace `@savvy-web/lint-staged` with `@savvy-web/silk/lint`.
- Point your lint-staged config at the `@savvy-web/silk` handlers.
- Replace the `savvy-lint` bin with `savvy lint`.

This is the final release. No further fixes or security patches will be published.