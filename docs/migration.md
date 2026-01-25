# Migration Guide

How to migrate from raw lint-staged configurations to @savvy-web/lint-staged.

## Before and After

### Basic Migration

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
  '**/*.yaml': ['prettier --write', 'yaml-lint'],
};
```

**After:**

```typescript
// lint-staged.config.ts
import { PackageJson, Biome, Markdown, Yaml } from '@savvy-web/lint-staged';

export default {
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,
  [Yaml.glob]: Yaml.handler,
};
```

### Using Presets

**Before (many handlers):**

```javascript
export default {
  '**/package.json': /* ... */,
  '*.{js,ts,json}': /* ... */,
  '**/*.md': /* ... */,
  '**/*.yaml': /* ... */,
  'pnpm-workspace.yaml': /* ... */,
  '**/*.sh': /* ... */,
};
```

**After:**

```typescript
import { Preset } from '@savvy-web/lint-staged';

export default Preset.standard();
```

## Handler Mappings

### Package.json Handler

**Before:**

```javascript
'**/package.json': (filenames) => {
  const filtered = filenames.filter(f => !f.includes('dist/'));
  return [
    `sort-package-json ${filtered.join(' ')}`,
    `biome check --write ${filtered.join(' ')}`,
  ];
},
```

**After:**

```typescript
import { PackageJson } from '@savvy-web/lint-staged';

[PackageJson.glob]: PackageJson.handler,

// Or with custom excludes
[PackageJson.glob]: PackageJson.create({
  exclude: ['dist/', 'custom/'],
}),
```

### Biome Handler

**Before:**

```javascript
'*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc}': (filenames) => {
  const filtered = filenames.filter(f =>
    !f.includes('package-lock.json') && !f.includes('__fixtures__')
  );
  return `biome check --write ${filtered.join(' ')}`;
},
```

**After:**

```typescript
import { Biome } from '@savvy-web/lint-staged';

[Biome.glob]: Biome.handler,

// Or with custom config
[Biome.glob]: Biome.create({
  exclude: ['vendor/'],
  config: './biome.json',
}),
```

### Markdown Handler

**Before:**

```javascript
'**/*.{md,mdx}': 'markdownlint-cli2 --config .markdownlint.json --fix',
```

**After:**

```typescript
import { Markdown } from '@savvy-web/lint-staged';

[Markdown.glob]: Markdown.handler,

// Or with custom config
[Markdown.glob]: Markdown.create({
  config: './.markdownlint.json',
}),
```

### YAML Handler

**Before:**

```javascript
'**/*.{yml,yaml}': (filenames) => {
  const filtered = filenames.filter(f =>
    !f.includes('pnpm-lock.yaml') && !f.includes('pnpm-workspace.yaml')
  );
  return [
    `prettier --write ${filtered.join(' ')}`,
    `yaml-lint ${filtered.join(' ')}`,
  ];
},
```

**After:**

```typescript
import { Yaml } from '@savvy-web/lint-staged';

[Yaml.glob]: Yaml.handler,
```

**Note:** The new handler uses the bundled `yaml` package instead of prettier
and yaml-lint. Formatting and validation happen in-place without spawning
external processes.

### pnpm-workspace.yaml Handler

**Before:**

```javascript
'pnpm-workspace.yaml': [
  "yq -i '.packages |= sort' pnpm-workspace.yaml",
  'prettier --write pnpm-workspace.yaml',
  'yaml-lint pnpm-workspace.yaml',
],
```

**After:**

```typescript
import { PnpmWorkspace } from '@savvy-web/lint-staged';

[PnpmWorkspace.glob]: PnpmWorkspace.handler,
```

**Note:** The new handler uses the bundled `yaml` package with custom sorting
logic. No need for yq, prettier, or yaml-lint.

### Shell Scripts Handler

**Before:**

```javascript
'**/*.sh': (filenames) => {
  const filtered = filenames.filter(f => !f.includes('.claude/scripts/'));
  return filtered.map(f => `chmod -x ${f}`);
},
```

**After:**

```typescript
import { ShellScripts } from '@savvy-web/lint-staged';

