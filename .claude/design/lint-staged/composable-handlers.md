---
status: current
module: lint-staged
category: architecture
created: 2026-01-25
updated: 2026-01-25
last-synced: 2026-01-25
completeness: 100
related: []
dependencies: []
---

# Composable Lint-Staged Handlers - Architecture

A library of composable, configurable lint-staged handlers that reduce duplication across
template repositories and provide version-controlled, shareable pre-commit tooling.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Handler Specifications](#handler-specifications)
6. [Configuration API](#configuration-api)
7. [Integration Points](#integration-points)
8. [Testing Strategy](#testing-strategy)
9. [Future Enhancements](#future-enhancements)
10. [Related Documentation](#related-documentation)

---

## Overview

The `@savvy-web/lint-staged` package provides a collection of composable handler functions
for lint-staged configurations. These handlers encapsulate common pre-commit tasks such as
formatting, linting, sorting, and validation, with configurable options for filtering and
customization.

**Key Design Principles:**

- **Composability**: Each handler is independent and can be combined with others
- **Configurability**: Handlers accept options for exclude patterns and behavior customization
- **Zero-config defaults**: Sensible defaults work out of the box for most projects
- **Dependency bundling**: Reduces reliance on `pnpm dlx` by including necessary tools

**When to reference this document:**

- When adding new handler types
- When modifying handler configuration options
- When integrating with lint-staged in consuming projects
- When debugging handler behavior or file filtering

---

## Current State

### Source Analysis

The existing `lib/configs/lint-staged.config.js` contains nine distinct handler patterns:

#### 1. Command Availability Check

```typescript
function isCommandAvailable(command: string): boolean
```

Utility function that checks if a CLI command exists in the system PATH using
`command -v`. Used to conditionally include optional tools like `yq`.

#### 2. Package.json Handler

**Glob:** `**/package.json`
**Tools:** sort-package-json, biome
**Excludes:** `dist/package.json`, `__fixtures__`

Sorts package.json fields and formats with Biome. Filters out generated
package.json files in dist directories and test fixtures.

#### 3. Biome Formatting Handler

**Glob:** `*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}`
**Tools:** biome
**Excludes:** `package-lock.json`, `__fixtures__`

Formats JavaScript/TypeScript and JSON files with Biome, excluding lock files
and test fixtures.

#### 4. Design Doc Validation Handler

**Glob:** `.claude/design/**/*.md`
**Tools:** validate-design-doc.sh, update-timestamp.sh
**Excludes:** `design.config.json`

Validates design document structure and updates `last-synced` timestamps.
Runs custom shell scripts from the skills directory.

#### 5. Markdown Linting Handler

**Glob:** `**/*.{md,mdx}`
**Tools:** markdownlint-cli2
**Config:** `./lib/configs/.markdownlint-cli2.jsonc`

Lints and fixes markdown files using markdownlint-cli2 with project-specific
configuration.

#### 6. pnpm-workspace.yaml Handler

**Glob:** `pnpm-workspace.yaml`
**Tools:** yq (optional), prettier, yaml-lint

Sorts workspace packages alphabetically with yq (if installed), then formats
with Prettier and validates with yaml-lint. yq is optional because it's not
commonly installed globally.

#### 7. Shell Script Chmod Handler

**Glob:** `**/*.sh`
**Excludes:** `.claude/scripts/`

Removes executable bits from shell scripts (except those in `.claude/scripts/`
which need to remain executable for lint-staged hooks).

#### 8. YAML Formatting Handler

**Glob:** `**/*.{yml,yaml}`
**Tools:** prettier, yaml-lint
**Excludes:** `pnpm-lock.yaml`, `pnpm-workspace.yaml`

Formats YAML files with Prettier and validates with yaml-lint. Excludes pnpm
files which have their own handlers or shouldn't be modified.

#### 9. TypeScript TSDoc/Typecheck Handler

**Glob:** `*.{ts,cts,mts,tsx}`
**Tools:** eslint (tsdoc), tsgo
**Filters:** Only `src/` files for TSDoc, excludes `.test.` files

Validates TSDoc syntax with ESLint plugin and runs type checking with tsgo.
TSDoc validation is limited to source files (not tests).

### Current Limitations

- **Copy-paste proliferation**: Configuration is copied across template repositories
- **Version drift**: Updates require manual synchronization across repos
- **pnpm dlx overhead**: Several tools run via `pnpm dlx`, adding latency
- **No configuration reuse**: No way to extend or override defaults
- **Hardcoded paths**: Scripts and config paths are hardcoded

---

## Rationale

### Architectural Decisions

#### Decision 1: Static Class-Based API Pattern

**Context:** Need an API pattern that works well with TSDoc and provides discoverability

**Options considered:**

1. **Static classes with factory methods (Chosen):**
   - Pros: Excellent TSDoc support, groups related constants/methods, discoverable API
   - Cons: Slightly more verbose than bare functions
   - Why chosen: TSDoc generates clear documentation with class structure; static
     properties like `glob` and `defaultExcludes` are immediately visible

2. **Function-based handlers with separate constants:**
   - Pros: Simpler implementation, tree-shakeable
   - Cons: Constants scattered, less discoverable, TSDoc harder to navigate
   - Why rejected: Harder to see all related pieces in documentation

3. **Builder pattern with method chaining:**
   - Pros: Fluent API, very flexible
   - Cons: Overly complex, harder to type, verbose
   - Why rejected: Overkill for simple configuration

**Pattern details:**

- Each handler is a class extending abstract `Handler`
- Static `glob` property provides the recommended file pattern
- Static `defaultExcludes` shows what's filtered by default
- Static `handler` is a pre-configured instance ready for use
- Static `create(options)` factory allows customization

#### Decision 2: Function-Based Handler Output

**Context:** lint-staged supports both string commands and functions that return commands

**Options considered:**

1. **Function-based handlers (Chosen):**
   - Pros: Programmatic filtering, conditional logic, typed configuration
   - Cons: Slightly more complex API, requires function calls
   - Why chosen: Enables proper filtering, options, and composability

2. **String templates with interpolation:**
   - Pros: Simpler syntax, familiar to users
   - Cons: Limited filtering capability, no type safety
   - Why rejected: Cannot implement required file filtering logic

3. **Configuration object with declarative rules:**
   - Pros: Declarative, easy to understand
   - Cons: Limited flexibility, harder to extend
   - Why rejected: Cannot handle conditional tool availability

#### Decision 3: Options Object Pattern

**Context:** Handlers need configurable exclude patterns and behavior

**Options considered:**

1. **Options object with defaults (Chosen):**
   - Pros: Clear API, TypeScript support, easy defaults
   - Cons: More verbose for simple cases
   - Why chosen: Provides flexibility while maintaining simplicity

2. **Multiple function parameters:**
   - Pros: Simple for few options
   - Cons: Doesn't scale, positional arguments confusing
   - Why rejected: Would become unwieldy as options grow

3. **Builder pattern:**
   - Pros: Fluent API, discoverable
   - Cons: Overly complex for this use case
   - Why rejected: Overkill for configuration

#### Decision 4: Include Dependencies vs pnpm dlx

**Context:** Some tools like prettier and yaml-lint are run via `pnpm dlx`

**Options considered:**

1. **Bundle commonly-used dependencies (Chosen):**
   - Pros: Faster execution, consistent versions, offline support
   - Cons: Larger package size, version coupling
   - Why chosen: Performance and reliability outweigh size concerns

2. **Continue using pnpm dlx:**
   - Pros: Always latest version, smaller package
   - Cons: Slower, requires network, version inconsistency
   - Why rejected: Too slow for pre-commit hooks

3. **Peer dependencies:**
   - Pros: Flexible versions, deduplication
   - Cons: Installation complexity, version conflicts
   - Why rejected: Adds friction for consumers

### Design Patterns Used

#### Pattern 1: Static Class with Factory Method

- **Where used:** All handler classes (PackageJson, Biome, etc.)
- **Why used:** Groups related constants and methods; excellent TSDoc documentation
- **Implementation:**

  ```typescript
  class PackageJson extends Handler {
    static readonly glob = '**/package.json';
    static readonly defaultExcludes = ['dist/', '__fixtures__'];
    static readonly handler = PackageJson.create();
    static create(options?: Options): LintStagedHandler { ... }
  }
  ```

#### Pattern 2: Template Method (via Base Class)

- **Where used:** Abstract `Handler` base class
- **Why used:** Shared filtering logic, consistent API across all handlers
- **Implementation:** `Handler.filterFiles()` used by all subclasses

#### Pattern 3: Predicate-Based Filtering

- **Where used:** File filtering within handlers via `Filter` utility
- **Why used:** Allows flexible include/exclude patterns
- **Implementation:** `Filter.exclude(filenames, excludes)` with `string.includes()` matching

#### Pattern 4: Optional Tool Detection

- **Where used:** yq availability in PnpmWorkspace handler
- **Why used:** Gracefully handles missing optional dependencies
- **Implementation:** `Command.isAvailable('yq')` check before including tool

### Constraints and Trade-offs

#### Constraint 1: lint-staged API

- **Description:** Must conform to lint-staged's function signature `(filenames: string[]) => string | string[]`
- **Impact:** Handlers must be higher-order functions
- **Mitigation:** Factory pattern wraps configuration

#### Trade-off 1: Bundle Size vs Performance

- **What we gained:** Fast pre-commit hooks, consistent behavior
- **What we sacrificed:** Package size (including dependencies)
- **Why it's worth it:** Pre-commit performance is critical for developer experience

---

## System Architecture

### Module Structure

```text
@savvy-web/lint-staged/
├── src/
│   ├── index.ts              # Public API exports (all classes)
│   ├── types.ts              # TypeScript type definitions
│   ├── Handler.ts            # Abstract base Handler class
│   ├── utils/
│   │   ├── Command.ts        # Command utility class
│   │   └── Filter.ts         # Filter utility class
│   ├── handlers/
│   │   ├── PackageJson.ts    # PackageJson handler class
│   │   ├── Biome.ts          # Biome handler class
│   │   ├── DesignDocs.ts     # DesignDocs handler class
│   │   ├── Markdown.ts       # Markdown handler class
│   │   ├── PnpmWorkspace.ts  # PnpmWorkspace handler class
│   │   ├── ShellScripts.ts   # ShellScripts handler class
│   │   ├── Yaml.ts           # Yaml handler class
│   │   └── TypeScript.ts     # TypeScript handler class
│   ├── config/
│   │   ├── createConfig.ts   # Full config factory
│   │   └── Preset.ts         # Preset configurations class
│   └── index.test.ts         # Public API tests
├── configs/
│   └── eslint.config.ts      # TSDoc ESLint config (bundled)
└── scripts/
    └── validate-design-doc.sh # Design doc validation (optional)
```

### Component Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    @savvy-web/lint-staged                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Abstract Handler                       │  │
│  │  • filterFiles()  • glob  • defaultExcludes  • handler   │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │ extends                           │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │                    Handler Classes                        │  │
│  │                                                           │  │
│  │  PackageJson │ Biome │ Markdown │ Yaml │ TypeScript      │  │
│  │  DesignDocs  │ PnpmWorkspace │ ShellScripts              │  │
│  │                                                           │  │
│  │  Each exposes: .glob  .defaultExcludes  .handler  .create│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Utility Classes │  │  Config Factory │  │    Presets    │  │
│  │  • Command      │  │  • createConfig │  │  • minimal()  │  │
│  │  • Filter       │  │                 │  │  • standard() │  │
│  └─────────────────┘  └─────────────────┘  │  • full()     │  │
│                                             └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Consumer Project                            │
│                                                                 │
│  lint-staged.config.js                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ import { PackageJson, Biome, Markdown } from '@savvy...';│   │
│  │                                                          │   │
│  │ export default {                                         │   │
│  │   [PackageJson.glob]: PackageJson.handler,               │   │
│  │   [Biome.glob]: Biome.create({ exclude: ['vendor/'] }),  │   │
│  │   [Markdown.glob]: Markdown.handler,                     │   │
│  │ };                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```text
1. Consumer imports handler class (e.g., Biome)
2. Consumer uses static .handler or calls .create(options)
3. Static factory returns lint-staged handler function with options captured
4. Consumer assigns handler to glob key in config object
5. lint-staged matches staged files against glob patterns
6. lint-staged calls handler function with matched filenames
7. Handler uses Filter.exclude() to remove unwanted files
8. Handler builds and returns command string(s)
9. lint-staged executes commands on filtered files
```

### Class Initialization

```text
// At import time
import { Biome } from '@savvy-web/lint-staged';

// Static properties are immediately available
Biome.glob           // '*/.{js,ts,...}'
Biome.defaultExcludes // ['package-lock.json', '__fixtures__']
Biome.handler        // Pre-configured handler (calls create() internally)

// Custom configuration
Biome.create({ exclude: ['vendor/'] })
  → Returns: (filenames: string[]) => string | string[]
  → Captures options in closure
  → Ready for lint-staged to call
```

---

## Handler Specifications

### Base Handler Class

All handlers extend an abstract base class that provides common functionality
and a consistent API pattern for TSDoc documentation:

```typescript
/**
 * Base type for lint-staged handler functions.
 * Receives an array of staged filenames and returns command(s) to execute.
 */
type LintStagedHandler = (filenames: string[]) => string | string[] | Promise<string | string[]>;

/**
 * Base options shared by all handlers.
 */
interface BaseHandlerOptions {
  /** Patterns to exclude from processing (checked via string.includes()) */
  exclude?: string[];
}

/**
 * Abstract base class for all lint-staged handlers.
 * Provides common utilities and establishes the static class pattern.
 *
 * @example
 * ```typescript
 * // Use default handler
 * export default {
 *   [Biome.glob]: Biome.handler,
 * };
 *
 * // Use customized handler
 * export default {
 *   [Biome.glob]: Biome.create({ exclude: ['vendor/'] }),
 * };
 * ```
 */
abstract class Handler {
  /**
   * Default glob pattern for this handler.
   * Use as the key in lint-staged config.
   */
  static readonly glob: string;

  /**
   * Default exclude patterns applied when no options provided.
   */
  static readonly defaultExcludes: readonly string[];

  /**
   * Pre-configured handler with default options.
   * Ready to use directly in lint-staged config.
   */
  static readonly handler: LintStagedHandler;

  /**
   * Factory method to create a handler with custom options.
   * @param options - Configuration options for this handler
   * @returns A lint-staged compatible handler function
   */
  static create(options?: BaseHandlerOptions): LintStagedHandler;

  /**
   * Filter filenames based on exclude patterns.
   * @param filenames - Array of staged file paths
   * @param excludes - Patterns to exclude (uses string.includes())
   * @returns Filtered array of file paths
   */
  protected static filterFiles(filenames: string[], excludes: string[]): string[];
}
```

### PackageJson Handler

Sorts package.json fields and formats with Biome.

```typescript
/**
 * Options for the PackageJson handler.
 */
interface PackageJsonOptions extends BaseHandlerOptions {
  /** Skip sort-package-json, only run Biome formatting */
  skipSort?: boolean;
  /** Path to Biome config file */
  biomeConfig?: string;
}

/**
 * Handler for package.json files.
 * Sorts fields with sort-package-json and formats with Biome.
 *
 * @example
 * ```typescript
 * import { PackageJson } from '@savvy-web/lint-staged';
 *
 * export default {
 *   // Use defaults
 *   [PackageJson.glob]: PackageJson.handler,
 *
 *   // Or customize
 *   [PackageJson.glob]: PackageJson.create({
 *     exclude: ['packages/legacy/package.json'],
 *     skipSort: true,
 *   }),
 * };
 * ```
 */
class PackageJson extends Handler {
  /** @defaultValue `'**\/package.json'` */
  static readonly glob = '**/package.json';

  /** @defaultValue `['dist/package.json', '__fixtures__']` */
  static readonly defaultExcludes = ['dist/package.json', '__fixtures__'] as const;

  static readonly handler: LintStagedHandler;
  static create(options?: PackageJsonOptions): LintStagedHandler;
}
```

**Commands:**

1. `sort-package-json {files}` (unless `skipSort: true`)
2. `biome check --write --max-diagnostics=none {files}`

### Biome Handler

Formats JavaScript, TypeScript, and JSON files with Biome.

```typescript
/**
 * Options for the Biome handler.
 */
interface BiomeOptions extends BaseHandlerOptions {
  /** Path to Biome config file */
  config?: string;
  /** Additional Biome CLI flags */
  flags?: string[];
}

/**
 * Handler for JavaScript/TypeScript/JSON files.
 * Formats and lints with Biome.
 *
 * @example
 * ```typescript
 * import { Biome } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [Biome.glob]: Biome.create({
 *     exclude: ['vendor/', 'generated/'],
 *   }),
 * };
 * ```
 */
class Biome extends Handler {
  /** @defaultValue `'*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}'` */
  static readonly glob = '*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}';

  /** @defaultValue `['package-lock.json', '__fixtures__']` */
  static readonly defaultExcludes = ['package-lock.json', '__fixtures__'] as const;

  static readonly handler: LintStagedHandler;
  static create(options?: BiomeOptions): LintStagedHandler;
}
```

**Commands:**

1. `biome check --write --no-errors-on-unmatched {files}`

### DesignDocs Handler

Validates design documents and updates timestamps.

```typescript
/**
 * Options for the DesignDocs handler.
 */
interface DesignDocsOptions extends BaseHandlerOptions {
  /** Path to validation script */
  validateScript?: string;
  /** Path to timestamp update script */
  timestampScript?: string;
  /** Skip timestamp updates */
  skipTimestamp?: boolean;
}

/**
 * Handler for design documentation files.
 * Validates structure and updates last-synced timestamps.
 *
 * @example
 * ```typescript
 * import { DesignDocs } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [DesignDocs.glob]: DesignDocs.create({
 *     validateScript: './scripts/validate-doc.sh',
 *   }),
 * };
 * ```
 */
class DesignDocs extends Handler {
  /** @defaultValue `'.claude/design/**\/*.md'` */
  static readonly glob = '.claude/design/**/*.md';

  /** @defaultValue `['design.config.json']` */
  static readonly defaultExcludes = ['design.config.json'] as const;

  /** @defaultValue `'.claude/skills/design-validate/scripts/validate-design-doc.sh'` */
  static readonly defaultValidateScript: string;

  /** @defaultValue `'.claude/skills/design-update/scripts/update-timestamp.sh'` */
  static readonly defaultTimestampScript: string;

  static readonly handler: LintStagedHandler;
  static create(options?: DesignDocsOptions): LintStagedHandler;
}
```

**Commands (per file):**

1. `{validateScript} "{file}"`
2. `{timestampScript} "{file}"` (unless `skipTimestamp: true`)

### Markdown Handler

Lints and fixes markdown files with markdownlint-cli2.

```typescript
/**
 * Options for the Markdown handler.
 */
interface MarkdownOptions extends BaseHandlerOptions {
  /** Path to markdownlint-cli2 config file */
  config?: string;
  /** Disable auto-fix (lint only) */
  noFix?: boolean;
}

/**
 * Handler for Markdown files.
 * Lints and auto-fixes with markdownlint-cli2.
 *
 * @example
 * ```typescript
 * import { Markdown } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [Markdown.glob]: Markdown.create({
 *     config: './config/.markdownlint.jsonc',
 *   }),
 * };
 * ```
 */
class Markdown extends Handler {
  /** @defaultValue `'**\/*.{md,mdx}'` */
  static readonly glob = '**/*.{md,mdx}';

  /** @defaultValue `[]` */
  static readonly defaultExcludes = [] as const;

  /** @defaultValue `'./lib/configs/.markdownlint-cli2.jsonc'` */
  static readonly defaultConfig: string;

  static readonly handler: LintStagedHandler;
  static create(options?: MarkdownOptions): LintStagedHandler;
}
```

**Commands:**

1. `markdownlint-cli2 --config {config} [--fix] {files}`

### PnpmWorkspace Handler

Sorts and formats pnpm-workspace.yaml.

```typescript
/**
 * Options for the PnpmWorkspace handler.
 */
interface PnpmWorkspaceOptions {
  /** Skip yq sorting even if yq is available */
  skipYqSort?: boolean;
  /** Skip prettier formatting */
  skipPrettier?: boolean;
  /** Skip yaml-lint validation */
  skipLint?: boolean;
}

/**
 * Handler for pnpm-workspace.yaml.
 * Optionally sorts with yq, formats with prettier, validates with yaml-lint.
 *
 * @remarks
 * The yq sorting is only applied if yq is installed globally.
 * Use `Command.isAvailable('yq')` to check availability.
 *
 * @example
 * ```typescript
 * import { PnpmWorkspace } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [PnpmWorkspace.glob]: PnpmWorkspace.create({
 *     skipYqSort: true, // Skip even if yq is installed
 *   }),
 * };
 * ```
 */
class PnpmWorkspace extends Handler {
  /** @defaultValue `'pnpm-workspace.yaml'` */
  static readonly glob = 'pnpm-workspace.yaml';

  /** @defaultValue `[]` (no excludes, single file) */
  static readonly defaultExcludes = [] as const;

  /** The yq command used to sort workspace packages */
  static readonly yqSortCommand: string;

  static readonly handler: LintStagedHandler;
  static create(options?: PnpmWorkspaceOptions): LintStagedHandler;
}
```

**Commands (conditional):**

1. `yq -i '...' pnpm-workspace.yaml` (if yq available and not skipped)
2. `prettier --write pnpm-workspace.yaml` (unless skipped)
3. `yaml-lint pnpm-workspace.yaml` (unless skipped)

### ShellScripts Handler

Manages executable permissions on shell scripts.

```typescript
/**
 * Options for the ShellScripts handler.
 */
interface ShellScriptsOptions extends BaseHandlerOptions {
  /** Set executable bit instead of removing it */
  makeExecutable?: boolean;
}

/**
 * Handler for shell script files.
 * Removes executable bit by default (security best practice).
 *
 * @remarks
 * By default, excludes `.claude/scripts/` which need to remain executable
 * for lint-staged hooks to work.
 *
 * @example
 * ```typescript
 * import { ShellScripts } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [ShellScripts.glob]: ShellScripts.create({
 *     exclude: ['.claude/scripts/', 'bin/'],
 *   }),
 * };
 * ```
 */
class ShellScripts extends Handler {
  /** @defaultValue `'**\/*.sh'` */
  static readonly glob = '**/*.sh';

  /** @defaultValue `['.claude/scripts/']` */
  static readonly defaultExcludes = ['.claude/scripts/'] as const;

  static readonly handler: LintStagedHandler;
  static create(options?: ShellScriptsOptions): LintStagedHandler;
}
```

**Commands (per file):**

1. `chmod -x {file}` (or `chmod +x` if `makeExecutable: true`)

### Yaml Handler

Formats and validates YAML files.

```typescript
/**
 * Options for the Yaml handler.
 */
interface YamlOptions extends BaseHandlerOptions {
  /** Skip prettier formatting */
  skipPrettier?: boolean;
  /** Skip yaml-lint validation */
  skipLint?: boolean;
  /** Path to prettier config file */
  prettierConfig?: string;
}

/**
 * Handler for YAML files.
 * Formats with prettier and validates with yaml-lint.
 *
 * @remarks
 * Excludes pnpm-lock.yaml and pnpm-workspace.yaml by default.
 * pnpm-workspace.yaml has its own dedicated handler.
 *
 * @example
 * ```typescript
 * import { Yaml } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [Yaml.glob]: Yaml.create({
 *     exclude: ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'generated/'],
 *   }),
 * };
 * ```
 */
class Yaml extends Handler {
  /** @defaultValue `'**\/*.{yml,yaml}'` */
  static readonly glob = '**/*.{yml,yaml}';

  /** @defaultValue `['pnpm-lock.yaml', 'pnpm-workspace.yaml']` */
  static readonly defaultExcludes = ['pnpm-lock.yaml', 'pnpm-workspace.yaml'] as const;

  static readonly handler: LintStagedHandler;
  static create(options?: YamlOptions): LintStagedHandler;
}
```

