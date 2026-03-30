#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: inform the agent about available code quality tools
# and conventions enforced by @savvy-web/lint-staged.

# Get repo root directory
ROOT=$(git rev-parse --show-toplevel)

# Detect package manager from package.json or lockfiles
detect_pm() {
  # Check packageManager field in package.json (e.g., "pnpm@9.0.0")
  if [ -f "$ROOT/package.json" ]; then
    pm=$(jq -r '.packageManager // empty' "$ROOT/package.json" 2>/dev/null | cut -d'@' -f1)
    if [ -n "$pm" ]; then
      echo "$pm"
      return
    fi
  fi

  # Fallback to lockfile detection
  if [ -f "$ROOT/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$ROOT/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$ROOT/bun.lock" ]; then
    echo "bun"
  else
    echo "npm"
  fi
}

PM=$(detect_pm)

case "$PM" in
  pnpm) RUN="pnpm exec" ;;
  yarn) RUN="yarn exec" ;;
  bun)  RUN="bunx" ;;
  *)    RUN="npx --no --" ;;
esac

# Static content (quoted heredoc preserves backticks)
cat <<'STATIC'
## Code Quality Context

This project uses **automated code quality tools** via @savvy-web/lint-staged. These tools run automatically on pre-commit via Husky hooks. Follow these conventions to avoid lint failures.

### Formatting (Biome)

Biome handles formatting and linting for TypeScript, JavaScript, JSON, and CSS.

**Formatting rules:**
- **Indent with tabs**, width 2
- **Line width: 120** characters
- Format-with-errors enabled (formats even if there are syntax issues)

**Linting rules (key enforcements):**
- `useImportExtensions`: All relative imports MUST use `.js` extensions (ESM requirement)
- `useImportType`: Separate type imports required (`import type { Foo }` not `import { type Foo }`)
- `useNodejsImportProtocol`: Node.js built-ins must use `node:` protocol (`node:fs`, `node:path`)
- `useConsistentTypeDefinitions`: Use consistent type definitions (interfaces)
- `noUnusedVariables`: Error (rest siblings ignored)
- `noImportCycles`: Error — no circular imports
- `organizeImports`: Imports auto-sorted lexicographically

**Overrides:**
- `package.json`: JSON auto-expanded
- `turbo.json`, `tsconfig*.json`: Keys auto-sorted
- Test files (`*.test.ts`): `noUndeclaredDependencies` is off

**Ignored paths:** `dist`, `.turbo`, `.git`, `.rslib`, `.vitest`, `.coverage`, `coverage`, `__test__/**/fixtures`, `__test__/**/snapshots`, `__fixtures__`

### Markdown (markdownlint-cli2)

All markdown files are linted with markdownlint-cli2.

**Key rules:**
- No line length limit (MD013 disabled)
- Duplicate headings allowed only among siblings (MD024)
- HTML elements restricted to: `<br>`, `<details>`, `<summary>`, `<img>`, `<sup>`, `<sub>`
- Code fences must have a language identifier (MD040)
- Tables must use compact style (MD060) — single space around cell content:

| Character | Meaning |
| --- | --- |
| Y | Yes |
| N | No |

- Files must end with a single newline (MD047)
- All other default markdownlint rules are enabled

**Ignored paths:** `node_modules`, `dist`, `CHANGELOG.md`, `.claude/plans`, `docs/superpowers`

### TypeScript

Standard strict TypeScript configuration:
- **Target:** ES2023, **Module:** NodeNext
- **Strict mode** enabled with `strictNullChecks`
- `exactOptionalPropertyTypes`: enabled — optional properties cannot be explicitly set to `undefined`
- `verbatimModuleSyntax`: enabled — use `import type` for type-only imports
- `isolatedModules`: enabled
- `esModuleInterop`: enabled
STATIC

# Dynamic content (unquoted heredoc for variable interpolation)
cat <<DYNAMIC
### Running Tools

If you need to check or fix code quality manually:
- \`${RUN} biome check\` — check all files with Biome
- \`${RUN} biome check --write\` — auto-fix lint issues
- \`${RUN} markdownlint-cli2 --config lib/configs/.markdownlint-cli2.jsonc\` — check markdown files
- \`${RUN} lint-staged --config "${ROOT}/lib/configs/lint-staged.config.ts"\` — run lint-staged manually
- \`pnpm run typecheck\` — type-check with tsgo

### Pre-commit Hook

Lint-staged runs automatically on pre-commit via Husky. The hook uses the detected package manager (\`${PM}\`) and config at \`lib/configs/lint-staged.config.ts\`.
DYNAMIC

exit 0
