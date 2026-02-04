---
status: current
module: lint-staged
category: architecture
created: 2026-01-25
updated: 2026-02-04
last-synced: 2026-02-04
completeness: 100
related: []
dependencies: []
implementation-status: implemented
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

### Implementation Summary

The `@savvy-web/lint-staged` package is **fully implemented** with all eight handler
classes, utility classes, and configuration presets. The package dogfoods itself via
`lib/configs/lint-staged.config.ts`.

### Source Files

```text
src/
├── index.ts              # Public API exports
├── index.test.ts         # Public API tests
├── types.ts              # TypeScript type definitions
├── Handler.ts            # Abstract base Handler class
├── utils/
│   ├── Command.ts        # Command availability and package manager detection
│   ├── ConfigSearch.ts   # Configuration file discovery using cosmiconfig
│   ├── EntryExtractor.ts # Package exports entry point extraction
│   ├── Filter.ts         # File filtering utilities
│   ├── ImportGraph.ts    # Import dependency tracing
│   ├── TsDocLinter.ts    # Bundled ESLint TSDoc linter
│   └── TsDocResolver.ts  # Workspace-aware TSDoc file resolution
├── handlers/
│   ├── Biome.ts          # JS/TS/JSON formatting
│   ├── DesignDocs.ts     # Design doc validation
│   ├── Markdown.ts       # Markdown linting
│   ├── PackageJson.ts    # package.json sorting/formatting
│   ├── PnpmWorkspace.ts  # pnpm-workspace.yaml handling
│   ├── ShellScripts.ts   # Shell script permissions
│   ├── TypeScript.ts     # TSDoc validation + type checking
│   └── Yaml.ts           # YAML formatting/validation
└── config/
    ├── createConfig.ts   # Full config factory
    └── Preset.ts         # Preset configurations (minimal/standard/silk)
```

### Handler Classes (Implemented)

All eight handler classes follow the static class pattern with:

- `glob` - Recommended file pattern
- `defaultExcludes` - Default exclusion patterns
- `handler` - Pre-configured handler instance
- `create(options)` - Factory for custom configuration

| Handler | Glob | Implementation |
| :--- | :--- | :--- |
| PackageJson | `**/package.json` | Bundled sort-package-json + Biome |
| Biome | `*.{js,ts,cjs,mjs,...}` | Auto-discovers command and config |
| DesignDocs | `.claude/design/**/*.md` | Shell script validation |
| Markdown | `**/*.{md,mdx}` | Auto-discovers markdownlint-cli2 |
| PnpmWorkspace | `pnpm-workspace.yaml` | Bundled yaml package |
| ShellScripts | `**/*.sh` | chmod permission management |
| Yaml | `**/*.{yml,yaml}` | Bundled yaml package |
| TypeScript | `*.{ts,cts,mts,tsx}` | Bundled ESLint + workspace-aware TSDoc |

### Utility Classes (Implemented)

| Utility | Purpose |
| :--- | :--- |
| Command | Package manager detection, tool availability checks |
| ConfigSearch | cosmiconfig-based config file discovery |
| Filter | Include/exclude pattern filtering |
| TsDocLinter | Programmatic ESLint for TSDoc validation |
| TsDocResolver | Workspace-aware TSDoc file resolution |
| ImportGraph | Import dependency tracing from package exports |
| EntryExtractor | Package.json exports field parsing |

### Key Implementation Decisions Made

1. **Bundled dependencies** - yaml, sort-package-json, ESLint are bundled (no pnpm dlx)
2. **Programmatic ESLint** - TsDocLinter uses ESLint Node.js API, not CLI
3. **Workspace-aware TSDoc** - Uses workspace-tools to detect monorepo packages
4. **Auto-discovery** - Commands and configs auto-discovered via cosmiconfig
5. **Deprecated option aliases** - Old option names supported for backward compatibility

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

### Module Structure (Actual)