**Commands:**

1. `prettier --write {files}` (unless skipped)
2. `yaml-lint {files}` (unless skipped)

### TypeScript Handler

Validates TSDoc syntax and runs type checking.

```typescript
/**
 * Options for the TypeScript handler.
 */
interface TypeScriptOptions extends BaseHandlerOptions {
  /** Additional patterns to exclude from TSDoc linting */
  excludeTsdoc?: string[];
  /** Patterns that identify source files for TSDoc (vs test files) */
  sourcePatterns?: string[];
  /** Skip TSDoc validation */
  skipTsdoc?: boolean;
  /** Skip type checking */
  skipTypecheck?: boolean;
  /** Path to ESLint config for TSDoc rules */
  eslintConfig?: string;
  /** Command for type checking */
  typecheckCommand?: string;
}

/**
 * Handler for TypeScript files.
 * Validates TSDoc syntax with ESLint and runs type checking.
 *
 * @remarks
 * TSDoc validation only runs on source files (matching `sourcePatterns`),
 * not on test files. Type checking runs on all staged TypeScript files.
 *
 * @example
 * ```typescript
 * import { TypeScript } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [TypeScript.glob]: TypeScript.create({
 *     skipTypecheck: true, // Only validate TSDoc
 *     sourcePatterns: ['src/', 'lib/'],
 *   }),
 * };
 * ```
 */
class TypeScript extends Handler {
  /** @defaultValue `'*.{ts,cts,mts,tsx}'` */
  static readonly glob = '*.{ts,cts,mts,tsx}';

  /** @defaultValue `[]` */
  static readonly defaultExcludes = [] as const;

  /** @defaultValue `['src/']` */
  static readonly defaultSourcePatterns = ['src/'] as const;

  /** @defaultValue `['.test.', '__test__']` */
  static readonly defaultTsdocExcludes = ['.test.', '__test__'] as const;

  /** @defaultValue `'tsgo --noEmit'` */
  static readonly defaultTypecheckCommand = 'tsgo --noEmit';

  /** @defaultValue `'./lib/configs/eslint.config.ts'` */
  static readonly defaultEslintConfig: string;

  static readonly handler: LintStagedHandler;
  static create(options?: TypeScriptOptions): LintStagedHandler;
}
```

