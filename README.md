# @savvy-web/lint-staged

Composable, configurable lint-staged handlers for pre-commit hooks. Build your
lint-staged configuration using reusable, well-tested handlers for common
formatting and linting tools.

## Features

- **Composable handlers** - Mix and match handlers for different file types
- **Zero-config defaults** - Sensible defaults that work out of the box
- **Fully configurable** - Customize exclude patterns, tool options, and behavior
- **TypeScript-first** - Full type definitions with TSDoc documentation
- **Preset configurations** - Start with minimal, standard, or full presets

## Installation

```bash
npm install @savvy-web/lint-staged
# or
pnpm add @savvy-web/lint-staged
# or
yarn add @savvy-web/lint-staged
```

### Peer Dependencies

The following tools must be installed in your project:

```bash
# Required
pnpm add -D lint-staged @biomejs/biome

# Optional (for Markdown handler)
pnpm add -D markdownlint-cli2
```

## Quick Start

Create a `lint-staged.config.js` (or `.ts`) file in your project root:

```typescript
import { PackageJson, Biome, Markdown, Yaml } from '@savvy-web/lint-staged';

export default {
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,
  [Yaml.glob]: Yaml.handler,
};
```

Or use a preset for quick setup:

```typescript
import { Preset } from '@savvy-web/lint-staged';

// Standard preset includes formatting + linting
export default Preset.standard();
```

## Handlers

Each handler is a class with static properties and methods:

| Property | Description |
| -------- | ----------- |
| `glob` | Recommended glob pattern for matching files |
| `defaultExcludes` | Default patterns excluded from processing |
| `handler` | Pre-configured handler ready to use |
| `create(options)` | Factory method for custom configuration |

### PackageJson

Sorts package.json fields with `sort-package-json` and formats with Biome.

```typescript
import { PackageJson } from '@savvy-web/lint-staged';

export default {
  // Use defaults
  [PackageJson.glob]: PackageJson.handler,

  // Or customize
  [PackageJson.glob]: PackageJson.create({
    exclude: ['packages/legacy/package.json'],
    skipSort: true, // Skip sorting, only format
    biomeConfig: './biome.json',
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['dist/package.json', '__fixtures__']` | Patterns to exclude |
| `skipSort` | `boolean` | `false` | Skip sort-package-json |
| `biomeConfig` | `string` | - | Path to Biome config |

### Biome

Formats and lints JavaScript, TypeScript, and JSON files with Biome.

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
| `config` | `string` | - | Path to Biome config |
| `flags` | `string[]` | - | Additional CLI flags |

**Glob:** `*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}`

### Markdown

Lints and auto-fixes Markdown files with markdownlint-cli2.

```typescript
import { Markdown } from '@savvy-web/lint-staged';

export default {
  [Markdown.glob]: Markdown.create({
    config: './config/.markdownlint.jsonc',
    noFix: true, // Lint only, no auto-fix
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `[]` | Patterns to exclude |
| `config` | `string` | `'./lib/configs/.markdownlint-cli2.jsonc'` | Config file path |
| `noFix` | `boolean` | `false` | Disable auto-fix |

**Glob:** `**/*.{md,mdx}`

### Yaml

Formats YAML files with Prettier and validates with yaml-lint.

```typescript
import { Yaml } from '@savvy-web/lint-staged';

export default {
  [Yaml.glob]: Yaml.create({
    exclude: ['generated/'],
    skipPrettier: false,
    skipLint: false,
    prettierConfig: './.prettierrc',
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['pnpm-lock.yaml', 'pnpm-workspace.yaml']` | Patterns to exclude |
| `skipPrettier` | `boolean` | `false` | Skip Prettier formatting |
| `skipLint` | `boolean` | `false` | Skip yaml-lint validation |
| `prettierConfig` | `string` | - | Path to Prettier config |

**Glob:** `**/*.{yml,yaml}`

### PnpmWorkspace

Sorts and formats pnpm-workspace.yaml. Optionally uses `yq` for sorting if
installed.

```typescript
import { PnpmWorkspace } from '@savvy-web/lint-staged';

