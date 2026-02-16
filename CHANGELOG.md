# @savvy-web/lint-staged

## 0.4.2

### Dependencies

* [`50bbd75`](https://github.com/savvy-web/lint-staged/commit/50bbd758ea98f2dc701d4c062c43be2e5cc18990) @savvy-web/commitlint: ^0.3.2 → ^0.3.3
* @savvy-web/rslib-builder: ^0.14.1 → ^0.14.2

## 0.4.1

### Patch Changes

* 769379f: ## Features
  * Support for @savvy-web/changesets
* 75ff905: ## Dependencies
  * @savvy-web/commitlint: ^0.3.1 → ^0.3.2
  * @savvy-web/rslib-builder: ^0.12.1 → ^0.12.2
* 29b48cc: Update dependencies:

  **Dependencies:**

  * @savvy-web/rslib-builder: ^0.12.2 → ^0.14.1

## 0.4.0

### Minor Changes

* 0040923: Fix lint-staged handler execution order for reliable auto-staging.

  In-place file modifications (sorting package.json, formatting YAML/pnpm-workspace)
  were not being staged by lint-staged v16 because it only auto-stages changes made
  by commands it executes, not by handler function bodies.

  **New `savvy-lint fmt` CLI subcommand** with three formatters:

  * `fmt package-json` — sorts package.json fields with sort-package-json
  * `fmt pnpm-workspace` — sorts and formats pnpm-workspace.yaml
  * `fmt yaml` — formats YAML files with Prettier

  **New `fmtCommand()` static methods** on PackageJson, PnpmWorkspace, and Yaml
  handlers that return CLI command strings instead of modifying files in function
  bodies, enabling lint-staged to detect and auto-stage the changes.

  **Restructured `createConfig()`** to use lint-staged array syntax for sequential
  execution — sort/format via CLI command first, then lint/validate as a second step.

  **New `Command.findSavvyLint()` utility** that locates the `savvy-lint` binary via
  standard tool search with a fallback to the dev build for dogfooding scenarios.

  **New types:** `LintStagedEntry` for array syntax support, `skipFormat` option on
  `PackageJsonOptions`.

### Patch Changes

* c5b26f5: Update dependencies:

  **Dependencies:**

  * @savvy-web/rslib-builder: ^0.12.0 → ^0.12.1

## 0.3.2

### Patch Changes

* 2e73a54: Update dependencies:

  **Dependencies:**

  * @savvy-web/commitlint: ^0.2.1 → ^0.3.1

## 0.3.1

### Patch Changes

* 703b57d: Fix markdownlint config output path and simplify generated lint-staged config.

  The init command was writing the markdownlint-cli2 config to the repository
  root instead of lib/configs/. It now correctly writes to
  lib/configs/.markdownlint-cli2.jsonc and ensures the directory exists.

  The generated lint-staged config no longer includes an unnecessary type import
  or satisfies annotation.

## 0.3.0

### Minor Changes

* b114abb: ### Managed markdownlint-cli2 config via CLI

  The `savvy-lint init` command now manages a `.markdownlint-cli2.jsonc` config
  file for consumers, using the same preset-aware logic as husky hooks:

  * **File missing** (standard or silk): writes the full template
  * **File exists + silk preset**: surgically updates `$schema` via jsonc-parser;
    compares `config` rules with `node:util` `isDeepStrictEqual` and warns on
    mismatch (only overwrites with `--force`)
  * **File exists + standard preset**: skips (not managed)
  * **minimal preset**: skips entirely (no markdown tooling)

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

  * **PackageJson**: removed erroneous `git add` chaining — lint-staged
    auto-stages modified files
  * **PnpmWorkspace**: removed manual `git add` return — lint-staged auto-stages
  * **Yaml**: removed manual `git add` return — lint-staged auto-stages

  ### Husky hook improvements

  * **post-checkout / post-merge**: now use savvy-lint managed sections with
    `BEGIN`/`END` markers, matching the pre-commit hook pattern
  * **pre-push**: removed — the 175-line zsh-specific turbo query hook was
    fragile and not portable across shells

  ### New dependency

  * `jsonc-parser` (^3.3.1) — runtime JSONC parsing and surgical edits for
    markdownlint config management in the CLI

## 0.2.2

### Patch Changes

* 7f5669e: Fix runtime issues with PackageJson handler, shell escaping, and CLI configuration
  * Fix PackageJson and Biome handler race condition by sorting in-process with bundled sort-package-json library instead of shelling out, and excluding `package.json` from Biome's default patterns
  * Add `Filter.shellEscape()` to properly quote file paths with spaces or special characters in all handlers
  * Rename `Preset.full()` to `Preset.silk()` for branding consistency
  * CLI init now generates `.ts` config files and uses `--preset silk` as default
  * Fix bin key in package.json (use command name `savvy-lint`, not path `./savvy-lint`) and correct repository URL for npm publish
  * Remove unnecessary `satisfies Configuration` type assertion from init config template

## 0.2.1

### Patch Changes

* 61df0a6: Fix PackageJson handler race condition and rename Preset.full to Preset.silk
  * Reverted to using bundled sort-package-json library programmatically (CLI approach failed for consumers)
  * Added `package.json` to Biome handler's default excludes to prevent parallel processing race condition
  * PackageJson handler now exclusively handles package.json files (sort + biome + git add)
  * Renamed `Preset.full()` to `Preset.silk()` for branding consistency
  * CLI init command now uses `--preset silk` as default (replacing `--preset full`)
  * Added `Filter.shellEscape()` to properly escape file paths with spaces or special characters
  * All handlers now use shell-escaped paths to prevent command injection issues

## 0.2.0

### Minor Changes

* d923c65: Add `savvy-lint` CLI with `init` and `check` commands for bootstrapping and validating lint-staged configuration.

  **New features:**

  * `savvy-lint init` - Creates `.husky/pre-commit` hook and `lib/configs/lint-staged.config.js` with preset selection
  * `savvy-lint check` - Validates configuration status and tool availability
  * Managed section markers in husky hooks to preserve custom code during updates
  * `--quiet` flag for postinstall usage

  **Breaking changes:**

  * Removed `DesignDocs` handler (moved to separate Claude Code plugin)
  * Removed `DesignDocsOptions` type
  * Removed `designDocs` option from `CreateConfigOptions` and presets

### Patch Changes

* d923c65: Switch to @savvy-web/pnpm-plugin-silk for centralized dependency management

## 0.1.3

### Patch Changes

* 467c3c8: Sets peer dependencies to non-optional

## 0.1.2

### Patch Changes

* 4c03d03: Fix ConfigSearch failing to find config files and Biome config flag

  ConfigSearch fixes:

  * Add custom loaders for `.jsonc`, `.yaml`, and `.yml` extensions that cosmiconfig doesn't handle by default
  * Search `lib/configs/` directory first using direct file existence checks before falling back to cosmiconfig
  * Simplify `exists()` method to use `existsSync()` directly

  Biome fixes:

  * Change `--config=` to `--config-path=` to match Biome CLI expectations

## 0.1.1

### Patch Changes

* 693d648: Fix PnpmWorkspace handler to gracefully handle missing pnpm-workspace.yaml file instead of throwing an error.

## 0.1.0

### Minor Changes

* 16b0317: Initial release of `@savvy-web/lint-staged` - composable, configurable handlers for lint-staged pre-commit hooks.

  ## What This Package Does

  This package provides reusable handler classes for [lint-staged](https://github.com/lint-staged/lint-staged) that eliminate boilerplate configuration. Instead of writing custom functions for each file type, import pre-built handlers that auto-discover tools and config files.

  **Before:**

  ```javascript
  export default {
    "**/package.json": (files) => {
      const filtered = files.filter((f) => !f.includes("dist/"));
      return [
        `sort-package-json ${filtered.join(" ")}`,
        `biome check --write ${filtered.join(" ")}`,
      ];
    },
    "*.{js,ts,json}": "biome check --write",
    "**/*.md": "markdownlint-cli2 --fix",
  };
  ```

  **After:**

  ```typescript
  import { Preset } from "@savvy-web/lint-staged";

  export default Preset.standard();
  ```

  ## Handler Classes

  Each handler follows a consistent static class-based API:

  * `Handler.glob` - The glob pattern for matching files
  * `Handler.handler` - Pre-configured handler with sensible defaults
  * `Handler.create(options)` - Factory for customized handlers
  * `Handler.defaultExcludes` - Default patterns excluded from processing

  ### Available Handlers

  | Handler           | Files                          | Description                              |
  | ----------------- | ------------------------------ | ---------------------------------------- |
  | **Biome**         | `*.{js,ts,jsx,tsx,json,jsonc}` | Format and lint with Biome               |
  | **Markdown**      | `**/*.{md,mdx}`                | Lint and auto-fix with markdownlint-cli2 |
  | **Yaml**          | `**/*.{yml,yaml}`              | Format and validate YAML files           |
  | **PackageJson**   | `**/package.json`              | Sort fields and format with Biome        |
  | **PnpmWorkspace** | `pnpm-workspace.yaml`          | Sort packages and format                 |
  | **ShellScripts**  | `**/*.sh`                      | Manage executable permissions            |
  | **TypeScript**    | `*.{ts,tsx}`                   | TSDoc validation and type checking       |
  | **DesignDocs**    | `.claude/design/**/*.md`       | Validate design doc structure            |

  ## Presets

  Three presets for quick setup:

  * **`Preset.minimal()`** - PackageJson + Biome (formatting only)
  * **`Preset.standard()`** - Adds Markdown, Yaml, PnpmWorkspace, ShellScripts
  * **`Preset.full()`** - Adds TypeScript and DesignDocs handlers

  All presets accept options to customize or override handlers:

  ```typescript
  export default Preset.standard({
    biome: { exclude: ["vendor/"] },
    typescript: { skipTypecheck: true }, // Enable TypeScript in standard
    shellScripts: false, // Disable ShellScripts
  });
  ```

  ## Key Features

  ### Auto-Discovery

  * **Config files**: Searches `lib/configs/` first, then standard locations
  * **Package manager**: Detects from `packageManager` field or lockfiles
  * **Tools**: Checks global availability, falls back to package manager exec

  ### Programmatic Processing

  Several handlers process files in-place without spawning external commands:

  * **PackageJson**: Uses bundled `sort-package-json` for sorting
  * **Yaml/PnpmWorkspace**: Uses bundled `yaml` library for formatting/validation
  * **TypeScript TSDoc**: Uses bundled ESLint with `eslint-plugin-tsdoc`

  ### Intelligent TSDoc Linting

  The TypeScript handler includes workspace-aware TSDoc validation:

  1. Detects monorepo workspaces via `workspace-tools`
  2. Finds `tsdoc.json` at workspace or repo level
  3. Extracts entry points from `package.json` exports
  4. Traces imports to find all public API files
  5. Lints only files that are part of the public API

  ## Utility Classes

  For building custom handlers:

  * **`Command`** - Tool availability checking and package manager detection
  * **`Filter`** - Include/exclude file filtering with pattern matching
  * **`ConfigSearch`** - Config file discovery via cosmiconfig
  * **`EntryExtractor`** - Extract TypeScript entries from package.json exports
  * **`ImportGraph`** - Trace imports from entry points
  * **`TsDocResolver`** - Resolve files needing TSDoc linting
  * **`TsDocLinter`** - Programmatic TSDoc linting with ESLint

  ## Installation

  ```bash
  # Install the package and required peer dependency
  npm install -D @savvy-web/lint-staged lint-staged

  # For Biome handler (recommended)
  npm install -D @biomejs/biome

  # For Markdown handler (optional)
  npm install -D markdownlint-cli2
  ```

  ## Documentation

  * [Handler Configuration](./docs/handlers.md)
  * [Configuration API](./docs/configuration.md)
  * [Utilities](./docs/utilities.md)
  * [Migration Guide](./docs/migration.md)