[ShellScripts.glob]: ShellScripts.handler,

// Or to make executable instead
[ShellScripts.glob]: ShellScripts.create({
  makeExecutable: true,
}),
```

### TypeScript Handler

**Before:**

```javascript
'*.{ts,tsx}': (filenames) => {
  const sourceFiles = filenames.filter(f =>
    f.includes('src/') && !f.includes('.test.')
  );
  return [
    sourceFiles.length > 0 ? `eslint --config eslint.config.ts ${sourceFiles.join(' ')}` : [],
    'tsc --noEmit',
  ].flat();
},
```

**After:**

```typescript
import { TypeScript } from '@savvy-web/lint-staged';

[TypeScript.glob]: TypeScript.handler,

// Or with options
[TypeScript.glob]: TypeScript.create({
  skipTypecheck: true,  // Only TSDoc validation
  excludeTsdoc: ['.test.', '.spec.'],
}),
```

**Note:** The new handler uses intelligent workspace detection and import graph
analysis to determine which files need TSDoc linting. It automatically finds
public API files from package exports.

## Keeping Custom Handlers

You can mix @savvy-web/lint-staged handlers with your own:

```typescript
import { PackageJson, Biome, Markdown } from '@savvy-web/lint-staged';

export default {
  // Use library handlers
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,

  // Keep custom handlers
  '*.css': (files) => `stylelint --fix ${files.join(' ')}`,
  '*.sql': 'sqlfluff fix',
};
```

Or use `createConfig` with custom handlers:

```typescript
import { createConfig } from '@savvy-web/lint-staged';

export default createConfig({
  // Built-in handlers
  biome: { exclude: ['vendor/'] },

  // Disable handlers you don't need
  shellScripts: false,
  yaml: false,

  // Add custom handlers
  custom: {
    '*.css': (files) => `stylelint --fix ${files.join(' ')}`,
    '*.sql': 'sqlfluff fix',
  },
});
```

## Gradual Migration

You can migrate incrementally by replacing one handler at a time:

```javascript
// Step 1: Replace just the Biome handler
import { Biome } from '@savvy-web/lint-staged';

export default {
  [Biome.glob]: Biome.handler,  // New
  '**/*.md': 'markdownlint-cli2 --fix',  // Keep existing
  '**/*.yaml': ['prettier --write', 'yaml-lint'],  // Keep existing
};
```

```javascript
// Step 2: Replace more handlers
import { Biome, Markdown, Yaml } from '@savvy-web/lint-staged';

export default {
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,  // New
  [Yaml.glob]: Yaml.handler,  // New
};
```

```javascript
// Step 3: Use a preset
import { Preset } from '@savvy-web/lint-staged';

export default Preset.standard();
```

## Troubleshooting

### Handler Not Running

Check that the glob pattern matches your files:

```typescript
import { Biome } from '@savvy-web/lint-staged';

console.log(Biome.glob);
// *.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}
```

### Files Being Excluded

Check the default excludes:

```typescript
import { Biome } from '@savvy-web/lint-staged';

console.log(Biome.defaultExcludes);
// ['package-lock.json', '__fixtures__']
```

To include excluded files, override the excludes:

```typescript
[Biome.glob]: Biome.create({
  exclude: [],  // Remove all default excludes
}),
```

### Different Behavior from Previous Config

The new handlers may behave slightly differently:

- **Yaml/PnpmWorkspace:** Uses bundled `yaml` package instead of prettier
- **PackageJson:** Sorts files in-place before returning Biome command
- **TypeScript:** Uses workspace-aware TSDoc detection instead of simple patterns

If you need the exact previous behavior, you can keep your custom handlers
alongside the library ones.