```text
@savvy-web/lint-staged/
├── src/
│   ├── index.ts              # Public API exports (classes, types, utilities)
│   ├── index.test.ts         # Public API tests
│   ├── types.ts              # TypeScript type definitions
│   ├── Handler.ts            # Abstract base Handler class
│   ├── utils/
│   │   ├── Command.ts        # Package manager detection, tool finding
│   │   ├── ConfigSearch.ts   # cosmiconfig-based config discovery
│   │   ├── EntryExtractor.ts # Package.json exports parsing
│   │   ├── Filter.ts         # Include/exclude file filtering
│   │   ├── ImportGraph.ts    # Import dependency tracing
│   │   ├── TsDocLinter.ts    # Bundled ESLint TSDoc linter
│   │   └── TsDocResolver.ts  # Workspace-aware TSDoc resolution
│   ├── handlers/
│   │   ├── Biome.ts          # JS/TS/JSON formatting (auto-discovers)
│   │   ├── DesignDocs.ts     # Design doc validation
│   │   ├── Markdown.ts       # Markdown linting (auto-discovers)
│   │   ├── PackageJson.ts    # Bundled sort-package-json
│   │   ├── PnpmWorkspace.ts  # Bundled yaml sorting
│   │   ├── ShellScripts.ts   # chmod permission management
│   │   ├── TypeScript.ts     # Bundled TSDoc + typecheck
│   │   ├── Yaml.ts           # Bundled yaml formatting
│   │   └── index.ts          # Re-exports
│   └── config/
│       ├── createConfig.ts   # Full config factory
│       ├── Preset.ts         # Preset configurations (minimal/standard/silk)
│       └── index.ts          # Re-exports
├── lib/configs/
│   ├── lint-staged.config.ts # Dogfooding config
│   ├── eslint.config.ts      # TSDoc ESLint config
│   └── .markdownlint-cli2.jsonc
├── dist/
│   ├── dev/                  # Development build with source maps
│   └── npm/                  # Production build for npm
└── package.json
```

### Component Diagram (Actual)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       @savvy-web/lint-staged                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Handler Classes                            │ │
│  │                                                                 │ │
│  │  PackageJson │ Biome │ Markdown │ Yaml │ TypeScript            │ │
│  │  DesignDocs  │ PnpmWorkspace │ ShellScripts                    │ │
│  │                                                                 │ │
│  │  Static API: .glob  .defaultExcludes  .handler  .create()      │ │
│  │  Static methods: findConfig() isAvailable() (some handlers)    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Utility Classes                            │ │
│  │                                                                 │ │
│  │  Command         - Package manager detection, tool finding      │ │
│  │  ConfigSearch    - cosmiconfig-based config discovery           │ │
│  │  Filter          - Include/exclude pattern filtering            │ │
│  │  TsDocLinter     - Programmatic ESLint for TSDoc               │ │
│  │  TsDocResolver   - Workspace-aware TSDoc file resolution       │ │
│  │  ImportGraph     - Import dependency tracing                    │ │
│  │  EntryExtractor  - Package.json exports parsing                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────┐  ┌───────────────────────────────────────┐ │
│  │   Config Factory    │  │              Presets                  │ │
│  │                     │  │                                       │ │
│  │  createConfig()     │  │  Preset.minimal()  - formatting only  │ │
│  │  - All handlers     │  │  Preset.standard() - + linting        │ │
│  │  - Custom additions │  │  Preset.silk()     - + TSDoc/design   │ │
│  │  - Per-handler opts │  │  Preset.get(name)  - by name          │ │
│  └────────────────────┘  └───────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Bundled Dependencies                         │ │
│  │                                                                 │ │
│  │  yaml             - YAML parsing/formatting (Yaml, PnpmWS)     │ │
│  │  sort-package-json - package.json sorting (PackageJson)        │ │
│  │  eslint           - Programmatic TSDoc linting (TypeScript)    │ │
│  │  eslint-plugin-tsdoc - TSDoc rule (TypeScript)                 │ │
│  │  cosmiconfig      - Config file discovery (ConfigSearch)       │ │
│  │  workspace-tools  - Monorepo workspace detection               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Actual)

