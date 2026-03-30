---
"@savvy-web/lint-staged": minor
---

## Features

### Claude Code companion plugin

A new Claude Code plugin is included in the repository that automatically injects code quality context at session start. It detects the project's package manager and informs the agent about Biome formatting/linting rules, markdownlint configuration, and TypeScript conventions so Claude Code follows the project's code style without manual prompting.

```bash
# Add the Savvy Web plugin marketplace (one-time setup)
/plugin marketplace add savvy-web/systems

# Install the lint-staged plugin for this project
/plugin install lint-staged@savvy-web-systems --scope project
```

### CLI uses `ToolDiscovery` and `ConfigDiscovery` from silk-effects

The `savvy-lint check` command now uses Effect-based `ToolDiscovery` and `ConfigDiscovery` services from `@savvy-web/silk-effects` for tool availability and config file discovery, replacing synchronous handler static methods.

## Breaking Changes

### Removed `ConfigSearch` utility

The `ConfigSearch` class and its associated types (`ConfigSearchOptions`, `ConfigSearchResult`) have been removed from the public API. Use `ConfigDiscovery` from `@savvy-web/silk-effects` instead -- it is now re-exported directly from this package.

### Removed managed section exports

The following named exports have been removed:

| Removed export | Replacement |
| --- | --- |
| `BEGIN_MARKER` | `ManagedSection` from `@savvy-web/silk-effects` |
| `END_MARKER` | `ManagedSection` from `@savvy-web/silk-effects` |
| `extractManagedSection` | `ManagedSection.read()` |
| `generateManagedContent` | internal -- no public replacement needed |
| `generateShellScriptsManagedContent` | internal -- no public replacement needed |

## Refactoring

### Adopted `@savvy-web/silk-effects` for shared logic

Internal implementations replaced with centralized `@savvy-web/silk-effects` modules:

* **ManagedSection** -- managed section reads/writes in husky hook files
* **BiomeSchemaSync** -- biome config `$schema` URL synchronization
* **ConfigDiscovery** -- config file discovery with `lib/configs/` priority
* **ToolDiscovery** -- CLI tool availability detection
* Shared section definitions extracted to `src/cli/sections.ts`

### Removed `workspace-tools` dependency

Replaced `findProjectRoot` and `getWorkspaceInfos` with lightweight built-in implementations. Workspace detection now reads `pnpm-workspace.yaml` directly. `isTsdocAvailable` walks up from cwd to find `tsdoc.json`.

### Sidecar monorepo restructure

Repository restructured into a pnpm workspace with the package source in `package/` and the Claude Code plugin in `plugin/`.

## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| `@savvy-web/silk-effects` | dependency | updated | 0.1.0 | ^0.2.2 |
| `workspaces-effect` | dependency | added | — | ^0.3.0 |
| `workspace-tools` | dependency | removed | 0.41.0 | — |
| `cosmiconfig` | dependency | removed | 9.0.1 | — |
