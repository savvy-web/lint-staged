---
"@savvy-web/lint-staged": minor
---

Initial release of `@savvy-web/lint-staged` - composable, configurable handlers for lint-staged pre-commit hooks.

## What This Package Does

This package provides reusable handler classes for [lint-staged](https://github.com/lint-staged/lint-staged) that eliminate boilerplate configuration. Instead of writing custom functions for each file type, import pre-built handlers that auto-discover tools and config files.

**Before:**
```javascript
export default {
  '**/package.json': (files) => {
    const filtered = files.filter(f => !f.includes('dist/'));
    return [`sort-package-json ${filtered.join(' ')}`, `biome check --write ${filtered.join(' ')}`];
  },
  '*.{js,ts,json}': 'biome check --write',
  '**/*.md': 'markdownlint-cli2 --fix',
};
```

**After:**
```typescript
import { Preset } from '@savvy-web/lint-staged';

export default Preset.standard();
```

## Handler Classes

Each handler follows a consistent static class-based API:

- `Handler.glob` - The glob pattern for matching files
- `Handler.handler` - Pre-configured handler with sensible defaults
- `Handler.create(options)` - Factory for customized handlers
- `Handler.defaultExcludes` - Default patterns excluded from processing

### Available Handlers

| Handler | Files | Description |
|---------|-------|-------------|
| **Biome** | `*.{js,ts,jsx,tsx,json,jsonc}` | Format and lint with Biome |
| **Markdown** | `**/*.{md,mdx}` | Lint and auto-fix with markdownlint-cli2 |
| **Yaml** | `**/*.{yml,yaml}` | Format and validate YAML files |
| **PackageJson** | `**/package.json` | Sort fields and format with Biome |
| **PnpmWorkspace** | `pnpm-workspace.yaml` | Sort packages and format |
| **ShellScripts** | `**/*.sh` | Manage executable permissions |
| **TypeScript** | `*.{ts,tsx}` | TSDoc validation and type checking |
| **DesignDocs** | `.claude/design/**/*.md` | Validate design doc structure |

## Presets

Three presets for quick setup:

- **`Preset.minimal()`** - PackageJson + Biome (formatting only)
- **`Preset.standard()`** - Adds Markdown, Yaml, PnpmWorkspace, ShellScripts
- **`Preset.full()`** - Adds TypeScript and DesignDocs handlers

All presets accept options to customize or override handlers:

```typescript
export default Preset.standard({
  biome: { exclude: ['vendor/'] },
  typescript: { skipTypecheck: true }, // Enable TypeScript in standard
  shellScripts: false, // Disable ShellScripts
});
```

## Key Features

### Auto-Discovery

- **Config files**: Searches `lib/configs/` first, then standard locations
- **Package manager**: Detects from `packageManager` field or lockfiles
- **Tools**: Checks global availability, falls back to package manager exec

### Programmatic Processing

Several handlers process files in-place without spawning external commands:

- **PackageJson**: Uses bundled `sort-package-json` for sorting
- **Yaml/PnpmWorkspace**: Uses bundled `yaml` library for formatting/validation
- **TypeScript TSDoc**: Uses bundled ESLint with `eslint-plugin-tsdoc`

### Intelligent TSDoc Linting

The TypeScript handler includes workspace-aware TSDoc validation:

1. Detects monorepo workspaces via `workspace-tools`
2. Finds `tsdoc.json` at workspace or repo level
3. Extracts entry points from `package.json` exports
4. Traces imports to find all public API files
5. Lints only files that are part of the public API

## Utility Classes

For building custom handlers:

- **`Command`** - Tool availability checking and package manager detection
- **`Filter`** - Include/exclude file filtering with pattern matching
- **`ConfigSearch`** - Config file discovery via cosmiconfig
- **`EntryExtractor`** - Extract TypeScript entries from package.json exports
- **`ImportGraph`** - Trace imports from entry points
- **`TsDocResolver`** - Resolve files needing TSDoc linting
- **`TsDocLinter`** - Programmatic TSDoc linting with ESLint

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

- [Handler Configuration](./docs/handlers.md)
- [Configuration API](./docs/configuration.md)
- [Utilities](./docs/utilities.md)
- [Migration Guide](./docs/migration.md)
