# Configuration API

Higher-level APIs for generating lint-staged configurations.

## Presets

Pre-configured handler sets for common use cases.

### Available Presets

```typescript
import { Preset } from '@savvy-web/lint-staged';

// Minimal - just formatting
export default Preset.minimal();

// Standard - formatting + linting (recommended)
export default Preset.standard();

// Full - everything including TypeScript
export default Preset.full();
```

**Preset Comparison:**

| Handler | minimal | standard | full |
| ------- | :-----: | :------: | :--: |
| PackageJson | Yes | Yes | Yes |
| Biome | Yes | Yes | Yes |
| Markdown | - | Yes | Yes |
| Yaml | - | Yes | Yes |
| PnpmWorkspace | - | Yes | Yes |
| ShellScripts | - | Yes | Yes |
| TypeScript | - | - | Yes |

### Extending Presets

Pass options to customize any handler:

```typescript
import { Preset } from '@savvy-web/lint-staged';

export default Preset.standard({
  // Customize included handlers
  biome: { exclude: ['vendor/', 'legacy/'] },
  markdown: { noFix: true },

  // Enable handlers not in the preset
  typescript: { skipTypecheck: true },  // Enable with options

  // Disable handlers from the preset
  shellScripts: false,
  yaml: false,

  // Add custom handlers
  custom: {
    '*.css': (files) => `stylelint --fix ${files.join(' ')}`,
    '*.sql': (files) => `sqlfluff fix ${files.join(' ')}`,
  },
});
```

### Dynamic Preset Selection

```typescript
import { Preset, type PresetType } from '@savvy-web/lint-staged';

// Select preset based on environment
const presetName = (process.env.LINT_PRESET || 'standard') as PresetType;
export default Preset.get(presetName);

// With options
export default Preset.get(presetName, {
  biome: { exclude: ['dist/'] },
});
```

## createConfig

Generate a complete configuration with fine-grained control.

### Basic Usage

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  // All handlers enabled by default (except TypeScript)
});
```

### Customizing Handlers

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  // Pass options to customize
  packageJson: { skipSort: true },
  biome: { exclude: ['vendor/'] },
  markdown: { config: './custom.jsonc' },
  yaml: { skipValidate: true },
  pnpmWorkspace: { skipSort: true },
  shellScripts: { makeExecutable: true },

  // Enable optional handlers
  typescript: { skipTypecheck: true },

  // Disable handlers
  shellScripts: false,
  yaml: false,
});
```

### Adding Custom Handlers

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  // Built-in handlers
  biome: { exclude: ['vendor/'] },

  // Custom handlers
  custom: {
    // String command
    '*.css': 'stylelint --fix',

    // Function handler
    '*.sql': (files) => `sqlfluff fix ${files.join(' ')}`,

    // Async handler
    '*.prisma': async (files) => {
      return `prisma format --schema ${files[0]}`;
    },

    // Multiple commands
    '*.graphql': (files) => [
      `graphql-codegen --config codegen.yml`,
      `prettier --write ${files.join(' ')}`,
    ],
  },
});
```

### TypeScript Options

```typescript
import type { CreateConfigOptions } from '@savvy-web/lint-staged';

const options: CreateConfigOptions = {
  packageJson: {
    exclude: ['packages/legacy/package.json'],
    skipSort: false,
    biomeConfig: './biome.json',
  },
  biome: {
    exclude: ['vendor/', 'generated/'],
    config: './biome.json',
    flags: ['--max-diagnostics=50'],
  },
  markdown: {
    exclude: ['CHANGELOG.md'],
    config: './.markdownlint.jsonc',
    noFix: false,
  },
  yaml: {
    exclude: ['fixtures/'],
    skipFormat: false,
    skipValidate: false,
  },
  pnpmWorkspace: {
    skipSort: false,
    skipFormat: false,
    skipLint: false,
  },
  shellScripts: {
    exclude: ['bin/', '.claude/scripts/'],
    makeExecutable: false,
  },
  typescript: {
    exclude: [],
    excludeTsdoc: ['.test.', '.spec.', '__test__'],
    skipTsdoc: false,
    skipTypecheck: false,
    typecheckCommand: 'tsc --noEmit',
    rootDir: process.cwd(),
  },
  custom: {
    '*.css': (files) => `stylelint ${files.join(' ')}`,
  },
};

export default createConfig(options);
```

## Individual Handler Composition

For maximum control, compose handlers directly:

```typescript
import {
  PackageJson,
  Biome,
  Markdown,
  Yaml,
  PnpmWorkspace,
  ShellScripts,
  TypeScript,
} from '@savvy-web/lint-staged';

export default {
  // Use default handlers
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,

  // Customize with create()
  [Markdown.glob]: Markdown.create({
    config: './custom-markdownlint.json',
  }),

  // Use custom globs
  'src/**/*.yaml': Yaml.create({
    exclude: ['fixtures/'],
  }),

  // Combine with custom handlers
  '*.css': (files) => `stylelint ${files.join(' ')}`,

  // Conditional handlers
  ...(process.env.STRICT_MODE && {
    [TypeScript.glob]: TypeScript.create({
      skipTypecheck: false,
      skipTsdoc: false,
    }),
  }),
};
```

## Environment-Based Configuration

```typescript
import { Preset, createConfig } from '@savvy-web/lint-staged';

const isCI = process.env.CI === 'true';
const isDev = process.env.NODE_ENV === 'development';

// Option 1: Different presets
export default isCI
  ? Preset.full()
  : Preset.standard();

// Option 2: Conditional options
export default createConfig({
  biome: {
    exclude: isDev ? ['src/experimental/'] : [],
  },
  typescript: isCI ? {} : false,  // Only in CI
  markdown: {
    noFix: isCI,  // No auto-fix in CI
  },
});

// Option 3: Override handlers
export default {
  ...Preset.standard(),
  ...(isCI && {
    '*.ts': TypeScript.create({ skipTsdoc: false }),
  }),
};
```
