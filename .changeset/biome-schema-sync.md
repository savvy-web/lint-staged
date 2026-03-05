---
"@savvy-web/lint-staged": minor
---

## Features

Add biome `$schema` URL sync to `savvy-lint init` and `savvy-lint check` commands. When the `@biomejs/biome` peer dependency version changes, the CLI now automatically detects and updates stale schema URLs in `biome.json`/`biome.jsonc` files across the workspace.