```text
1. Consumer imports handler class (e.g., Biome, TypeScript)
2. Consumer uses static .handler or calls .create(options)
3. Static factory returns lint-staged handler function with options captured
4. Consumer assigns handler to glob key in config object
5. lint-staged matches staged files against glob patterns
6. lint-staged calls handler function with matched filenames
7. Handler performs filtering:
   - Filter.exclude() removes unwanted files
   - Some handlers (TypeScript) do workspace-aware filtering
8. Handler performs processing:
   - Some return command strings (Biome, Markdown, DesignDocs, ShellScripts)
   - Some process files in-place and return [] (PackageJson, Yaml, PnpmWorkspace)
   - TypeScript uses programmatic ESLint + returns typecheck command
9. lint-staged executes returned commands (if any)
```

### Handler Types

The handlers fall into three categories:

**Command-returning handlers:**

- Biome - returns `biome check --write ...`
- Markdown - returns `markdownlint-cli2 --fix ...`
- DesignDocs - returns validation/timestamp script commands
- ShellScripts - returns `chmod` commands

**In-place processing handlers:**

- PackageJson - sorts via bundled sort-package-json, then returns Biome command
- Yaml - formats via bundled yaml package, returns `[]`
- PnpmWorkspace - sorts/formats via bundled yaml package, returns `[]`

**Async/programmatic handlers:**

- TypeScript - runs bundled ESLint TSDoc linter programmatically, throws on
  errors, returns typecheck command

### Class Initialization

```typescript
// At import time
import { Biome, TypeScript } from '@savvy-web/lint-staged';

// Static properties immediately available
Biome.glob           // '*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}'
Biome.defaultExcludes // ['package-lock.json', '__fixtures__']
Biome.handler        // Pre-configured handler

// Static discovery methods
Biome.findBiome()    // Returns command string or undefined
Biome.isAvailable()  // Returns boolean
Biome.findConfig()   // Returns config path or undefined

// Custom configuration
Biome.create({ exclude: ['vendor/'] })
  → Returns: (filenames: string[]) => string | string[]
  → Captures options in closure
  → Auto-discovers biome command and config at handler invocation time

// TypeScript with workspace-aware TSDoc
TypeScript.create({ skipTypecheck: false })
  → Returns: async (filenames: string[]) => Promise<string[]>
  → Uses TsDocResolver to find public API files
  → Uses TsDocLinter (bundled ESLint) for validation
  → Returns typecheck command
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
 * Auto-discovers biome command and config file:
 * - Command: global biome > pnpm exec biome > npx biome
 * - Config: lib/configs/biome.json[c] > biome.json[c] at root
 */
class Biome {
  static readonly glob = '*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}';
  static readonly defaultExcludes = ['package-lock.json', '__fixtures__'] as const;
  static readonly handler: LintStagedHandler;

  static findBiome(): string | undefined;    // Find biome command
  static isAvailable(): boolean;              // Check if biome available
  static findConfig(): string | undefined;    // Find config file
  static create(options?: BiomeOptions): LintStagedHandler;
}
```

**Commands:**

1. `{biome-cmd} check --write --no-errors-on-unmatched [--config={config}] {files}`

**Auto-discovery:**

- Uses `Command.findTool('biome')` for command discovery
- Uses `ConfigSearch.find('biome')` for config file discovery
- Throws at handler invocation if biome not available

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
 * Auto-discovers command and config file:
 * - Command: global markdownlint-cli2 > pnpm exec > npx
 * - Config: lib/configs/.markdownlint-cli2.jsonc > standard locations
 */
class Markdown {
  static readonly glob = '**/*.{md,mdx}';
  static readonly defaultExcludes = [] as const;
  static readonly handler: LintStagedHandler;

  static findMarkdownlint(): string | undefined; // Find command
  static isAvailable(): boolean;                  // Check availability
  static findConfig(): string | undefined;        // Find config file
  static create(options?: MarkdownOptions): LintStagedHandler;
}
```

**Commands:**

1. `{markdownlint-cmd} --config '{config}' [--fix] {files}`

**Auto-discovery:**

- Uses `Command.findTool('markdownlint-cli2')` for command discovery
- Uses `ConfigSearch.find('markdownlint')` for config file discovery
- Throws at handler invocation if markdownlint-cli2 not available

### PnpmWorkspace Handler

Sorts and formats pnpm-workspace.yaml using bundled yaml library.

```typescript
/**
 * Options for the PnpmWorkspace handler.
 */