export default {
  [PnpmWorkspace.glob]: PnpmWorkspace.create({
    skipYqSort: true, // Skip yq even if installed
    skipPrettier: false,
    skipLint: false,
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `skipYqSort` | `boolean` | `false` | Skip yq sorting |
| `skipPrettier` | `boolean` | `false` | Skip Prettier formatting |
| `skipLint` | `boolean` | `false` | Skip yaml-lint validation |

**Glob:** `pnpm-workspace.yaml`

### ShellScripts

Manages executable permissions on shell scripts. Removes executable bit by
default (security best practice).

```typescript
import { ShellScripts } from '@savvy-web/lint-staged';

export default {
  [ShellScripts.glob]: ShellScripts.create({
    exclude: ['.claude/scripts/', 'bin/'],
    makeExecutable: false, // Remove -x (default)
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['.claude/scripts/']` | Patterns to exclude |
| `makeExecutable` | `boolean` | `false` | Set +x instead of -x |

**Glob:** `**/*.sh`

### TypeScript

Validates TSDoc syntax with ESLint and runs type checking.

```typescript
import { TypeScript } from '@savvy-web/lint-staged';

export default {
  [TypeScript.glob]: TypeScript.create({
    skipTsdoc: false,
    skipTypecheck: true, // Only validate TSDoc
    sourcePatterns: ['src/', 'lib/'],
    excludeTsdoc: ['.test.', '__test__'],
    eslintConfig: './eslint.config.ts',
    typecheckCommand: 'tsc --noEmit',
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `[]` | Patterns to exclude |
| `excludeTsdoc` | `string[]` | `['.test.', '__test__']` | Exclude from TSDoc linting |
| `sourcePatterns` | `string[]` | `['src/']` | Source file patterns for TSDoc |
| `skipTsdoc` | `boolean` | `false` | Skip TSDoc validation |
| `skipTypecheck` | `boolean` | `false` | Skip type checking |
| `eslintConfig` | `string` | `'./lib/configs/eslint.config.ts'` | ESLint config path |
| `typecheckCommand` | `string` | `'pnpm exec tsgo --noEmit'` | Typecheck command |

**Glob:** `*.{ts,cts,mts,tsx}`

### DesignDocs

Validates design documentation structure and updates timestamps. Requires the
design documentation system to be set up.

```typescript
import { DesignDocs } from '@savvy-web/lint-staged';

export default {
  [DesignDocs.glob]: DesignDocs.create({
    validateScript: './scripts/validate-doc.sh',
    timestampScript: './scripts/update-timestamp.sh',
    skipTimestamp: false,
  }),
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `exclude` | `string[]` | `['design.config.json']` | Patterns to exclude |
| `validateScript` | `string` | `'.claude/skills/design-validate/scripts/validate-design-doc.sh'` | Validation script |
| `timestampScript` | `string` | `'.claude/skills/design-update/scripts/update-timestamp.sh'` | Timestamp script |
| `skipTimestamp` | `boolean` | `false` | Skip timestamp updates |

**Glob:** `.claude/design/**/*.md`

## Configuration API

### createConfig()

Generate a complete lint-staged configuration with all handlers:

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  // Customize handlers
  packageJson: { skipSort: true },
  biome: { exclude: ['vendor/'] },
  markdown: { config: './custom.jsonc' },

  // Disable handlers
  shellScripts: false,
  designDocs: false,

  // Add custom handlers
  custom: {
    '*.css': (files) => `stylelint --fix ${files.join(' ')}`,
  },
});
```

### Presets

Use presets for common configurations:

```typescript
import { Preset } from '@savvy-web/lint-staged';

// Minimal: PackageJson + Biome only
export default Preset.minimal();

// Standard: + Markdown, Yaml, PnpmWorkspace, ShellScripts
export default Preset.standard();

// Full: + TypeScript, DesignDocs
export default Preset.full();

// Extend any preset
export default Preset.standard({
  biome: { exclude: ['legacy/'] },
  typescript: {}, // Enable TypeScript in standard preset
  custom: {
    '*.css': (files) => `stylelint ${files.join(' ')}`,
  },
});

// Dynamic preset selection
const presetName = process.env.LINT_PRESET || 'standard';
export default Preset.get(presetName);
```

**Preset comparison:**

| Handler | minimal | standard | full |
| ------- | :-----: | :------: | :--: |
| PackageJson | Yes | Yes | Yes |
| Biome | Yes | Yes | Yes |
| Markdown | - | Yes | Yes |
| Yaml | - | Yes | Yes |
| PnpmWorkspace | - | Yes | Yes |
| ShellScripts | - | Yes | Yes |
| TypeScript | - | - | Yes |
| DesignDocs | - | - | Yes |

## Utility Classes

### Command

Utilities for checking command availability:

```typescript
import { Command } from '@savvy-web/lint-staged';

if (Command.isAvailable('yq')) {
  console.log('yq is installed');
}

const version = Command.exec('node --version');
console.log(version); // 'v20.10.0'
```

| Method | Description |
| ------ | ----------- |
| `isAvailable(cmd)` | Check if command exists in PATH |
| `exec(cmd)` | Execute command and return output |
| `execSilent(cmd)` | Execute silently, return success boolean |

### Filter

Utilities for filtering file lists:

```typescript
import { Filter } from '@savvy-web/lint-staged';

const files = ['src/index.ts', 'dist/index.js', 'src/index.test.ts'];

// Exclude patterns
const filtered = Filter.exclude(files, ['dist/', '.test.']);
// Result: ['src/index.ts']

// Include patterns
const sourceOnly = Filter.include(files, ['src/']);
// Result: ['src/index.ts', 'src/index.test.ts']

// Combined filtering
const result = Filter.apply(files, {
  include: ['src/'],
  exclude: ['.test.'],
});
// Result: ['src/index.ts']
```

## Migration Guide

### From raw lint-staged config

**Before:**

```javascript
// lint-staged.config.js
export default {
  '**/package.json': (filenames) => {
    const filtered = filenames.filter(f => !f.includes('dist/'));
    return [
      `sort-package-json ${filtered.join(' ')}`,
      `biome check --write ${filtered.join(' ')}`,
    ];
  },
  '*.{js,ts,json}': (filenames) => {
    const filtered = filenames.filter(f => !f.includes('__fixtures__'));
    return `biome check --write ${filtered.join(' ')}`;
  },
  '**/*.md': 'markdownlint-cli2 --fix',
};
```

**After:**

```typescript
import { PackageJson, Biome, Markdown } from '@savvy-web/lint-staged';

export default {
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,
};
```

### From inline functions to createConfig

**Before:**

```typescript
import { PackageJson, Biome, Markdown, Yaml } from '@savvy-web/lint-staged';

export default {
  [PackageJson.glob]: PackageJson.create({ skipSort: true }),
  [Biome.glob]: Biome.create({ exclude: ['vendor/'] }),
  [Markdown.glob]: Markdown.handler,
  [Yaml.glob]: Yaml.handler,
};
```

**After:**

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  packageJson: { skipSort: true },
  biome: { exclude: ['vendor/'] },
});
```

## TypeScript Support

This package is written in TypeScript and exports full type definitions:

```typescript
import type {
  LintStagedHandler,
  LintStagedConfig,
  BiomeOptions,
  PackageJsonOptions,
  MarkdownOptions,
  YamlOptions,
  TypeScriptOptions,
  CreateConfigOptions,
  PresetType,
} from '@savvy-web/lint-staged';
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

See [LICENSE](./LICENSE) for details.
