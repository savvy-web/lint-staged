---
"@savvy-web/lint-staged": patch
---

## Bug Fixes

- Fixed `savvy-lint init` writing Biome schema URLs containing the literal string `"catalog:silk"` instead of the resolved version number. The `@biomejs/biome` peer dependency is now pinned to `2.4.9` directly rather than via a pnpm catalog reference, so the version is available at publish time when schema URLs are generated (fixes #98).