interface PnpmWorkspaceOptions {
  /** Skip sorting packages and keys */
  skipSort?: boolean;
  /** Skip YAML formatting */
  skipFormat?: boolean;
  /** Skip YAML validation */
  skipLint?: boolean;
  /** @deprecated Use skipSort instead */
  skipYqSort?: boolean;
  /** @deprecated Use skipFormat instead */
  skipPrettier?: boolean;
}

/**
 * Handler for pnpm-workspace.yaml.
 * Processes entirely in JavaScript using bundled yaml package.
 *
 * Sorting behavior:
 * - Sorts `packages` array alphabetically
 * - Sorts `onlyBuiltDependencies` and `publicHoistPattern` arrays
 * - Sorts top-level keys, keeping `packages` first
 */
class PnpmWorkspace {
  static readonly glob = 'pnpm-workspace.yaml';
  static readonly defaultExcludes = [] as const;
  static readonly handler: LintStagedHandler;

  static sortContent(content: PnpmWorkspaceContent): PnpmWorkspaceContent;
  static create(options?: PnpmWorkspaceOptions): LintStagedHandler;
}
```

**Processing:**

1. Reads pnpm-workspace.yaml
2. Parses with bundled yaml package
3. Sorts content (unless `skipSort: true`)
4. Formats and writes back (unless both skip flags set)
5. **Returns `[]`** - no CLI commands needed

**Implementation Note:**

No longer uses yq or prettier. The yaml package handles both parsing,
formatting, and validation. All processing is done in-place.

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

Formats and validates YAML files using bundled yaml library.

```typescript
/**
 * Options for the Yaml handler.
 */
interface YamlOptions extends BaseHandlerOptions {
  /** Skip YAML formatting */
  skipFormat?: boolean;
  /** Skip YAML validation */
  skipValidate?: boolean;
  /** @deprecated Use skipFormat instead */
  skipPrettier?: boolean;
  /** @deprecated Use skipValidate instead */
  skipLint?: boolean;
}

/**
 * Handler for YAML files.
 * Formats and validates using bundled yaml package.
 *
 * Default formatting options:
 * - indent: 2
 * - lineWidth: 0 (no line wrapping)
 * - singleQuote: false
 */
class Yaml {
  static readonly glob = '**/*.{yml,yaml}';
  static readonly defaultExcludes = ['pnpm-lock.yaml', 'pnpm-workspace.yaml'] as const;
  static readonly handler: LintStagedHandler;

  static formatFile(filepath: string, options?: object): void;
  static validateFile(filepath: string): void;
  static create(options?: YamlOptions): LintStagedHandler;
}
```

**Processing:**

1. Filters files using exclude patterns
2. For each file:
   - Formats with bundled yaml package (unless `skipFormat: true`)
   - Validates by parsing (unless `skipValidate: true`)
3. **Returns `[]`** - no CLI commands needed

**Implementation Note:**

No longer uses prettier or yaml-lint. The yaml package handles both
formatting and validation. All processing is done in-place.

### TypeScript Handler

Validates TSDoc syntax and runs type checking with intelligent workspace detection.

```typescript
/**
 * Options for the TypeScript handler.
 */
interface TypeScriptOptions extends BaseHandlerOptions {
  /** Additional patterns to exclude from TSDoc linting */
  excludeTsdoc?: string[];
  /** Skip TSDoc validation */
  skipTsdoc?: boolean;
  /** Skip type checking */
  skipTypecheck?: boolean;
  /** Command for type checking */
  typecheckCommand?: string;
  /** Root directory for workspace detection */
  rootDir?: string;
}

/**
 * Handler for TypeScript files.
 * Validates TSDoc syntax programmatically and runs type checking.
 *
 * TSDoc validation is workspace-aware:
 * 1. Detects workspaces using workspace-tools
 * 2. Checks for tsdoc.json at workspace or repo level
 * 3. Extracts entry points from package.json exports
 * 4. Traces imports from entries using ImportGraph
 * 5. Only lints files that are part of the public API
 *
 * Type checking auto-detects compiler:
 * - @typescript/native-preview in deps → tsgo
 * - typescript in deps → tsc
 */
