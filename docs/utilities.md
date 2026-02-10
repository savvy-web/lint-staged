# Utility Classes

Advanced utility classes for building custom handlers and extending functionality.

## Command

Utilities for checking command availability, package manager detection, and
project root resolution.

```typescript
import { Command } from '@savvy-web/lint-staged';

// Find the project root (reliable in Husky hooks)
const root = Command.findRoot();

// Check if a command exists
if (Command.isAvailable('biome')) {
  console.log('Biome is installed');
}

// Detect package manager
const pm = Command.detectPackageManager();
// Returns: 'pnpm' | 'npm' | 'yarn' | 'bun'

// Get exec prefix for running tools
const prefix = Command.getExecPrefix('pnpm');
// Returns: ['pnpm', 'exec']

// Find a tool (global or via package manager)
const result = Command.findTool('biome');
// Returns: { available: true, command: 'biome', source: 'global' }
//      or: { available: true, command: 'pnpm exec biome', source: 'pnpm' }

// Find the savvy-lint CLI (with dogfooding fallback)
const savvyLint = Command.findSavvyLint();
// Returns: 'savvy-lint' or 'pnpm exec savvy-lint' or fallback to dev build
```

| Method | Description |
| ------ | ----------- |
| `findRoot(cwd?)` | Find project root using workspace-tools |
| `isAvailable(cmd)` | Check if command exists in PATH |
| `detectPackageManager(cwd?)` | Detect package manager from packageManager field |
| `getExecPrefix(pm)` | Get exec command prefix for a package manager |
| `findTool(name)` | Find a tool globally or via package manager |
| `requireTool(name, msg?)` | Find a tool or throw if not available |
| `findSavvyLint()` | Find the savvy-lint CLI command |
| `exec(cmd)` | Execute a command and return trimmed output |
| `execSilent(cmd)` | Execute a command silently, return success boolean |
| `clearCache()` | Clear cached package manager and project root |

## Filter

Utilities for filtering file lists based on include/exclude patterns.

```typescript
import { Filter } from '@savvy-web/lint-staged';

const files = ['src/index.ts', 'dist/index.js', 'src/index.test.ts'];

// Exclude patterns (uses string.includes())
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

| Method | Description |
| ------ | ----------- |
| `exclude(files, patterns)` | Remove files matching any pattern |
| `include(files, patterns)` | Keep only files matching any pattern |
| `apply(files, options)` | Apply both include and exclude filters |

## ConfigSearch

Discovery for configuration files using cosmiconfig.

```typescript
import { ConfigSearch } from '@savvy-web/lint-staged';

// Find a config file
const result = ConfigSearch.find('biome');
// Searches: lib/configs/ first, then standard locations

if (result.filepath) {
  console.log(`Found config at: ${result.filepath}`);
  console.log(`Config content:`, result.config);
}

// Find yaml-lint config
const yamlConfig = ConfigSearch.find('yamllint');

// Search with custom options
const custom = ConfigSearch.find('eslint', {
  searchFrom: './packages/app',
  stopDir: process.cwd(),
});
```

**Search Order:**

1. `lib/configs/` directory (package-specific configs)
2. Standard cosmiconfig locations (project root)

| Method | Description |
| ------ | ----------- |
| `find(tool, options?)` | Find config for a tool |

## EntryExtractor

Extract TypeScript entry points from package.json exports field.

```typescript
import { EntryExtractor } from '@savvy-web/lint-staged';

const extractor = new EntryExtractor({
  rootDir: process.cwd(),
});

const result = extractor.extract({
  exports: {
    '.': './src/index.ts',
    './utils': './src/utils/index.ts',
  },
});

console.log(result.entries);
// { '.': '/absolute/path/src/index.ts', './utils': '/absolute/path/src/utils/index.ts' }

console.log(result.unresolved);
// Any exports that couldn't be resolved
```

**Supported Export Formats:**

- String exports: `"./src/index.ts"`
- Conditional exports: `{ "import": "./src/index.ts", "require": "./src/index.cjs" }`
- Nested conditions: `{ "types": "...", "import": "...", "default": "..." }`

| Property | Description |
| -------- | ----------- |
| `entries` | Map of export path to resolved absolute file path |
| `unresolved` | Array of export paths that couldn't be resolved |

## ImportGraph

Trace imports from entry points to find all reachable source files.

```typescript
import { ImportGraph } from '@savvy-web/lint-staged';

