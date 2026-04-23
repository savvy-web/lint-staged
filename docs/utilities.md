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

## ConfigDiscovery

Config file discovery via `@savvy-web/silk-effects/config`. Re-exported from
this package for convenience.

```typescript
import { ConfigDiscovery, ConfigDiscoveryLive } from '@savvy-web/lint-staged';
import { Effect } from 'effect';
import { NodeContext } from '@effect/platform-node';

const program = Effect.gen(function* () {
  const discovery = yield* ConfigDiscovery;

  // Find highest-priority config location
  const result = yield* discovery.find('biome.json');
  if (result) {
    console.log(`Found at: ${result.path} (source: ${result.source})`);
  }

  // Find all config locations in priority order
  const all = yield* discovery.findAll('biome.json');
  for (const loc of all) {
    console.log(`${loc.source}: ${loc.path}`);
  }
});

await Effect.runPromise(
  program.pipe(
    Effect.provide(ConfigDiscoveryLive),
    Effect.provide(NodeContext.layer),
  ),
);
```

**Search Order:**

1. `lib/configs/{name}` (package-provided shared configs)
2. `{cwd}/{name}` (workspace root override)

| Method | Description |
| ------ | ----------- |
| `find(name, options?)` | Find highest-priority config location |
| `findAll(name, options?)` | Find all config locations in priority order |

## Workspace

Workspace-aware discovery utilities for anchoring config and file lookups to
the workspace root.

```typescript
import {
  getWorkspaceRoot,
  getWorkspacePackages,
  getWorkspacePackagePaths,
  isWorkspacePackagePath,
  resetWorkspaceCache,
} from '@savvy-web/lint-staged';

// Get workspace root (or null if not in a workspace)
const root = getWorkspaceRoot();

// Get all leaf workspace packages (excludes root)
const packages = getWorkspacePackages();

// Get just the paths of leaf workspaces
const paths = getWorkspacePackagePaths();

// Check if a file is at a workspace or leaf root
const isWorkspaceFile = isWorkspacePackagePath('/path/to/package.json');

// Clear cached results (useful for testing)
resetWorkspaceCache();
```

| Function | Description |
| -------- | ----------- |
| `getWorkspaceRoot()` | Get workspace root directory, or null |
| `getWorkspacePackages()` | Get all leaf workspace packages |
| `getWorkspacePackagePaths()` | Get paths of leaf workspaces |
| `isWorkspacePackagePath(file)` | Check if file is at a workspace root |
| `resetWorkspaceCache()` | Clear cached workspace detection |