class TypeScript {
  static readonly glob = '*.{ts,cts,mts,tsx}';
  static readonly defaultExcludes = [] as const;
  static readonly defaultTsdocExcludes = ['.test.', '.spec.', '__test__', '__tests__'] as const;
  static readonly handler: LintStagedHandler;

  static detectCompiler(cwd?: string): 'tsgo' | 'tsc' | undefined;
  static isAvailable(): boolean;
  static getDefaultTypecheckCommand(): string;
  static isTsdocAvailable(cwd?: string): boolean;
  static create(options?: TypeScriptOptions): LintStagedHandler;
}
```

**Processing (async):**

1. Filter files using exclude patterns
2. If TSDoc enabled:
   - Create TsDocResolver with workspace detection
   - Filter staged files to only public API files
   - Run TsDocLinter (bundled ESLint) on each group
   - **Throw Error** if any TSDoc errors found
3. If typecheck enabled:
   - Return typecheck command (auto-detected or custom)

**Key Components:**

- `TsDocResolver` - Finds workspaces, extracts exports, traces imports
- `TsDocLinter` - Programmatic ESLint with tsdoc/syntax rule
- `ImportGraph` - Traces import dependencies from entry points
- `EntryExtractor` - Parses package.json exports field

**Note:** No longer uses external ESLint CLI. All TSDoc validation is
programmatic using the ESLint Node.js API.

---

## Utility Classes

### Command Utility

Package manager detection and tool availability checking.

```typescript
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

interface ToolSearchResult {
  available: boolean;
  command: string | undefined;       // e.g., 'biome' or 'pnpm exec biome'
  source: 'global' | PackageManager | undefined;
}

class Command {
  // Package manager detection (cached)
  static detectPackageManager(cwd?: string): PackageManager;
  static getExecPrefix(pm: PackageManager): string[];
  static clearCache(): void;

  // Tool availability
  static isAvailable(command: string): boolean;  // Global only
  static findTool(tool: string): ToolSearchResult;  // Global + PM
  static requireTool(tool: string, errorMessage?: string): string;

  // Command execution
  static exec(command: string): string;
  static execSilent(command: string): boolean;
}
```

**Package Manager Detection:**

- Reads `packageManager` field from package.json (e.g., `pnpm@9.0.0`)
- Falls back to `npm` if not specified
- Caches result for performance

**Tool Search Order:**

1. Global command (in PATH)
2. Package manager exec (e.g., `pnpm exec biome`)

### Filter Utility

Pattern-based file filtering.

```typescript
class Filter {
  static exclude(filenames: string[], patterns: string[]): string[];
  static include(filenames: string[], patterns: string[]): string[];
  static apply(filenames: string[], options: {
    include?: string[];
    exclude?: string[];
  }): string[];
}
```

All methods use `string.includes()` for pattern matching.

### ConfigSearch Utility

Configuration file discovery using cosmiconfig.

```typescript
interface ConfigSearchResult {
  filepath: string | undefined;
  found: boolean;
}

class ConfigSearch {
  static readonly libConfigDir = 'lib/configs';

  // Find config for known tools
  static find(tool: 'markdownlint' | 'biome' | 'eslint' | 'prettier'): ConfigSearchResult;

  // Custom config search
  static findFile(moduleName: string, options?: {
    libConfigFiles?: string[];
    standardPlaces?: string[];
  }): ConfigSearchResult;

  // Simple existence check
  static exists(filepath: string): boolean;
  static resolve(filename: string, fallback: string): string;
}
```

**Search Priority:**

1. `lib/configs/` directory (agency convention)
2. Standard locations (repo root, package.json, etc.)

### TsDocLinter Utility

Programmatic ESLint for TSDoc validation.

```typescript
interface TsDocLintResult {
  filePath: string;
  errorCount: number;
  warningCount: number;
  messages: TsDocLintMessage[];
}

class TsDocLinter {
  constructor(options?: { ignorePatterns?: string[] });