**Commands:**

1. `eslint --config {config} {sourceFiles}` (if source files present, unless skipped)
2. `{typecheckCommand}` (unless skipped)

---

## Utility Classes

### Command Utility

Utilities for working with shell commands.

```typescript
/**
 * Utilities for shell command operations.
 *
 * @example
 * ```typescript
 * import { Command } from '@savvy-web/lint-staged';
 *
 * if (Command.isAvailable('yq')) {
 *   // yq is installed
 * }
 * ```
 */
class Command {
  /**
   * Check if a command is available in the system PATH.
   * @param command - The command name to check
   * @returns true if the command exists, false otherwise
   */
  static isAvailable(command: string): boolean;

  /**
   * Execute a command and return its output.
   * @param command - The command to execute
   * @returns The command output as a string
   * @throws If the command fails
   */
  static exec(command: string): string;
}
```

### Filter Utility

Utilities for filtering file lists.

```typescript
/**
 * Utilities for filtering staged file lists.
 *
 * @example
 * ```typescript
 * import { Filter } from '@savvy-web/lint-staged';
 *
 * const handler = (filenames: string[]) => {
 *   const filtered = Filter.exclude(filenames, ['dist/', '__fixtures__']);
 *   return filtered.length > 0 ? `biome check ${filtered.join(' ')}` : [];
 * };
 * ```
 */
class Filter {
  /**
   * Exclude files matching any of the given patterns.
   * @param filenames - Array of file paths
   * @param patterns - Patterns to exclude (uses string.includes())
   * @returns Filtered array of file paths
   */
  static exclude(filenames: string[], patterns: string[]): string[];

  /**
   * Include only files matching any of the given patterns.
   * @param filenames - Array of file paths
   * @param patterns - Patterns to include (uses string.includes())
   * @returns Filtered array of file paths
   */
  static include(filenames: string[], patterns: string[]): string[];
}
```

