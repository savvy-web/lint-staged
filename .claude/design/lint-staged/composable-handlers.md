---
status: current
module: lint-staged
category: architecture
created: 2026-01-25
updated: 2026-02-10
last-synced: 2026-02-10
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
7. [CLI Configuration Management](#cli-configuration-management)
8. [CLI Formatting Commands](#cli-formatting-commands)
9. [Integration Points](#integration-points)
10. [Build Pipeline](#build-pipeline)
11. [Testing Strategy](#testing-strategy)
12. [Future Enhancements](#future-enhancements)
13. [Related Documentation](#related-documentation)

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
scripts/
└── generate-markdownlint-template.ts  # Codegen: JSONC → TypeScript template
src/
├── index.ts              # Public API exports
├── index.test.ts         # Public API tests
├── types.ts              # TypeScript type definitions
├── Handler.ts            # Abstract base Handler class
├── utils/
│   ├── Command.ts        # Command availability, package manager detection, savvy-lint finder
│   ├── ConfigSearch.ts   # Configuration file discovery using cosmiconfig
│   ├── EntryExtractor.ts # Package exports entry point extraction
│   ├── Filter.ts         # File filtering utilities + shell escaping
│   ├── ImportGraph.ts    # Import dependency tracing
│   ├── TsDocLinter.ts    # Bundled ESLint TSDoc linter
│   └── TsDocResolver.ts  # Workspace-aware TSDoc file resolution
├── handlers/
│   ├── Biome.ts          # JS/TS/JSON formatting
│   ├── Markdown.ts       # Markdown linting
│   ├── PackageJson.ts    # package.json sorting/formatting + fmtCommand()
│   ├── PnpmWorkspace.ts  # pnpm-workspace.yaml handling + fmtCommand()
│   ├── ShellScripts.ts   # Shell script permissions
│   ├── TypeScript.ts     # TSDoc validation + type checking (runtime tool detection)
│   └── Yaml.ts           # YAML formatting/validation + fmtCommand()
├── config/
│   ├── createConfig.ts   # Full config factory (array syntax for sequential execution)
│   └── Preset.ts         # Preset configurations (minimal/standard/silk)
├── cli/
│   ├── index.ts          # CLI root command with init, check, fmt subcommands
│   ├── commands/
│   │   ├── init.ts       # Init command (hooks, configs, markdownlint)
│   │   ├── check.ts      # Check command (validate setup)
│   │   └── fmt.ts        # Fmt command (package-json, pnpm-workspace, yaml)
│   └── templates/
│       └── markdownlint.gen.ts  # Generated markdownlint template (committed)
└── public/
    └── biome/
        └── silk.jsonc    # Shareable Biome config for consumers
```

### Handler Classes (Implemented)

All seven handler classes follow the static class pattern with:

- `glob` - Recommended file pattern
- `defaultExcludes` - Default exclusion patterns
- `handler` - Pre-configured handler instance
- `create(options)` - Factory for custom configuration
- `fmtCommand(options)` - Factory returning CLI format command (PackageJson, PnpmWorkspace, Yaml)

| Handler | Glob | Implementation |
| :--- | :--- | :--- |
| PackageJson | `**/package.json` | Bundled sort-package-json + Biome; `fmtCommand()` for CLI sorting |
| Biome | `*.{js,ts,cjs,mjs,...}` | Auto-discovers command and config |
| Markdown | `**/*.{md,mdx}` | Auto-discovers markdownlint-cli2 |
| PnpmWorkspace | `pnpm-workspace.yaml` | Bundled yaml package; `fmtCommand()` for CLI sort/format |
| ShellScripts | `**/*.sh` | chmod permission management |
| Yaml | `**/*.{yml,yaml}` | Prettier formatting + yaml-lint validation; `fmtCommand()` for CLI format |
| TypeScript | `*.{ts,cts,mts,tsx}` | Bundled ESLint + workspace-aware TSDoc; runtime tool detection |

### Utility Classes (Implemented)

| Utility | Purpose |
| :--- | :--- |
| Command | Package manager detection, tool availability checks, `findSavvyLint()` |
| ConfigSearch | cosmiconfig-based config file discovery (incl. yamllint) |
| Filter | Include/exclude pattern filtering, shell escaping |
| TsDocLinter | Programmatic ESLint for TSDoc validation |
| TsDocResolver | Workspace-aware TSDoc file resolution |
| ImportGraph | Import dependency tracing from package exports |
| EntryExtractor | Package.json exports field parsing |

### Key Implementation Decisions Made

1. **Bundled dependencies** - yaml, sort-package-json, ESLint, Prettier, yaml-lint are bundled
2. **Programmatic ESLint** - TsDocLinter uses ESLint Node.js API, not CLI
3. **Workspace-aware TSDoc** - Uses workspace-tools to detect monorepo packages
4. **Auto-discovery** - Commands and configs auto-discovered via cosmiconfig
5. **fmtCommand() pattern** - Handlers that modify files in-place expose a `fmtCommand()` static
   method that returns a CLI command (`savvy-lint fmt ...`) so lint-staged can detect and
   auto-stage the modifications
6. **Array syntax in createConfig()** - Uses lint-staged array syntax for sequential execution
   (e.g., `[PackageJson.fmtCommand(), Biome.create()]`)
7. **Runtime tool detection** - TypeScript.detectCompiler() uses `Command.findTool()` instead
   of parsing package.json dependencies, for correct pnpm catalog/hoisting behavior

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

#### Decision 4: fmtCommand() Pattern for lint-staged v16 Staging

**Context:** With lint-staged v16, when handler functions modify files in-place AND return
commands, staging is unreliable. lint-staged only auto-stages changes made by COMMANDS it
runs, not by handler function bodies. This means in-place modifications (sorting
package.json, formatting YAML) were not being committed.

**Options considered:**

1. **CLI format commands via fmtCommand() (Chosen):**
   - Pros: lint-staged runs the command, detects file changes, auto-stages them
   - Cons: Requires CLI binary, slightly more complex architecture
   - Why chosen: Reliable staging, works with lint-staged v16 array syntax

2. **Return all operations as commands:**
   - Pros: Simple, all changes visible to lint-staged
   - Cons: Cannot use bundled libraries programmatically for all operations
   - Why rejected: Some operations need programmatic access (YAML parsing, JSON sorting)

3. **Post-handler staging scripts:**
   - Pros: Could work without CLI
   - Cons: Fragile, depends on lint-staged internals
   - Why rejected: Not supported by lint-staged API

**Pattern details:**

- Handlers with in-place modifications expose `fmtCommand()` static method
- `fmtCommand()` returns a `savvy-lint fmt <subcommand> <files>` CLI command string
- `Command.findSavvyLint()` locates the binary via tool search or dev build fallback
- `createConfig()` uses lint-staged array syntax: `[Handler.fmtCommand(), Handler.create()]`
- Step 1 (fmtCommand) modifies files via CLI, lint-staged auto-stages
- Step 2 (create) runs validation/linting on the staged result

#### Decision 5: Include Dependencies vs pnpm dlx

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

#### Pattern 4: CLI Format Command (fmtCommand)

- **Where used:** PackageJson, PnpmWorkspace, Yaml handlers
- **Why used:** lint-staged v16 only auto-stages changes made by COMMANDS, not
  handler function bodies. This pattern delegates file modifications to CLI commands.
- **Implementation:**

  ```typescript
  class Yaml {
    static fmtCommand(options?: YamlOptions): LintStagedHandler {
      return (filenames) => {
        const filtered = Filter.exclude(filenames, excludes);
        const cmd = Command.findSavvyLint();
        return `${cmd} fmt yaml ${Filter.shellEscape(filtered)}`;
      };
    }
  }
  ```

#### Pattern 5: lint-staged Array Syntax for Sequential Execution

- **Where used:** `createConfig()` for PackageJson, PnpmWorkspace, Yaml globs
- **Why used:** Separates format-then-validate into sequential steps with staging
- **Implementation:**

  ```typescript
  config[Yaml.glob] = [
    Yaml.fmtCommand(yamlOpts),        // Step 1: format via CLI (auto-staged)
    Yaml.create({ skipFormat: true }), // Step 2: validate only
  ];
  ```

#### Pattern 6: Runtime Tool Detection

- **Where used:** TypeScript.detectCompiler(), Command.findSavvyLint()
- **Why used:** More reliable than parsing package.json dependencies; works correctly
  with pnpm catalogs, peer dependencies, and hoisted/transitive deps
- **Implementation:** `Command.findTool('tsgo')` checks global first, then package manager

### Constraints and Trade-offs

#### Constraint 1: lint-staged API

- **Description:** Must conform to lint-staged's function signature
  `(filenames: readonly string[]) => string | string[] | Promise<string | string[]>`
- **Impact:** Handlers must be higher-order functions; in-place modifications need
  CLI commands for reliable staging in v16
- **Mitigation:** Factory pattern wraps configuration; fmtCommand() pattern delegates
  modifications to CLI; array syntax enables sequential format-then-validate steps

#### Trade-off 1: Bundle Size vs Performance

- **What we gained:** Fast pre-commit hooks, consistent behavior
- **What we sacrificed:** Package size (including dependencies)
- **Why it's worth it:** Pre-commit performance is critical for developer experience

---

## System Architecture

### Module Structure (Actual)

```text
@savvy-web/lint-staged/
├── scripts/
│   └── generate-markdownlint-template.ts  # Codegen script (run with bun)
├── src/
│   ├── index.ts              # Public API exports (classes, types, utilities)
│   ├── index.test.ts         # Public API tests
│   ├── types.ts              # TypeScript type definitions (LintStagedEntry, etc.)
│   ├── Handler.ts            # Abstract base Handler class
│   ├── utils/
│   │   ├── Command.ts        # PM detection, tool finding, findSavvyLint()
│   │   ├── ConfigSearch.ts   # cosmiconfig-based config discovery (incl. yamllint)
│   │   ├── EntryExtractor.ts # Package.json exports parsing
│   │   ├── Filter.ts         # Include/exclude file filtering, shellEscape()
│   │   ├── ImportGraph.ts    # Import dependency tracing
│   │   ├── TsDocLinter.ts    # Bundled ESLint TSDoc linter
│   │   └── TsDocResolver.ts  # Workspace-aware TSDoc resolution
│   ├── handlers/
│   │   ├── Biome.ts          # JS/TS/JSON formatting (auto-discovers)
│   │   ├── Markdown.ts       # Markdown linting (auto-discovers)
│   │   ├── PackageJson.ts    # sort-package-json + Biome; fmtCommand()
│   │   ├── PnpmWorkspace.ts  # Bundled yaml sorting; fmtCommand()
│   │   ├── ShellScripts.ts   # chmod permission management
│   │   ├── TypeScript.ts     # TSDoc + typecheck (runtime tool detection)
│   │   ├── Yaml.ts           # Prettier + yaml-lint; fmtCommand()
│   │   └── index.ts          # Re-exports
│   ├── config/
│   │   ├── createConfig.ts   # Config factory (array syntax for sequential steps)
│   │   ├── Preset.ts         # Preset configurations (minimal/standard/silk)
│   │   └── index.ts          # Re-exports
│   ├── cli/
│   │   ├── index.ts          # Root command (init, check, fmt subcommands)
│   │   ├── commands/
│   │   │   ├── init.ts       # Init command (hooks + markdownlint config)
│   │   │   ├── check.ts      # Check command (validate current setup)
│   │   │   └── fmt.ts        # Fmt command (package-json, pnpm-workspace, yaml)
│   │   └── templates/
│   │       └── markdownlint.gen.ts  # Generated markdownlint template data
│   └── public/
│       └── biome/
│           └── silk.jsonc    # Shareable Biome config for consumers
├── lib/configs/
│   ├── lint-staged.config.ts # Dogfooding config
│   ├── eslint.config.ts      # TSDoc ESLint config
│   ├── .markdownlint-cli2.jsonc  # Source of truth for markdownlint rules
│   └── .yaml-lint.json       # yaml-lint schema configuration
├── dist/
│   ├── dev/                  # Development build with source maps
│   │   └── bin/savvy-lint.js # Dev build CLI binary (dogfooding fallback)
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
│  │  PnpmWorkspace │ ShellScripts                                  │ │
│  │                                                                 │ │
│  │  Static API: .glob  .defaultExcludes  .handler  .create()      │ │
│  │  Static methods: findConfig() isAvailable() (some handlers)    │ │
│  │  CLI format:  .fmtCommand() (PackageJson, PnpmWorkspace, Yaml) │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Utility Classes                            │ │
│  │                                                                 │ │
│  │  Command         - PM detection, tool finding, findSavvyLint() │ │
│  │  ConfigSearch    - cosmiconfig config discovery (incl yamllint) │ │
│  │  Filter          - Include/exclude filtering, shellEscape()    │ │
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
│  │  - Array syntax for │  │  Preset.standard() - + linting        │ │
│  │    sequential steps │  │  Preset.silk()     - + TSDoc          │ │
│  │  - Custom additions │  │  Preset.get(name)  - by name          │ │
│  │  - Per-handler opts │  │                                       │ │
│  └────────────────────┘  └───────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                CLI (savvy-lint)                                  │ │
│  │                                                                 │ │
│  │  init             - Hook/config setup                           │ │
│  │  check            - Validate setup                              │ │
│  │  fmt package-json - Sort package.json (sort-package-json)      │ │
│  │  fmt pnpm-workspace - Sort/format pnpm-workspace.yaml (yaml)  │ │
│  │  fmt yaml         - Format YAML files (Prettier)               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Bundled Dependencies                         │ │
│  │                                                                 │ │
│  │  yaml             - YAML parsing/formatting (PnpmWS, fmt CLI)  │ │
│  │  sort-package-json - package.json sorting (PackageJson, fmt)   │ │
│  │  prettier         - YAML formatting (Yaml handler, fmt CLI)    │ │
│  │  yaml-lint        - YAML validation (Yaml handler)             │ │
│  │  eslint           - Programmatic TSDoc linting (TypeScript)    │ │
│  │  eslint-plugin-tsdoc - TSDoc rule (TypeScript)                 │ │
│  │  cosmiconfig      - Config file discovery (ConfigSearch)       │ │
│  │  workspace-tools  - Monorepo workspace detection               │ │
│  │  jsonc-parser     - JSONC parsing/surgical edits (CLI init)    │ │
│  │  @effect/cli      - CLI framework (savvy-lint commands)        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Actual)

```text
1. Consumer imports handler class (e.g., Biome, TypeScript)
2. Consumer uses static .handler, .create(options), or .fmtCommand(options)
3. Static factory returns lint-staged handler function with options captured
4. Consumer assigns handler(s) to glob key in config object
   - Single handler: config[glob] = handler
   - Sequential steps: config[glob] = [fmtCommand(), create()]
5. lint-staged matches staged files against glob patterns
6. lint-staged calls handler function(s) with matched filenames
   - For arrays: each step runs sequentially, staging between steps
7. Handler performs filtering:
   - Filter.exclude() removes unwanted files
   - Some handlers (TypeScript) do workspace-aware filtering
8. Handler performs processing:
   - Command-returning: return command strings for lint-staged to run
   - fmtCommand(): returns `savvy-lint fmt ...` CLI command
   - In-place processing: modify files directly and return []
   - TypeScript: programmatic ESLint + returns typecheck command
9. lint-staged executes returned commands and auto-stages file changes
```

### Handler Types

The handlers fall into four categories:

**Command-returning handlers:**

- Biome - returns `biome check --write ...`
- Markdown - returns `markdownlint-cli2 --fix ...`
- ShellScripts - returns `chmod` commands

**CLI format command handlers (fmtCommand pattern):**

- PackageJson.fmtCommand() - returns `savvy-lint fmt package-json <files>`
- PnpmWorkspace.fmtCommand() - returns `savvy-lint fmt pnpm-workspace`
- Yaml.fmtCommand() - returns `savvy-lint fmt yaml <files>`

**In-place processing handlers (create pattern):**

- PackageJson.create() - sorts via bundled sort-package-json, then returns Biome command
- Yaml.create() - formats via Prettier, validates via yaml-lint, returns `[]`
- PnpmWorkspace.create() - sorts/formats via bundled yaml package, returns `[]`

**Async/programmatic handlers:**

- TypeScript - runs bundled ESLint TSDoc linter programmatically, throws on
  errors, returns typecheck command

### Class Initialization

```typescript
// At import time
import { Biome, PackageJson, TypeScript, Yaml } from '@savvy-web/lint-staged';

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
  → Returns: (filenames: readonly string[]) => string | string[]
  → Captures options in closure
  → Auto-discovers biome command and config at handler invocation time

// fmtCommand pattern (PackageJson, PnpmWorkspace, Yaml)
PackageJson.fmtCommand()
  → Returns: (filenames: readonly string[]) => string | string[]
  → Returns `savvy-lint fmt package-json <files>` CLI command
  → lint-staged runs this command and auto-stages modifications

Yaml.fmtCommand({ exclude: ['generated/'] })
  → Returns: (filenames: readonly string[]) => string | string[]
  → Returns `savvy-lint fmt yaml <files>` CLI command

// TypeScript with workspace-aware TSDoc and runtime compiler detection
TypeScript.create({ skipTypecheck: false })
  → Returns: async (filenames: readonly string[]) => Promise<string[]>
  → Uses TsDocResolver to find public API files
  → Uses TsDocLinter (bundled ESLint) for validation
  → detectCompiler() checks for tsgo first, then tsc via Command.findTool()
  → Returns typecheck command (e.g., 'pnpm exec tsgo --noEmit')
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
 * Uses `readonly string[]` to match lint-staged's type signature.
 */
type LintStagedHandler = (filenames: readonly string[]) => string | string[] | Promise<string | string[]>;

/**
 * A single lint-staged command entry: a handler function, a string command,
 * or an array of strings.
 */
type LintStagedEntry = LintStagedHandler | string | string[];

/**
 * A lint-staged configuration object.
 * Maps glob patterns to handlers, commands, or arrays of sequential steps.
 *
 * When a value is an array of functions/strings, lint-staged runs each
 * element sequentially with proper staging between steps.
 */
type LintStagedConfig = Record<string, LintStagedEntry | LintStagedEntry[]>;

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
  /** Skip Biome formatting (sort only) */
  skipFormat?: boolean;
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
 *   // Or use array syntax for reliable staging
 *   [PackageJson.glob]: [PackageJson.fmtCommand(), Biome.create()],
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
  static fmtCommand(options?: PackageJsonOptions): LintStagedHandler;
}
```

**create() behavior:**

1. Sorts files in-place via bundled sort-package-json (unless `skipSort: true`)
2. Returns `biome check --write --max-diagnostics=none {files}` (unless `skipFormat: true`)

**fmtCommand() behavior:**

1. Returns `savvy-lint fmt package-json {files}` CLI command
2. lint-staged runs the command and auto-stages modifications
3. Used in `createConfig()` array syntax: `[PackageJson.fmtCommand(), Biome.create()]`

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
  static fmtCommand(): LintStagedHandler;
}
```

**create() behavior:**

1. Reads pnpm-workspace.yaml
2. Parses with bundled yaml package
3. Sorts content (unless `skipSort: true`)
4. Formats and writes back (unless both skip flags set)
5. **Returns `[]`** - no CLI commands needed

**fmtCommand() behavior:**

1. Checks if pnpm-workspace.yaml exists
2. Returns `savvy-lint fmt pnpm-workspace` CLI command
3. Used in `createConfig()` array syntax:
   `[PnpmWorkspace.fmtCommand(), Yaml.create({ skipFormat: true })]`

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

Formats YAML files with Prettier and validates with yaml-lint.

```typescript
/**
 * Options for the Yaml handler.
 */
interface YamlOptions extends BaseHandlerOptions {
  /** Path to yaml-lint config file (.yaml-lint.json) */
  config?: string;
  /** Skip YAML formatting */
  skipFormat?: boolean;
  /** Skip YAML validation */
  skipValidate?: boolean;
}

/**
 * Handler for YAML files.
 * Formats with bundled Prettier and validates with bundled yaml-lint.
 */
class Yaml {
  static readonly glob = '**/*.{yml,yaml}';
  static readonly defaultExcludes = ['pnpm-lock.yaml', 'pnpm-workspace.yaml'] as const;
  static readonly handler: LintStagedHandler;

  static findConfig(): string | undefined;     // Find yaml-lint config
  static loadConfig(filepath: string): string | undefined; // Load schema from config
  static isAvailable(): boolean;                // Always true (bundled)
  static formatFile(filepath: string): Promise<void>;      // Prettier format
  static validateFile(filepath: string, schema?: string): Promise<void>; // yaml-lint
  static create(options?: YamlOptions): LintStagedHandler;
  static fmtCommand(options?: YamlOptions): LintStagedHandler;
}
```

**create() behavior:**

1. Filters files using exclude patterns
2. Resolves yaml-lint config at create-time (from options, findConfig(), or none)
3. For each file:
   - Formats with Prettier (unless `skipFormat: true`)
   - Validates with yaml-lint (unless `skipValidate: true`)
4. **Returns `[]`** - no CLI commands needed

**fmtCommand() behavior:**

1. Filters files using exclude patterns
2. Returns `savvy-lint fmt yaml {files}` CLI command
3. Used in `createConfig()` array syntax:
   `[Yaml.fmtCommand(opts), Yaml.create({ ...opts, skipFormat: true })]`

**Config file discovery:**

- Uses `ConfigSearch.find('yamllint')` which searches `lib/configs/.yaml-lint.json`
- The `.yaml-lint.json` config file specifies the YAML schema (e.g., `DEFAULT_SCHEMA`)
- Schema is passed to yaml-lint for validation

**Implementation Note:**

Uses Prettier for YAML formatting and yaml-lint for validation. Both are
bundled dependencies. The `fmtCommand()` pattern ensures Prettier formatting
is done via CLI for reliable lint-staged staging.

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
 * Type checking uses runtime tool detection:
 * - Command.findTool('tsgo') first (native TypeScript)
 * - Command.findTool('tsc') fallback (standard TypeScript)
 * - Uses cached ToolSearchResult for command string
 */
class TypeScript {
  static readonly glob = '*.{ts,cts,mts,tsx}';
  static readonly defaultExcludes = [] as const;
  static readonly defaultTsdocExcludes = ['.test.', '.spec.', '__test__', '__tests__'] as const;
  static readonly handler: LintStagedHandler;

  static detectCompiler(_cwd?: string): 'tsgo' | 'tsc' | undefined;
  static isAvailable(): boolean;
  static getDefaultTypecheckCommand(): string;
  static clearCache(): void;
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
   - Lazy-load typecheck command to avoid throwing during import
   - Return typecheck command (auto-detected or custom)

**Compiler Detection:**

- `detectCompiler()` uses `Command.findTool()` to check runtime availability
- Checks for `tsgo` first (native TypeScript), falls back to `tsc`
- Caches the `ToolSearchResult` so `getDefaultTypecheckCommand()` can build
  the command string (e.g., `pnpm exec tsgo --noEmit`) without a separate
  package manager detection step
- `clearCache()` resets the cached result for testing or environment changes

**Key Components:**

- `TsDocResolver` - Finds workspaces, extracts exports, traces imports
- `TsDocLinter` - Programmatic ESLint with tsdoc/syntax rule
- `ImportGraph` - Traces import dependencies from entry points
- `EntryExtractor` - Parses package.json exports field

**Note:** No longer uses external ESLint CLI. All TSDoc validation is
programmatic using the ESLint Node.js API. Compiler detection uses runtime
tool availability rather than parsing package.json dependencies.

---

## Utility Classes

### Command Utility

Package manager detection, tool availability checking, and savvy-lint discovery.

```typescript
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

interface ToolSearchResult {
  available: boolean;
  command: string | undefined;       // e.g., 'biome' or 'pnpm exec biome'
  source: 'global' | PackageManager | undefined;
}

class Command {
  // Project root discovery (cached)
  static findRoot(cwd?: string): string;

  // Package manager detection (cached)
  static detectPackageManager(cwd?: string): PackageManager;
  static getExecPrefix(pm: PackageManager): string[];
  static clearCache(): void;

  // Tool availability
  static isAvailable(command: string): boolean;  // Global only
  static findTool(tool: string): ToolSearchResult;  // Global + PM
  static requireTool(tool: string, errorMessage?: string): string;

  // savvy-lint discovery
  static findSavvyLint(): string;

  // Command execution
  static exec(command: string): string;
  static execSilent(command: string): boolean;
}
```

**Project Root Discovery:**

- Uses `findProjectRoot()` from `workspace-tools` to locate the nearest
  directory containing a `package.json`
- Falls back to provided `cwd` (or `process.cwd()`) on error
- More reliable than `process.cwd()` in Husky hooks
- Caches result for performance

**Package Manager Detection:**

- Reads `packageManager` field from package.json (e.g., `pnpm@9.0.0`)
- Falls back to `npm` if not specified
- Caches result for performance

**Tool Search Order:**

1. Global command (in PATH)
2. Package manager exec (e.g., `pnpm exec biome`)

**savvy-lint Discovery (`findSavvyLint()`):**

1. Searches for `savvy-lint` via standard `findTool()` (global, then PM)
2. Falls back to `node {root}/dist/dev/bin/savvy-lint.js` for dogfooding
   scenarios where the package's own bin is not linked
3. Used by `fmtCommand()` methods on PackageJson, PnpmWorkspace, and Yaml

**Command Name Validation:**

- All command names are validated against `^[\w@/-]+$` pattern
- Prevents command injection by rejecting shell metacharacters

### Filter Utility

Pattern-based file filtering and shell escaping.

```typescript
class Filter {
  static exclude(filenames: readonly string[], patterns: readonly string[]): string[];
  static include(filenames: readonly string[], patterns: readonly string[]): string[];
  static apply(filenames: readonly string[], options: {
    include?: readonly string[];
    exclude?: readonly string[];
  }): string[];
  static shellEscape(filenames: readonly string[]): string;
}
```

All filter methods use `string.includes()` for pattern matching.

**shellEscape():**

- Wraps each path in single quotes and escapes embedded single quotes
- Prevents issues with paths containing spaces or special characters
- Used by `fmtCommand()` methods to safely pass file paths to CLI commands
- Returns space-separated string of escaped paths

### ConfigSearch Utility

Configuration file discovery using cosmiconfig.

```typescript
interface ConfigSearchResult {
  filepath: string | undefined;
  found: boolean;
}

interface ConfigSearchOptions {
  searchFrom?: string;
  stopDir?: string;
}

class ConfigSearch {
  static readonly libConfigDir = 'lib/configs';

  // Find config for known tools
  static find(
    tool: 'markdownlint' | 'biome' | 'eslint' | 'prettier' | 'yamllint',
    options?: ConfigSearchOptions,
  ): ConfigSearchResult;

  // Custom config search
  static findFile(moduleName: string, options?: {
    libConfigFiles?: string[];
    standardPlaces?: string[];
    searchFrom?: string;
    stopDir?: string;
  }): ConfigSearchResult;

  // Simple existence check
  static exists(filepath: string): boolean;
  static resolve(filename: string, fallback: string): string;
}
```

**Supported Tools:**

- `markdownlint` - `.markdownlint-cli2.jsonc`, `.markdownlint.json`, etc.
- `biome` - `biome.jsonc`, `biome.json`
- `eslint` - `eslint.config.ts`, `eslint.config.js`, `eslint.config.mjs`
- `prettier` - `.prettierrc`, `prettier.config.js`, etc.
- `yamllint` - `.yaml-lint.json`

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

  // Add custom handlers
  custom: {
    '*.css': (files) => `stylelint --fix ${files.join(' ')}`,
  },
});
```

**createConfig() array syntax (sequential execution):**

When both PackageJson and Biome are enabled, `createConfig()` uses lint-staged's
array syntax for reliable staging:

```typescript
// Generated by createConfig() internally:
{
  // PackageJson: sort via CLI command (auto-staged), then Biome format
  '**/package.json': [PackageJson.fmtCommand(opts), Biome.create(biomeOpts)],

  // PnpmWorkspace: sort/format via CLI (auto-staged), then validate only
  'pnpm-workspace.yaml': [PnpmWorkspace.fmtCommand(), Yaml.create({ skipFormat: true })],

  // Yaml: format via CLI command (auto-staged), then validate only
  '**/*.{yml,yaml}': [Yaml.fmtCommand(opts), Yaml.create({ ...opts, skipFormat: true })],
}
```

When handlers are used independently (e.g., `biome: false`), single handlers
are used instead of arrays.

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

## CLI Configuration Management

The `savvy-lint` CLI manages configuration files for consumers beyond just husky hooks.
The `init` and `check` commands handle markdownlint-cli2 configuration with preset-aware
behavior.

### markdownlint-cli2 Config Management

The `init` command manages a `.markdownlint-cli2.jsonc` config file at the project root.
Behavior varies by preset and file state:

**`writeMarkdownlintConfig` behavior matrix:**

| Condition | Action |
| :--- | :--- |
| File missing (any preset) | Write full template via `JSON.stringify(MARKDOWNLINT_TEMPLATE)` |
| File exists + silk preset + no `--force` | Surgical: always update `$schema` silently; warn if `config` differs |
| File exists + silk preset + `--force` | Overwrite entire file with fresh template |
| File exists + standard preset | Skip (not managed) |
| minimal preset | Skip entirely (no markdown tooling) |

**Surgical edits** use `jsonc-parser`'s `modify()` and `applyEdits()` functions to update
individual JSON properties without disturbing comments, formatting, or other fields. The
`$schema` field is always updated silently. The `config` rules object is compared using
`node:util` `isDeepStrictEqual` -- if it differs, a warning is emitted suggesting `--force`.

**Preset gating** uses the `presetIncludesMarkdown(preset)` helper, which returns `true`
for `standard` and `silk` presets (not `minimal`).

### markdownlint-cli2 Config Checking

The `check` command validates the existing `.markdownlint-cli2.jsonc` against template
values:

```typescript
function checkMarkdownlintConfig(content: string): {
  exists: true;
  schemaMatches: boolean;   // $schema === MARKDOWNLINT_SCHEMA
  configMatches: boolean;   // isDeepStrictEqual(config, MARKDOWNLINT_CONFIG)
  isUpToDate: boolean;      // both match
}
```

Results are integrated into:

- **Quiet mode** (`--quiet`): specific warnings for `$schema` and `config` mismatches
- **Full output**: shows per-field match status in the tool availability section
- **Overall status**: `hasMarkdownlintIssues` contributes to the `hasIssues` flag

### Template Codegen Pipeline

The markdownlint template data is generated at build time from the source JSONC config:

**Source of truth:** `lib/configs/.markdownlint-cli2.jsonc`

**Codegen script:** `scripts/generate-markdownlint-template.ts` (run with `bun`):

1. Reads the source JSONC file
2. Parses with `jsonc-parser` to extract `$schema` and `config`
3. Writes `src/cli/templates/markdownlint.gen.ts` with three exports:
   - `MARKDOWNLINT_TEMPLATE` -- full config object (`as const`)
   - `MARKDOWNLINT_SCHEMA` -- `$schema` URL string
   - `MARKDOWNLINT_CONFIG` -- `config` rules object

The generated file is committed to the repository (not gitignored). The npm script
chains Biome formatting after codegen:

```bash
bun scripts/generate-markdownlint-template.ts && biome check --write src/cli/templates/markdownlint.gen.ts
```

### Key Exports

From `src/cli/commands/init.ts`:

- `MARKDOWNLINT_CONFIG_PATH` -- path constant (`.markdownlint-cli2.jsonc`)
- `presetIncludesMarkdown(preset)` -- preset check helper (internal)

From `src/cli/templates/markdownlint.gen.ts`:

- `MARKDOWNLINT_TEMPLATE` -- full template object
- `MARKDOWNLINT_SCHEMA` -- schema URL
- `MARKDOWNLINT_CONFIG` -- config rules

---

## CLI Formatting Commands

The `savvy-lint fmt` subcommand provides file-modifying operations as CLI commands
so lint-staged can detect changes and auto-stage them. This solves the lint-staged v16
staging problem where handler function bodies that modify files in-place do not get
their changes committed.

### Architecture

The `fmt` command is built with `@effect/cli` and registered as a subcommand of the
root `savvy-lint` command alongside `init` and `check`:

```typescript
// src/cli/index.ts
const rootCommand = Command.make('savvy-lint').pipe(
  Command.withSubcommands([initCommand, checkCommand, fmtCommand]),
);
```

### Subcommands

**`savvy-lint fmt package-json <files...>`**

- Sorts package.json files using bundled `sort-package-json`
- Reads each file, sorts, writes back only if content changed
- Called by `PackageJson.fmtCommand()`

**`savvy-lint fmt pnpm-workspace`**

- Sorts and formats `pnpm-workspace.yaml`
- Uses `PnpmWorkspace.sortContent()` for sorting logic
- Formats with `yaml` package's `stringify()` using standard options
- Called by `PnpmWorkspace.fmtCommand()`

**`savvy-lint fmt yaml <files...>`**

- Formats YAML files using bundled Prettier
- Uses `Yaml.formatFile()` for each file
- Called by `Yaml.fmtCommand()`

### Discovery

Handlers find the `savvy-lint` binary using `Command.findSavvyLint()`:

1. Standard tool search via `Command.findTool('savvy-lint')` (global, then PM)
2. Fallback to `node {root}/dist/dev/bin/savvy-lint.js` for dogfooding

### Integration with Handlers

Each handler's `fmtCommand()` method returns a lint-staged handler function that:

1. Filters files using exclude patterns
2. Shell-escapes file paths via `Filter.shellEscape()`
3. Returns a `savvy-lint fmt <subcommand> <files>` command string
4. lint-staged runs the command, detects file changes, and auto-stages them

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

### Biome Config Export

The package exports an optional shareable Biome config at `./biome/silk.jsonc`. Consumers
can extend it in their own `biome.jsonc`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "extends": ["@savvy-web/lint-staged/biome/silk.jsonc"]
}
```

This is entirely optional -- consumers can use any Biome config they want. The source file
lives at `src/public/biome/silk.jsonc` and is exported via the package.json `exports` field:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./biome/silk.jsonc": "./src/public/silk.jsonc"
  }
}
```

The config includes opinionated Biome settings for formatting (tabs, 120-char line width),
linting (strict rules including import extensions, no unused variables, import type
separation), and JSON/CSS handling.

### External Tool Dependencies (Actual)

**Required (must be installed by consumer):**

- `biome` - JavaScript/TypeScript/JSON formatting (Biome handler)
- `markdownlint-cli2` - Markdown linting (Markdown handler)
- `typescript` or `@typescript/native-preview` - Type checking (TypeScript handler)

**Bundled as dependencies (no installation needed):**

- `yaml` - YAML parsing/formatting (PnpmWorkspace handler, fmt CLI)
- `sort-package-json` - Package.json sorting (PackageJson handler, fmt CLI)
- `prettier` - YAML formatting (Yaml handler, fmt CLI)
- `yaml-lint` - YAML validation (Yaml handler)
- `eslint` + `@typescript-eslint/parser` - Programmatic linting
- `eslint-plugin-tsdoc` - TSDoc syntax validation
- `cosmiconfig` - Configuration file discovery
- `workspace-tools` - Monorepo workspace detection, project root finding
- `jsonc-parser` - JSONC parsing and surgical edits (CLI init/check commands)
- `@effect/cli` - CLI framework for savvy-lint commands
- `effect` - Effect runtime (CLI dependency)

**No longer used:**

- ~~`yq`~~ - Replaced by bundled yaml package

---

## Build Pipeline

### Turbo Task Graph

The build pipeline uses Turborepo with a dependency chain that ensures generated code
is available before type checking and building:

```text
generate:templates → types:check → build:dev
                                  → build:prod
                   → vitest:unit (via build:dev)
```

### Task Definitions

**`generate:templates`**

- **Script:** `bun scripts/generate-markdownlint-template.ts && biome check --write src/cli/templates/markdownlint.gen.ts`
- **Inputs:** `lib/configs/.markdownlint-cli2.jsonc`, `scripts/generate-markdownlint-template.ts`
- **Outputs:** `src/cli/templates/*.gen.ts`
- **Cache:** Yes
- **Dependencies:** None (leaf task)

**`types:check`**

- **Script:** `tsgo --noEmit`
- **Dependencies:** `generate:templates` (must have generated template before type checking)
- **Inputs:** `*.ts`, `lib/**/*.ts`, `lib/**/*.mts`
- **Cache:** Yes

**`build:dev` / `build:prod`**

- **Script:** Rslib build with environment-specific config
- **Dependencies:** `types:check`
- **Outputs:** `dist/dev/**` / `dist/npm/**`
- **Cache:** Yes

**`vitest:unit`**

- **Script:** `vitest run --coverage`
- **Dependencies:** `build:dev`
- **Cache:** No (always runs fresh)

### Codegen Rationale

The codegen approach keeps `lib/configs/.markdownlint-cli2.jsonc` as the single source of
truth for markdownlint rules. This file is used directly by the project's own markdown
linting (`pnpm run lint:md`), and the codegen script extracts its data into TypeScript
constants for the CLI's init and check commands. This avoids runtime JSONC file reads and
ensures the CLI template always matches the project's own config.

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

### Completed (v0.2.x)

- [x] CLI `init` command manages `.markdownlint-cli2.jsonc` with preset-aware behavior
- [x] CLI `check` command validates markdownlint config against template
- [x] Codegen pipeline: source JSONC to generated TypeScript template
- [x] Turbo `generate:templates` task with proper dependency chain
- [x] `jsonc-parser` dependency for runtime JSONC parsing and surgical edits
- [x] Shareable Biome config export at `./biome/silk.jsonc`
- [x] npm publishing with provenance (GitHub Packages + npmjs.org)

### Completed (v0.3.x)

- [x] CLI `fmt` subcommand with `package-json`, `pnpm-workspace`, and `yaml` subcommands
- [x] `fmtCommand()` static methods on PackageJson, PnpmWorkspace, and Yaml handlers
- [x] `Command.findSavvyLint()` utility for locating the savvy-lint binary
- [x] `createConfig()` restructured with lint-staged array syntax for sequential execution
- [x] `LintStagedEntry` type for array syntax support
- [x] `skipFormat` option added to `PackageJsonOptions`
- [x] `LintStagedConfig` updated to support `LintStagedEntry | LintStagedEntry[]`
- [x] `ConfigSearch` updated with `yamllint` tool configuration
- [x] `lib/configs/.yaml-lint.json` config file for yaml-lint schema
- [x] TypeScript handler refactored for runtime tool detection via `Command.findTool()`
- [x] Yaml handler refactored to use Prettier for formatting and yaml-lint for validation
- [x] `Filter.shellEscape()` utility for safe shell command construction
- [x] `Command.findRoot()` utility for reliable project root discovery

### Future Enhancements

**Short-term:**

- [ ] Integration tests with actual lint-staged execution
- [ ] README with comprehensive usage examples

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

**Document Status:** Current - Synced with implementation (v0.3.x, fix/lint-order branch)

**Implementation Notes:**

- Package is fully implemented and dogfooding itself
- All handlers, utilities, and presets are functional
- Bundled dependencies reduce external requirements
- Workspace-aware TSDoc resolution is more sophisticated than originally planned
- CLI init/check commands manage markdownlint config with surgical JSONC edits
- CLI fmt commands solve lint-staged v16 staging problem for in-place modifications
- `fmtCommand()` pattern separates formatting (CLI, auto-staged) from validation (handler)
- `createConfig()` uses lint-staged array syntax for sequential format-then-validate steps
- TypeScript compiler detection uses runtime tool availability (not package.json parsing)
- Yaml handler uses Prettier for formatting and yaml-lint for validation
- Codegen pipeline generates TypeScript templates from source JSONC configs
- Shareable Biome config available for consumers via package exports

**Maintenance:**

- Update this document when adding new handlers or utilities
- Keep utility class signatures in sync with source code
- Update "Implementation Status" checklist as features complete
- Regenerate templates after modifying `lib/configs/.markdownlint-cli2.jsonc`
- When adding new `fmtCommand()` handlers, update the `fmt.ts` CLI command
