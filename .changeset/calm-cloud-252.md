---
"@savvy-web/lint-staged": minor
---

Initial release of @savvy-web/lint-staged - composable, configurable lint-staged handlers.

Features:
- Handler classes for common file types: Biome, Markdown, YAML, TypeScript, PackageJson, PnpmWorkspace, ShellScripts, DesignDocs
- Static class-based API with `glob`, `handler`, and `create(options)` for TSDoc discoverability
- Auto-discovery of config files via cosmiconfig (searches `lib/configs/` first, then standard locations)
- Auto-detection of package manager from `package.json` `packageManager` field
- Tool availability checking with graceful fallback (global → package manager exec)
- Presets for quick setup: `minimal()`, `standard()`, `full()`
- Utility classes: `Command`, `Filter`, `ConfigSearch`, `EntryExtractor`, `ImportGraph`, `TsDocResolver`
- Optional peer dependencies for Biome and markdownlint-cli2

Programmatic file handling:
- PackageJson: Uses `sort-package-json` library for in-place sorting
- Yaml/PnpmWorkspace: Uses `yaml` library for formatting and validation
- TypeScript: Intelligent TSDoc linting with workspace detection and import graph analysis
- TSDoc: Bundled ESLint with `eslint-plugin-tsdoc` for zero-config TSDoc validation