const graph = new ImportGraph({
  rootDir: process.cwd(),
  excludePatterns: ['.test.', '__test__'],
});

// Trace from specific entry files
const result = graph.traceFromEntries([
  '/path/to/src/index.ts',
  '/path/to/src/utils/index.ts',
]);

console.log(result.files);
// All TypeScript files reachable from entries

console.log(result.errors);
// Any resolution errors encountered

// Or trace directly from package.json exports
const fromPackage = graph.traceFromPackageExports('/path/to/package.json');
```

**Resolution:**

- Uses TypeScript compiler API for accurate module resolution
- Respects tsconfig.json path mappings
- Filters out node_modules, .d.ts files, and test files

| Method | Description |
| ------ | ----------- |
| `traceFromEntries(paths)` | Trace imports from entry file paths |
| `traceFromPackageExports(pkgPath)` | Trace from package.json exports field |

## TsDocResolver

Resolve files that need TSDoc linting based on workspace configuration.

```typescript
import { TsDocResolver } from '@savvy-web/lint-staged';

const resolver = new TsDocResolver({
  rootDir: process.cwd(),
  excludePatterns: ['.test.', '.spec.'],
});

// Get all workspaces enabled for TSDoc
const result = resolver.resolve();

console.log(result.isMonorepo);
// true if multiple workspaces detected

console.log(result.repoTsdocConfig);
// Path to repo-level tsdoc.json if present

for (const workspace of result.workspaces) {
  console.log(`${workspace.name}: ${workspace.files.length} files to lint`);
  console.log(`  Config: ${workspace.tsdocConfigPath}`);
  console.log(`  Errors: ${workspace.errors.join(', ')}`);
}

// Filter staged files to only those needing TSDoc linting
const groups = resolver.filterStagedFiles([
  '/path/to/src/index.ts',
  '/path/to/src/utils.ts',
]);

for (const group of groups) {
  console.log(`Lint with config: ${group.tsdocConfigPath}`);
  console.log(`Files: ${group.files.join(', ')}`);
}
```

**Workspace Detection:**

- Uses `workspace-tools` to detect npm/pnpm/yarn workspaces
- A workspace is enabled for TSDoc if:
  - It has a `tsdoc.json` file, OR
  - The repo root has a `tsdoc.json` file
- Only workspaces with `exports` in package.json are processed

| Method | Description |
| ------ | ----------- |
| `resolve()` | Get all workspaces and their TSDoc-enabled files |
| `filterStagedFiles(files)` | Filter staged files to those needing linting |
| `needsLinting(file)` | Check if a specific file needs TSDoc linting |
| `getTsDocConfig(file)` | Get tsdoc.json path for a file |
| `findWorkspace(file)` | Find the workspace containing a file |

## TsDocLinter

Programmatic TSDoc linting using bundled ESLint.

```typescript
import { TsDocLinter } from '@savvy-web/lint-staged';

const linter = new TsDocLinter({
  ignorePatterns: ['**/*.test.ts', '**/__test__/**'],
});

// Lint files and get results
const results = await linter.lintFiles([
  '/path/to/src/index.ts',
  '/path/to/src/utils.ts',
]);

for (const result of results) {
  if (result.errorCount > 0) {
    console.log(`${result.filePath}:`);
    for (const msg of result.messages) {
      console.log(`  ${msg.line}:${msg.column} ${msg.message}`);
    }
  }
}

// Or lint and throw on errors
await linter.lintFilesAndThrow(files);

// Format results for display
const output = TsDocLinter.formatResults(results);
console.log(output);

// Check if there are errors
if (TsDocLinter.hasErrors(results)) {
  process.exit(1);
}
```

**Bundled Configuration:**

The linter includes a pre-configured ESLint setup with:

- `@typescript-eslint/parser` for TypeScript parsing
- `eslint-plugin-tsdoc` with `tsdoc/syntax` rule enabled
- Default ignores for node_modules, dist, coverage

| Method | Description |
| ------ | ----------- |
| `lintFiles(paths)` | Lint files and return results |
| `lintFilesAndThrow(paths)` | Lint files and throw on errors |
| `formatResults(results)` | Format results as human-readable string |
| `hasErrors(results)` | Check if results contain errors |
