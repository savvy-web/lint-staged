---
"@savvy-web/lint-staged": major
---

## Breaking Changes

- `Biome.findConfig()` no longer searches `lib/configs/` for a bundled fallback config. It now searches the workspace root only (falling back to CWD when outside a workspace). Projects that relied on the bundled `lib/configs/biome.jsonc` being auto-discovered must place a `biome.jsonc` or `biome.json` at their workspace root.
- `Markdown.findConfig()` and `Yaml.findConfig()` are now anchored to the workspace root instead of CWD. Config files must be reachable from the workspace root.
- `PackageJson` handler now uses a whitelist strategy: only `package.json` files located at the workspace root or a direct leaf workspace package root are processed. Previously, all staged `package.json` files were processed unless explicitly excluded. Files in deeply nested directories (fixtures, generated output, node_modules shadows) are now silently skipped without needing explicit exclusion patterns.
- `TypeScriptOptions` no longer accepts `excludeTsdoc`, `skipTsdoc`, or `rootDir` properties. TSDoc linting has moved to `rslib-builder`. Passing these options has no effect and TypeScript will report unknown property errors under strict mode.
- The `TypeScript` handler no longer runs TSDoc linting. It performs pure type-checking only.
- The following utilities have been removed from the public API: `TsDocLinter`, `TsDocResolver`, `EntryExtractor`, `ImportGraph`. Import these from `@savvy-web/rslib-builder` if you depend on them.
- The CLI layer has been upgraded from individual `WorkspaceRootLive` / `PackageManagerDetectorLive` layers to the `WorkspacesLive` composite layer from `workspaces-effect`. Custom CLI compositions that depended on the previous layer shape must be updated.

### Migration Guide

**Biome config placement**

Move your `biome.jsonc` (or `biome.json`) to the workspace root if it is not already there:

```bash
# Before (bundled fallback was auto-discovered inside the package)
# No biome config needed in your repo

# After (workspace root config required)
# Place biome.jsonc at your repo root, e.g. /my-repo/biome.jsonc
```

**TypeScript handler — removed options**

Remove `excludeTsdoc`, `skipTsdoc`, and `rootDir` from any `TypeScriptOptions` you pass:

```typescript
// Before
TypeScript.create({ rootDir: 'src', skipTsdoc: false, excludeTsdoc: ['vendor/'] })

// After
TypeScript.create({ exclude: ['vendor/'] })
```

**Removed utility imports**

```typescript
// Before
import { TsDocLinter, EntryExtractor } from '@savvy-web/lint-staged';

// After — these now live in rslib-builder
import { TsDocLinter, EntryExtractor } from '@savvy-web/rslib-builder';
```

## Features

- New `Workspace` utility module exported from the package root. Provides synchronous, cached access to workspace layout via `workspaces-effect`:
  - `getWorkspaceRoot()` — returns the absolute path to the workspace root, or `null` for single-package repos.
  - `getWorkspacePackages()` — returns all leaf workspace packages (excludes the root).
  - `getWorkspacePackagePaths()` — returns the absolute directory paths of all leaf packages.
  - `isWorkspacePackagePath(filePath)` — returns `true` if the file's parent directory is the workspace root or a leaf package root. Returns `true` as a permissive fallback outside a workspace.
  - `resetWorkspaceCache()` — clears the module-level cache; useful in test teardown.
- New `Biome.findAllConfigs()` static method discovers `biome.jsonc` / `biome.json` files across the workspace root and every leaf workspace root. The CLI `check` command uses this to validate `$schema` URLs in all workspace-level biome configs.
- The CLI `check` command now validates biome configs across the entire workspace rather than CWD only.

## Dependencies

| Dependency | Type | Action | From | To |
| :--- | :--- | :--- | :--- | :--- |
| eslint | dependency | removed | — | — |
| @typescript-eslint/parser | dependency | removed | — | — |
| eslint-plugin-tsdoc | dependency | removed | — | — |
| @savvy-web/rslib-builder | devDependency | updated | ^0.20.0 | ^0.20.1 |