---

## Configuration API

### Using Individual Handlers

The recommended approach for most projects:

```typescript
import {
  PackageJson,
  Biome,
  Markdown,
  Yaml,
  TypeScript,
} from '@savvy-web/lint-staged';

export default {
  // Use default handlers with their recommended globs
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,
  [Yaml.glob]: Yaml.handler,
  [TypeScript.glob]: TypeScript.handler,
};
```

### Customizing Handlers

```typescript
import { PackageJson, Biome, TypeScript } from '@savvy-web/lint-staged';

export default {
  // Custom exclude patterns
  [PackageJson.glob]: PackageJson.create({
    exclude: [...PackageJson.defaultExcludes, 'packages/legacy/'],
  }),

  // Skip certain steps
  [Biome.glob]: Biome.create({
    exclude: ['vendor/', 'generated/'],
  }),

  // Disable type checking, keep TSDoc
  [TypeScript.glob]: TypeScript.create({
    skipTypecheck: true,
    sourcePatterns: ['src/', 'lib/'],
  }),
};
```

### Full Configuration Helper

For projects that want all handlers with easy overrides:

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  // Override individual handler options
  packageJson: { exclude: ['custom/package.json'] },
  biome: { exclude: ['vendor/'] },
  markdown: { config: './custom-markdownlint.json' },

  // Disable specific handlers
  shellScripts: false,
  designDocs: false,

  // Add custom handlers
  custom: {
    '*.css': (files) => `stylelint --fix ${files.join(' ')}`,
  },
});
```

### Presets

```typescript
import { Preset } from '@savvy-web/lint-staged';

