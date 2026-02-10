# Handler Configuration

Detailed documentation for each lint-staged handler.

## Handler Pattern

Every handler follows the same pattern:

```typescript
import { HandlerName } from '@savvy-web/lint-staged';

export default {
  // Use the default handler
  [HandlerName.glob]: HandlerName.handler,

  // Or customize with options
  [HandlerName.glob]: HandlerName.create({
    exclude: ['some-pattern/'],
    // handler-specific options...
  }),
};
```

## PackageJson

Sorts package.json fields with `sort-package-json` and formats with Biome.

**Glob:** `**/package.json`

**Default Excludes:** `['dist/package.json', '__fixtures__']`

```typescript
import { PackageJson } from '@savvy-web/lint-staged';

export default {
  [PackageJson.glob]: PackageJson.create({
    exclude: ['packages/legacy/package.json'],
    skipSort: true,        // Skip sorting, only format
    biomeConfig: './biome.json',
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['dist/package.json', '__fixtures__']` | Patterns to exclude |
| `skipSort` | `boolean` | `false` | Skip sort-package-json |
| `skipFormat` | `boolean` | `false` | Skip Biome formatting (sort only) |
| `biomeConfig` | `string` | - | Path to Biome config |

**Processing:**

1. Reads each file, sorts with bundled `sort-package-json`, writes back
2. Returns Biome command to format the files (unless `skipFormat: true`)

**Static Methods:**

- `PackageJson.fmtCommand(options?)` - Create a handler that returns a CLI command for lint-staged array syntax

## Biome

Formats and lints JavaScript, TypeScript, and JSON files with Biome.

**Glob:** `*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}`

**Default Excludes:** `['package-lock.json', '__fixtures__']`

```typescript
import { Biome } from '@savvy-web/lint-staged';

export default {
  [Biome.glob]: Biome.create({
    exclude: ['vendor/', 'generated/'],
    config: './biome.json',
    flags: ['--max-diagnostics=none'],
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['package-lock.json', '__fixtures__']` | Patterns to exclude |
| `config` | `string` | Auto-discovered | Path to Biome config |
| `flags` | `string[]` | - | Additional CLI flags |

**Static Methods:**

- `Biome.findConfig()` - Find the Biome config file
- `Biome.isAvailable()` - Check if Biome is installed

## Markdown

Lints and auto-fixes Markdown files with markdownlint-cli2.

**Glob:** `**/*.{md,mdx}`

**Default Excludes:** `[]`

