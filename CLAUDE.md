# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Status

This package provides composable lint-staged handlers with a static class-based
API. Seven handler classes are implemented (Biome, Markdown, PackageJson,
PnpmWorkspace, ShellScripts, TypeScript, Yaml) and the package dogfoods itself.
Workspace-aware config discovery anchors handler lookups to the workspace root.

## Commands

### Development

```bash
pnpm run lint              # Check code with Biome
pnpm run lint:fix          # Auto-fix lint issues
pnpm run lint:md           # Check markdown with markdownlint
pnpm run typecheck         # Type-check with tsgo
pnpm run test              # Run all tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:coverage     # Run tests with coverage report
```

### Building

```bash
pnpm run build             # Build all outputs (dev + prod)
pnpm run build:dev         # Build development output only
pnpm run build:prod        # Build production/npm output only
```

### Running a Single Test

```bash
# Run a specific test file
pnpm vitest run package/__test__/index.test.ts

# Run tests matching a pattern
pnpm vitest run -t "Biome"
```

## Architecture

### Package Structure

- **Source**: `package/src/` with handlers, config utilities, and utils
- **Handlers**: `package/src/handlers/` - Biome, Markdown, TypeScript, PackageJson, PnpmWorkspace, ShellScripts, Yaml
- **Config**: `package/src/config/` - Preset and createConfig utilities
- **Utils**: `package/src/utils/` - Filter, Command, Workspace
- **CLI**: `package/src/cli/` - Effect-based CLI with silk-effects and workspaces-effect service layers
- **Tests**: `package/__test__/` - Unit and integration tests (not co-located in src/)
- **Shared Configs**: `lib/configs/` - lint-staged, markdownlint configs

### Key Dependencies

- **`@savvy-web/silk-effects`**: Provides `ManagedSection`, `BiomeSchemaSync`,
  `ConfigDiscovery`, `ConfigDiscoveryLive`, and `ToolDiscoveryLive` as Effect service layers
- **`workspaces-effect`**: Provides `WorkspacesLive` composite layer and
  synchronous APIs (`findWorkspaceRootSync`, `getWorkspacePackagesSync`) for
  workspace-aware discovery
- **`effect` / `@effect/cli` / `@effect/platform`**: Functional runtime for CLI

### Config Discovery

All config discovery is workspace-aware via `package/src/utils/Workspace.ts`:

- **Workspace utility**: Wraps `workspaces-effect` synchronous APIs with
  caching; provides `getWorkspaceRoot()`, `getWorkspacePackagePaths()`,
  `isWorkspacePackagePath()`
- **Biome handler**: Searches workspace root only for `biome.jsonc`/`biome.json`
  (no `lib/configs/` fallback); falls back to CWD outside a workspace
- **Markdown/Yaml handlers**: Search `lib/configs/` then workspace root for
  config files (anchored via `getWorkspaceRoot()`)
- **PackageJson handler**: Filters staged files to workspace root + leaf roots
  using `isWorkspacePackagePath()` whitelist
- **CLI layer**: Composes `WorkspacesLive`, silk-effects services
  (`ManagedSectionLive`, `BiomeSchemaSyncLive`, `ConfigDiscoveryLive`,
  `ToolDiscoveryLive`), and `NodeContext.layer`
- **Public API**: Re-exports `ConfigDiscovery` and `ConfigDiscoveryLive` from
  `@savvy-web/silk-effects` for consumers

### Build Pipeline

Uses Rslib with dual output:

1. `dist/dev/` - Development build with source maps
2. `dist/npm/` - Production build for npm publishing

### Code Quality

- **Biome**: Unified linting and formatting
- **markdownlint-cli2**: Markdown linting
- **Commitlint**: Enforces conventional commits with DCO signoff
- **Husky Hooks**:
  - `pre-commit`: Runs lint-staged (using this package)
  - `commit-msg`: Validates commit message format
  - `pre-push`: Runs tests

### TypeScript Configuration

- Uses `tsgo` (native TypeScript) for type checking
- Strict mode enabled
- ES2022/ES2023 targets
- Import extensions required (`.js` for ESM)

### Testing

- **Framework**: Vitest with v8 coverage
- **Pool**: Uses forks (not threads) for Effect-TS compatibility
- **Location**: `package/__test__/` (not co-located in `src/`)
- **Integration tests**: `package/__test__/integration/` with fixture workspaces

## Conventions

### Imports

- Use `.js` extensions for relative imports (ESM requirement)
- Use `node:` protocol for Node.js built-ins
- Separate type imports: `import type { Foo } from './bar.js'`

### Commits

All commits require:

1. Conventional commit format (feat, fix, chore, etc.)
2. DCO signoff: `Signed-off-by: Name <email>`

### TSDoc

All exported classes, functions, and interfaces require TSDoc with:

- Brief description
- `@remarks` for additional context
- `@param` and `@returns` as appropriate
- `@example` with full TypeScript programs (separate type/value imports)

### Publishing

Package publishes to both GitHub Packages and npm with provenance.

#### Shell Scripts

Shell scripts (`.sh`) are stored without executable permission (644). Lint-staged enforces `chmod -x` on all `*.sh` files. Hook scripts are invoked via `bash "path/to/script.sh"` in `hooks.json` — never rely on the executable bit.

## Design Documentation

For detailed architectural decisions and handler specifications:

- `@./.claude/design/lint-staged/composable-handlers.md`

**When to load:**

- Adding new handler types
- Modifying handler configuration options
- Understanding the composable architecture
- Debugging handler behavior, file filtering, or workspace-aware discovery