// Minimal preset: just formatting
export default Preset.minimal();

// Standard preset: formatting + linting (default)
export default Preset.standard();

// Full preset: everything including TSDoc and design docs
export default Preset.full();

// Extend a preset
export default Preset.standard({
  biome: { exclude: ['legacy/'] },
  custom: {
    '*.css': (files) => `stylelint ${files.join(' ')}`,
  },
});
```

---

## Integration Points

### lint-staged Integration

The package exports handlers compatible with lint-staged's function-based
configuration:

```javascript
// lint-staged.config.js
import { biome, markdown } from '@savvy-web/lint-staged';

export default {
  '*.ts': biome(),
  '*.md': markdown(),
};
```

### Biome Integration

Handlers use Biome for JavaScript/TypeScript/JSON formatting. The consuming
project must have Biome installed and configured.

### ESLint Integration (TSDoc)

The TypeScript handler uses ESLint with eslint-plugin-tsdoc. The package
includes a bundled ESLint config:

```typescript
// Uses bundled config by default
typescript()

// Or specify custom config
typescript({ eslintConfig: './custom-eslint.config.ts' })
```

### External Tool Dependencies

**Required:**

- `biome` - JavaScript/TypeScript/JSON formatting
- `markdownlint-cli2` - Markdown linting

**Bundled:**

- `prettier` - YAML formatting
- `yaml-lint` - YAML validation
- `sort-package-json` - Package.json sorting
- `eslint` + `eslint-plugin-tsdoc` - TSDoc validation

**Optional:**

- `yq` - YAML sorting (detected at runtime)
- `tsgo` / `tsc` - TypeScript type checking (detected at runtime)

---

## Testing Strategy

### Unit Tests

**Location:** `src/**/*.test.ts`

**Coverage target:** 90%

**What to test:**

- Handler factory functions return valid handlers
- File filtering logic with various exclude patterns
- Command generation for different file sets
- Options merging with defaults
- Edge cases (empty file arrays, all files excluded)

### Integration Tests

**Location:** `src/**/*.integration.test.ts`

**What to test:**

- Handler output matches lint-staged expectations
- Commands execute successfully on sample files
- Error handling for missing dependencies
- isCommandAvailable utility accuracy

### Test Fixtures

```text
__fixtures__/
├── package.json          # Test package.json file
├── sample.ts             # TypeScript source file
├── sample.test.ts        # Test file (should be excluded)
├── sample.md             # Markdown file
├── sample.yaml           # YAML file
└── dist/
    └── package.json      # Should be excluded