```typescript
import { Markdown } from '@savvy-web/lint-staged';

export default {
  [Markdown.glob]: Markdown.create({
    config: './config/.markdownlint.jsonc',
    noFix: true,  // Lint only, no auto-fix
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `[]` | Patterns to exclude |
| `config` | `string` | Auto-discovered | Config file path |
| `noFix` | `boolean` | `false` | Disable auto-fix |

**Static Methods:**

- `Markdown.findConfig()` - Find the markdownlint config file
- `Markdown.isAvailable()` - Check if markdownlint-cli2 is installed

## Yaml

Formats YAML files with Prettier and validates with yaml-lint, both as bundled
dependencies.

**Glob:** `**/*.{yml,yaml}`

**Default Excludes:** `['pnpm-lock.yaml', 'pnpm-workspace.yaml']`

```typescript
import { Yaml } from '@savvy-web/lint-staged';

export default {
  [Yaml.glob]: Yaml.create({
    exclude: ['generated/'],
    config: './lib/configs/.yaml-lint.json',
    skipFormat: false,
    skipValidate: false,
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['pnpm-lock.yaml', 'pnpm-workspace.yaml']` | Patterns to exclude |
| `config` | `string` | Auto-discovered | Path to yaml-lint config file |
| `skipFormat` | `boolean` | `false` | Skip YAML formatting |
| `skipValidate` | `boolean` | `false` | Skip YAML validation |

**Processing:**

1. Formats each file in-place using Prettier with the `yaml` parser
2. Validates each file using yaml-lint (throws on invalid YAML)
3. Returns empty array (all processing done in-place)

**Static Methods:**

- `Yaml.formatFile(filepath)` - Format a single YAML file with Prettier
- `Yaml.validateFile(filepath, schema?)` - Validate a single YAML file with yaml-lint
- `Yaml.findConfig()` - Find the yaml-lint config file
- `Yaml.loadConfig(filepath)` - Load the yaml-lint schema from a config file
- `Yaml.isAvailable()` - Always returns `true` (bundled dependency)
- `Yaml.fmtCommand(options?)` - Create a handler that returns a CLI command for lint-staged array syntax

## PnpmWorkspace

Sorts, formats, and validates pnpm-workspace.yaml using the bundled `yaml` library.

**Glob:** `pnpm-workspace.yaml`

**Default Excludes:** `[]`

```typescript
import { PnpmWorkspace } from '@savvy-web/lint-staged';

export default {
  [PnpmWorkspace.glob]: PnpmWorkspace.create({
    skipSort: true,    // Skip sorting packages and keys
    skipFormat: false, // Skip formatting
    skipLint: false,   // Skip validation
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `skipSort` | `boolean` | `false` | Skip sorting packages and keys |
| `skipFormat` | `boolean` | `false` | Skip YAML formatting |
| `skipLint` | `boolean` | `false` | Skip YAML validation |

**Sorting Rules:**

- `packages` key comes first
- Other keys sorted alphabetically
- `packages` array sorted alphabetically
- `onlyBuiltDependencies` array sorted alphabetically
- `publicHoistPattern` array sorted alphabetically

**Static Methods:**

- `PnpmWorkspace.sortContent(content)` - Sort workspace content object
- `PnpmWorkspace.fmtCommand()` - Create a handler that returns a CLI command for lint-staged array syntax

## ShellScripts

Manages executable permissions on shell scripts.

**Glob:** `**/*.sh`

**Default Excludes:** `['.claude/scripts/']`

```typescript
import { ShellScripts } from '@savvy-web/lint-staged';

export default {
  [ShellScripts.glob]: ShellScripts.create({
    exclude: ['.claude/scripts/', 'bin/'],
    makeExecutable: false,  // Remove -x (default)
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['.claude/scripts/']` | Patterns to exclude |
| `makeExecutable` | `boolean` | `false` | Set +x instead of -x |

**Commands:**

- `chmod -x {file}` (default - removes executable bit)
- `chmod +x {file}` (if `makeExecutable: true`)

## TypeScript

Validates TSDoc syntax with bundled ESLint and runs type checking.

**Glob:** `*.{ts,cts,mts,tsx}`

**Default Excludes:** `[]`

**Default TSDoc Excludes:** `['.test.', '.spec.', '__test__', '__tests__']`

```typescript
import { TypeScript } from '@savvy-web/lint-staged';

export default {
  [TypeScript.glob]: TypeScript.create({
    skipTsdoc: false,
    skipTypecheck: true,      // Only validate TSDoc
    excludeTsdoc: ['.test.', '__test__'],
    typecheckCommand: 'tsc --noEmit',
    rootDir: process.cwd(),
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `[]` | Patterns to exclude |
| `excludeTsdoc` | `string[]` | `['.test.', '.spec.', '__test__', '__tests__']` | Exclude from TSDoc linting |
| `skipTsdoc` | `boolean` | `false` | Skip TSDoc validation |
| `skipTypecheck` | `boolean` | `false` | Skip type checking |
| `typecheckCommand` | `string` | Auto-detected | Typecheck command |
| `rootDir` | `string` | `process.cwd()` | Root for workspace detection |

**TSDoc Linting Process:**

1. Uses `TsDocResolver` to detect workspaces via `workspace-tools`
2. Checks for `tsdoc.json` at workspace or repo root level
3. For enabled workspaces, extracts entry points from `package.json` exports
4. Uses `ImportGraph` to trace imports and find all public API files
5. Runs bundled `TsDocLinter` (ESLint + eslint-plugin-tsdoc) on matched files
6. Throws if any TSDoc errors found

**Static Methods:**

- `TypeScript.detectCompiler()` - Returns `'tsgo'` or `'tsc'` based on dependencies
- `TypeScript.isAvailable()` - Check if a TypeScript compiler is installed
- `TypeScript.getDefaultTypecheckCommand()` - Get the default typecheck command
- `TypeScript.isTsdocAvailable()` - Check if TSDoc linting can be performed