  async lintFiles(filePaths: string[]): Promise<TsDocLintResult[]>;
  async lintFilesAndThrow(filePaths: string[]): Promise<void>;

  static formatResults(results: TsDocLintResult[]): string;
  static hasErrors(results: TsDocLintResult[]): boolean;
}
```

**Bundled Configuration:**

- Uses `@typescript-eslint/parser`
- Uses `eslint-plugin-tsdoc` with `tsdoc/syntax: 'error'`
- Ignores node_modules, dist, coverage by default

### TsDocResolver Utility

Workspace-aware TSDoc file resolution.

```typescript
interface TsDocWorkspace {
  name: string;
  path: string;
  tsdocConfigPath: string;
  files: string[];       // Public API files to lint
  errors: string[];
}

class TsDocResolver {
  constructor(options: { rootDir: string; excludePatterns?: string[] });

  resolve(): { workspaces: TsDocWorkspace[]; isMonorepo: boolean };
  filterStagedFiles(stagedFiles: string[]): { files: string[]; tsdocConfigPath: string }[];
  needsLinting(filePath: string): boolean;
  getTsDocConfig(filePath: string): string | undefined;
  findWorkspace(filePath: string): TsDocWorkspace | undefined;
}
```

**Resolution Process:**

1. Uses `workspace-tools` to detect workspaces
2. Checks for `tsdoc.json` at workspace/repo level
3. Extracts entry points from package.json `exports`
4. Uses `ImportGraph` to trace all public API files

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

// Silk preset: everything including TSDoc and design docs
export default Preset.silk();

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
// lint-staged.config.ts
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

### External Tool Dependencies (Actual)

**Required (must be installed by consumer):**

- `biome` - JavaScript/TypeScript/JSON formatting (Biome handler)
- `markdownlint-cli2` - Markdown linting (Markdown handler)
- `typescript` or `@typescript/native-preview` - Type checking (TypeScript handler)

**Bundled as dependencies (no installation needed):**

- `yaml` - YAML parsing/formatting (Yaml, PnpmWorkspace handlers)
- `sort-package-json` - Package.json sorting (PackageJson handler)
- `eslint` + `@typescript-eslint/parser` - Programmatic linting
- `eslint-plugin-tsdoc` - TSDoc syntax validation
- `cosmiconfig` - Configuration file discovery
- `workspace-tools` - Monorepo workspace detection

**No longer used:**

- ~~`prettier`~~ - Replaced by bundled yaml package
- ~~`yaml-lint`~~ - Replaced by bundled yaml package
- ~~`yq`~~ - Replaced by bundled yaml package

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

## Implementation Status

### Completed (v0.1.0)

- [x] All eight handler classes implemented
- [x] TypeScript types and TSDoc documentation
- [x] `createConfig()` helper for full configurations
- [x] Preset configurations (minimal, standard, full)
- [x] Async handler support (TypeScript handler is async)
- [x] Bundled dependencies (yaml, sort-package-json, eslint)
- [x] Workspace-aware TSDoc resolution
- [x] Auto-discovery for commands and config files
- [x] Package manager detection and caching
- [x] Dogfooding via lib/configs/lint-staged.config.ts

### Future Enhancements

**Short-term:**

- [ ] Integration tests with actual lint-staged execution
- [ ] README with comprehensive usage examples
- [ ] npm publishing with provenance

**Medium-term:**

- [ ] Plugin architecture for custom handlers
- [ ] Handler composition utilities
- [ ] Community handler registry
- [ ] Cache layer for expensive operations (workspace detection, import tracing)

**Long-term:**

- [ ] Config validation and error messages
- [ ] Watch mode integration
- [ ] Performance profiling and optimization

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

**Document Status:** Current - Synced with implementation

**Implementation Notes:**

- Package is fully implemented and dogfooding itself
- All handlers, utilities, and presets are functional
- Bundled dependencies reduce external requirements
- Workspace-aware TSDoc resolution is more sophisticated than originally planned

**Maintenance:**

- Update this document when adding new handlers or utilities
- Keep utility class signatures in sync with source code
- Update "Implementation Status" checklist as features complete