```

---

## Future Enhancements

### Phase 1: Initial Release (v0.1.0)

- All nine handler types implemented
- TypeScript types and JSDoc documentation
- Basic test coverage
- README with usage examples

### Phase 2: Configuration Presets (v0.2.0)

- `createConfig()` helper for full configurations
- Preset configurations (minimal, standard, strict)
- Config validation and error messages

### Phase 3: Plugin System (v0.3.0)

- Plugin architecture for custom handlers
- Community handler registry
- Handler composition utilities

### Potential Refactoring

- Consider async handler support if lint-staged adds it
- Evaluate bundling vs peer dependencies as ecosystem evolves
- Add caching layer for command availability checks

---

## Related Documentation

**Internal Design Docs:**

- None yet (first design doc for this module)

**Package Documentation:**

- `README.md` - Package overview and usage
- `CLAUDE.md` - Development guide

**External Resources:**

- [lint-staged documentation](https://github.com/okonet/lint-staged)
- [Biome documentation](https://biomejs.dev/)
- [markdownlint-cli2 documentation](https://github.com/DavidAnson/markdownlint-cli2)

---

**Document Status:** Draft - Core architecture documented, ready for implementation

**Next Steps:**

1. Create implementation plan with phases
2. Set up package structure and build configuration
3. Implement handlers one by one with tests
4. Document public API in README
