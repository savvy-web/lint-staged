# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Status

This package provides composable lint-staged handlers with a static class-based
API. All eight handler classes are implemented and the package dogfoods itself.

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
pnpm vitest run src/index.test.ts

# Run tests matching a pattern
pnpm vitest run -t "Biome"
```

## Architecture

### Package Structure

- **Source**: `src/` with handlers, config utilities, and utils
- **Handlers**: `src/handlers/` - Biome, Markdown, TypeScript, etc.
- **Config**: `src/config/` - Preset and createConfig utilities
- **Utils**: `src/utils/` - Filter, Command, TsDocLinter, etc.
- **Shared Configs**: `lib/configs/` - lint-staged, markdownlint configs

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

## Design Documentation

For detailed architectural decisions and handler specifications:

- `@./.claude/design/lint-staged/composable-handlers.md`

**When to load:**

- Adding new handler types
- Modifying handler configuration options
- Understanding the composable architecture
- Debugging handler behavior or file filtering
