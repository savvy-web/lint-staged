# Contributing

Thank you for your interest in contributing to `@savvy-web/lint-staged`! This
document provides guidelines and instructions for development.

## Prerequisites

- Node.js 24+
- pnpm 10.28+

## Development Setup

```bash
# Clone the repository
git clone https://github.com/savvy-web/lint-staged.git
cd lint-staged

# Install dependencies
pnpm install

# Build the package
pnpm run build

# Run tests
pnpm run test
```

## Project Structure

```text
lint-staged/
├── src/                            # Source code
│   ├── handlers/                   # Handler classes (Biome, Markdown, etc.)
│   ├── config/                     # Configuration utilities (Preset, createConfig)
│   ├── cli/                        # CLI commands (init, check)
│   ├── public/                     # Shareable configs (e.g. biome/silk.jsonc)
│   └── utils/                      # Utility classes (Filter, Command, etc.)
├── docs/                           # Documentation
├── lib/
│   └── configs/                    # Shared configuration files
└── dist/                           # Build output
    ├── dev/                        # Development build
    └── npm/                        # Production build for npm
```

## Available Scripts

| Script | Description |
| --- | --- |
| `pnpm run build` | Build all outputs (dev + prod) |
| `pnpm run build:dev` | Build development output only |
| `pnpm run build:prod` | Build production output only |
| `pnpm run test` | Run all tests with coverage |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run lint` | Check code with Biome |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run lint:md` | Check markdown with markdownlint |
| `pnpm run typecheck` | Type-check with tsgo |

To run a specific test file:

```bash
pnpm vitest run src/index.test.ts
```

## Code Quality

This project uses:

- **Biome** for linting and formatting
- **Commitlint** for enforcing conventional commits
- **Husky** for Git hooks
- **markdownlint-cli2** for markdown linting
- **tsgo** (native TypeScript) for type checking

### Commit Format

All commits must follow the [Conventional Commits](https://conventionalcommits.org)
specification and include a DCO signoff:

```text
feat: add new feature

Signed-off-by: Your Name <your.email@example.com>
```

### Pre-commit Hooks

The following checks run automatically:

- **pre-commit**: Runs lint-staged (using this package!)
- **commit-msg**: Validates commit message format
- **post-checkout / post-merge**: Ensures shell script permissions

## Testing

Tests use [Vitest](https://vitest.dev) with v8 coverage.

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run a specific test file
pnpm vitest run src/index.test.ts

# Run tests matching a pattern
pnpm vitest run -t "Biome"
```

## TypeScript

- Uses `tsgo` (native TypeScript) for type checking
- Strict mode enabled
- ES2022/ES2023 targets
- Import extensions required (`.js` for ESM)

### Import Conventions

```typescript
// Use .js extensions for relative imports (ESM requirement)
import { myFunction } from "./utils/helpers.js";

// Use node: protocol for Node.js built-ins
import { readFileSync } from "node:fs";

// Separate type imports from value imports
import type { LintStagedHandler } from "./types.js";
import { Filter } from "./utils/Filter.js";
```

### TSDoc Requirements

All exported classes, functions, and interfaces must have TSDoc documentation:

```typescript
/**
 * Brief description of the function.
 *
 * @remarks
 * Additional details for users who need more context.
 *
 * @param name - Description of the parameter
 * @returns Description of the return value
 *
 * @example
 * ```typescript
 * import { myFunction } from '@savvy-web/lint-staged';
 *
 * const result = myFunction('example');
 * ```
 */
export function myFunction(name: string): string {
  // ...
}
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `pnpm run test`
5. Run linting: `pnpm run lint:fix`
6. Commit with conventional format and DCO signoff
7. Push and open a pull request

## Adding a New Handler

To add a new handler:

1. Create `src/handlers/MyHandler.ts` following the existing pattern
2. Export from `src/handlers/index.ts`
3. Add to public exports in `src/index.ts`
4. Add options interface to `src/types.ts`
5. Update `src/config/createConfig.ts` to include the handler
6. Add tests in `src/handlers/MyHandler.test.ts`
7. Document in `docs/handlers.md`

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
