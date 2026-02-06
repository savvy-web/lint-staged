---
"@savvy-web/lint-staged": minor
---

### Managed markdownlint-cli2 config via CLI

The `savvy-lint init` command now manages a `.markdownlint-cli2.jsonc` config
file for consumers, using the same preset-aware logic as husky hooks:

- **File missing** (standard or silk): writes the full template
- **File exists + silk preset**: surgically updates `$schema` via jsonc-parser;
  compares `config` rules with `node:util` `isDeepStrictEqual` and warns on
  mismatch (only overwrites with `--force`)
- **File exists + standard preset**: skips (not managed)
- **minimal preset**: skips entirely (no markdown tooling)

The `savvy-lint check` command now validates the markdownlint config against the
template, reporting `$schema` and `config` mismatches in both quiet and full
output modes.

### Shareable Biome config export

A new package export `@savvy-web/lint-staged/biome/silk.jsonc` provides a
standard Biome configuration that consumers can extend:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "extends": ["@savvy-web/lint-staged/biome/silk.jsonc"]
}
```

This is optional — any Biome config works with the handlers.

### Build-time template codegen

A new `pnpm generate:templates` script reads `lib/configs/.markdownlint-cli2.jsonc`
at build time and generates `src/cli/templates/markdownlint.gen.ts`, keeping a
single source of truth. The generated file is committed and formatted by Biome.

The turbo pipeline now includes a `generate:templates` task with the dependency
chain: `generate:templates` → `types:check` → `build:dev` / `build:prod`.

### Handler bug fixes

- **PackageJson**: removed erroneous `git add` chaining — lint-staged
  auto-stages modified files
- **PnpmWorkspace**: removed manual `git add` return — lint-staged auto-stages
- **Yaml**: removed manual `git add` return — lint-staged auto-stages

### Husky hook improvements

- **post-checkout / post-merge**: now use savvy-lint managed sections with
  `BEGIN`/`END` markers, matching the pre-commit hook pattern
- **pre-push**: removed — the 175-line zsh-specific turbo query hook was
  fragile and not portable across shells

### New dependency

- `jsonc-parser` (^3.3.1) — runtime JSONC parsing and surgical edits for
  markdownlint config management in the CLI
