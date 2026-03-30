# Silk-Effects Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `BiomeSchema.ts`, managed section logic in `init.ts`, and `ConfigSearch.ts` with `@savvy-web/silk-effects` modules.

**Architecture:** Three silk-effects services (`BiomeSchemaSync`, `ManagedSection`, `ConfigDiscovery`) replace internal implementations. The Effect services are wired into the CLI layer; synchronous handler code inlines the simple `existsSync` checks that `ConfigDiscovery` codifies.

**Tech Stack:** Effect, `@savvy-web/silk-effects`, `@effect/platform`, Vitest

---

## Task 1: Add silk-effects Dependency and Wire CLI Layers

**Files:**

- Modify: `package.json`
- Modify: `src/cli/index.ts:1-39`

- [ ] **Step 1: Add `@savvy-web/silk-effects` dependency**

Add to `dependencies` in `package.json`:

```json
"@savvy-web/silk-effects": "catalog:silk",
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: Clean install, lockfile updated.

- [ ] **Step 3: Wire silk-effects layers into CLI**

Replace `src/cli/index.ts` with:

```typescript
/**
 * CLI entry point using `@effect/cli`.
 *
 * @remarks
 * This module provides the CLI application for managing lint-staged
 * configuration. It uses Effect for functional error handling and
 * `@effect/cli` for command parsing.
 *
 * @internal
 */
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { BiomeSchemaSyncLive } from "@savvy-web/silk-effects/biome";
import { ManagedSectionLive } from "@savvy-web/silk-effects/hooks";
import { Effect, Layer } from "effect";
import { checkCommand, fmtCommand, initCommand } from "./commands/index.js";

/** Silk-effects service layers (all require FileSystem from NodeContext). */
const SilkLive = Layer.mergeAll(ManagedSectionLive, BiomeSchemaSyncLive);

/** Combined application layer: platform + silk services. */
const AppLayer = Layer.provideMerge(SilkLive, NodeContext.layer);

/** Root command for the CLI with all subcommands. */
const rootCommand = Command.make("savvy-lint").pipe(Command.withSubcommands([initCommand, checkCommand, fmtCommand]));

/** CLI application runner. */
const cli = Command.run(rootCommand, {
 name: "savvy-lint",
 version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

/**
 * Run the CLI application.
 *
 * @remarks
 * Entry point for the CLI binary. Parses command-line arguments
 * and executes the appropriate subcommand.
 *
 * @internal
 */
export function runCli(): void {
 const main = Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(AppLayer));
 NodeRuntime.runMain(main);
}

export { checkCommand, fmtCommand, initCommand, rootCommand };
```

- [ ] **Step 4: Verify build still compiles**

Run: `pnpm run typecheck`
Expected: PASS (new imports resolve, no type errors).

- [ ] **Step 5: Verify tests still pass**

Run: `pnpm vitest run`
Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/cli/index.ts
git commit -m "feat: add silk-effects dependency and wire CLI layers"
```

---

## Task 2: Replace BiomeSchema with BiomeSchemaSync

**Files:**

- Modify: `src/cli/commands/init.ts:13,306-331`
- Modify: `src/cli/commands/check.ts:14,173-201`
- Delete: `src/utils/BiomeSchema.ts`
- Delete: `src/utils/BiomeSchema.test.ts`

- [ ] **Step 1: Replace BiomeSchema imports and `syncBiomeSchemas` in init.ts**

In `src/cli/commands/init.ts`, remove line 13:

```typescript
import { SCHEMA_URL_PREFIX, findBiomeConfigs, getExpectedSchemaUrl } from "../../utils/BiomeSchema.js";
```

Add this import:

```typescript
import { BiomeSchemaSync } from "@savvy-web/silk-effects/biome";
```

Replace the `syncBiomeSchemas` function (lines 306-331) with:

```typescript
/**
 * Find and sync biome config `$schema` URLs to match the peer dependency version.
 *
 * @returns Effect that syncs biome schemas and logs results
 */
function syncBiomeSchemas() {
 return Effect.gen(function* () {
  const version = process.env.__BIOME_PEER_VERSION__;
  if (!version) return;

  const syncer = yield* BiomeSchemaSync;
  const result = yield* syncer.sync(version);

  for (const configPath of result.current) {
   yield* Effect.log(`${CHECK_MARK} ${configPath}: biome $schema up-to-date`);
  }
  for (const configPath of result.updated) {
   yield* Effect.log(`${CHECK_MARK} Updated $schema in ${configPath}`);
  }
 });
}
```

Update the call site at line 469 from `yield* syncBiomeSchemas(fs)` to `yield* syncBiomeSchemas()`.

- [ ] **Step 2: Replace BiomeSchema imports and `checkBiomeSchemas` in check.ts**

In `src/cli/commands/check.ts`, remove line 14:

```typescript
import { SCHEMA_URL_PREFIX, findBiomeConfigs, getExpectedSchemaUrl } from "../../utils/BiomeSchema.js";
```

Add this import:

```typescript
import { BiomeSchemaSync } from "@savvy-web/silk-effects/biome";
```

Replace the `checkBiomeSchemas` function (lines 173-201) with:

```typescript
/**
 * Check biome config `$schema` URLs against the expected peer dependency version.
 *
 * @returns Object with warnings and per-config status
 */
function checkBiomeSchemas() {
 return Effect.gen(function* () {
  const version = process.env.__BIOME_PEER_VERSION__;
  const statuses: { path: string; matches: boolean }[] = [];

  if (!version) return { statuses, warnings: [] as string[] };

  const syncer = yield* BiomeSchemaSync;
  const result = yield* syncer.check(version);
  const warnings: string[] = [];

  for (const configPath of result.current) {
   statuses.push({ path: configPath, matches: true });
  }

  for (const configPath of result.updated) {
   statuses.push({ path: configPath, matches: false });
   warnings.push(`${WARNING}  ${configPath}: biome $schema is outdated.\n   Run 'savvy-lint init' to update it.`);
  }

  return { statuses, warnings };
 });
}
```

Update the call site at line 284 from `yield* checkBiomeSchemas(fs)` to `yield* checkBiomeSchemas()`.

- [ ] **Step 3: Delete old BiomeSchema files**

Delete `src/utils/BiomeSchema.ts` and `src/utils/BiomeSchema.test.ts`.

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Verify tests pass**

Run: `pnpm vitest run`
Expected: All tests pass (BiomeSchema tests removed, everything else green).

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/init.ts src/cli/commands/check.ts
git rm src/utils/BiomeSchema.ts src/utils/BiomeSchema.test.ts
git commit -m "refactor: replace BiomeSchema with silk-effects BiomeSchemaSync"
```

---

## Task 3: Replace Managed Section Logic with ManagedSection Service

**Files:**

- Modify: `src/cli/commands/init.ts:44-208,371-405,489-498`
- Modify: `src/cli/commands/check.ts:16-25,97-149,229-254,263-281`

- [ ] **Step 1: Rewrite init.ts managed section logic**

In `src/cli/commands/init.ts`:

Add import:

```typescript
import { ManagedSection } from "@savvy-web/silk-effects/hooks";
```

Remove these constants and functions (lines 43-208):

- `BEGIN_MARKER` (line 44)
- `END_MARKER` (line 47)
- `updateManagedSectionWithContent` (lines 147-158)
- `extractManagedSection` (lines 166-190)
- `generateFullHookContentFromManaged` (lines 199-208)

Keep `generateManagedContent` (lines 78-119) and `generateShellScriptsManagedContent` (lines 126-138) — these produce the content that goes inside managed sections.

Add this constant:

```typescript
/** Tool name embedded in managed section markers. */
const TOOL_NAME = "SAVVY-LINT";
```

Replace `writeHook` (lines 371-405) with:

```typescript
/**
 * Write a hook file with create/update/force logic.
 *
 * @param fs - FileSystem service
 * @param section - ManagedSection service
 * @param hookPath - Path to the hook file
 * @param managedContent - The managed content (without markers)
 * @param comment - Header comment for new hook files
 * @param force - Whether to overwrite the entire file
 * @returns Effect that writes the hook
 */
function writeHook(
 fs: FileSystem.FileSystem,
 section: Context.Tag.Service<typeof ManagedSection>,
 hookPath: string,
 managedContent: string,
 comment: string,
 force: boolean,
) {
 return Effect.gen(function* () {
  const hookExists = yield* fs.exists(hookPath);
  const header = `#!/usr/bin/env sh\n# ${comment}\n# Custom hooks can go above or below the managed section\n`;

  if (hookExists && !force) {
   const isManaged = yield* section.isManaged(hookPath, TOOL_NAME);
   yield* section.write(hookPath, TOOL_NAME, `\n${managedContent}\n`);
   yield* makeExecutable(hookPath);

   if (isManaged) {
    yield* Effect.log(`${CHECK_MARK} Updated managed section in ${hookPath}`);
   } else {
    yield* Effect.log(`${CHECK_MARK} Added managed section to ${hookPath}`);
   }
  } else {
   if (!hookExists) {
    yield* fs.makeDirectory(".husky", { recursive: true });
   }
   yield* fs.writeFileString(hookPath, header);
   yield* section.write(hookPath, TOOL_NAME, `\n${managedContent}\n`);
   yield* makeExecutable(hookPath);

   if (force && hookExists) {
    yield* Effect.log(`${CHECK_MARK} Replaced ${hookPath} (--force)`);
   } else {
    yield* Effect.log(`${CHECK_MARK} Created ${hookPath}`);
   }
  }
 });
}
```

Add the `Context` import to the effect import line:

```typescript
import { Context, Effect } from "effect";
```

Update the `initCommand` body to obtain the `ManagedSection` service and pass it to `writeHook`:

Inside the `Effect.gen` at the top (after `const fs = yield* FileSystem.FileSystem;`), add:

```typescript
const section = yield* ManagedSection;
```

Update the three `writeHook` calls to pass `section` as the second argument:

```typescript
// Pre-commit hook
yield* writeHook(
 fs,
 section,
 HUSKY_HOOK_PATH,
 generateManagedContent(config),
 "Pre-commit hook with savvy-lint managed section",
 force,
);

// Post-checkout hook
yield* writeHook(
 fs,
 section,
 POST_CHECKOUT_HOOK_PATH,
 shellContent,
 "Post-checkout hook with savvy-lint managed section",
 force,
);

// Post-merge hook
yield* writeHook(
 fs,
 section,
 POST_MERGE_HOOK_PATH,
 shellContent,
 "Post-merge hook with savvy-lint managed section",
 force,
);
```

Update the exports block at the bottom of init.ts. Remove `BEGIN_MARKER`, `END_MARKER`, `extractManagedSection`, `generateManagedContent`, `generateShellScriptsManagedContent`. Keep only:

```typescript
export { MARKDOWNLINT_CONFIG_PATH, POST_CHECKOUT_HOOK_PATH, POST_MERGE_HOOK_PATH };
```

- [ ] **Step 2: Rewrite check.ts managed section logic**

In `src/cli/commands/check.ts`:

Add import:

```typescript
import { ManagedSection } from "@savvy-web/silk-effects/hooks";
```

Update the imports from `./init.js` (lines 16-25). Remove `BEGIN_MARKER`, `END_MARKER`, `extractManagedSection`, `generateManagedContent`, `generateShellScriptsManagedContent`. Keep:

```typescript
import { MARKDOWNLINT_CONFIG_PATH, POST_CHECKOUT_HOOK_PATH, POST_MERGE_HOOK_PATH } from "./init.js";
```

Add this constant:

```typescript
/** Tool name embedded in managed section markers. */
const TOOL_NAME = "SAVVY-LINT";
```

Add these two local functions to generate expected content (they were previously imported from init.ts but are small enough to duplicate for check's comparison needs):

```typescript
/**
 * Generate the expected managed content for the pre-commit hook.
 *
 * @param configPath - Path to the lint-staged config file
 * @returns The expected managed content (without markers)
 */
function generateExpectedPreCommitContent(configPath: string): string {
 return `# DO NOT EDIT between these markers - managed by savvy-lint
# Skip in CI environment
if ! { [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; }; then

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

# Run lint-staged with the detected package manager
PM=$(detect_pm)
case "$PM" in
  pnpm) pnpm exec lint-staged --config "$ROOT/${configPath}" ;;
  yarn) yarn exec lint-staged --config "$ROOT/${configPath}" ;;
  bun)  bunx lint-staged --config "$ROOT/${configPath}" ;;
  *)    npx --no -- lint-staged --config "$ROOT/${configPath}" ;;
esac

fi`;
}

/**
 * Generate the expected managed content for shell script hooks.
 *
 * @returns The expected managed content (without markers)
 */
function generateExpectedShellScriptsContent(): string {
 return `# DO NOT EDIT between these markers - managed by savvy-lint
if ! { [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; }; then

# Configure git to ignore executable bit changes
# This ensures hook scripts can be made executable locally without git tracking the change
git config core.fileMode false

# Ensure all shell scripts tracked by git are executable
git ls-files -z '*.sh' | xargs -0 -r chmod +x 2>/dev/null || true

fi`;
}
```

Replace `checkHookManagedSection` (lines 97-119) with:

```typescript
/**
 * Check if a hook's managed section is up-to-date against expected content.
 *
 * @param section - ManagedSection service
 * @param hookPath - Path to the hook file
 * @param expectedManagedContent - The expected managed content (without markers)
 * @returns Object with status information
 */
function checkHookManagedSection(
 section: Context.Tag.Service<typeof ManagedSection>,
 hookPath: string,
 expectedManagedContent: string,
) {
 return Effect.gen(function* () {
  const result = yield* section.read(hookPath, TOOL_NAME);

  if (result === null) {
   return { found: false, isUpToDate: false, needsUpdate: false };
  }

  const normalizedExisting = result.managed.trim().replace(/\s+/g, " ");
  const normalizedExpected = expectedManagedContent.trim().replace(/\s+/g, " ");
  const isUpToDate = normalizedExisting === normalizedExpected;

  return { found: true, isUpToDate, needsUpdate: !isUpToDate };
 });
}
```

Replace `checkManagedSectionStatus` (lines 127-149) with:

```typescript
/**
 * Check if the pre-commit managed section is up-to-date.
 *
 * @param section - ManagedSection service
 * @param hookPath - Path to the hook file
 * @returns Object with isUpToDate flag and any differences
 */
function checkManagedSectionStatus(section: Context.Tag.Service<typeof ManagedSection>, hookPath: string) {
 return Effect.gen(function* () {
  const result = yield* section.read(hookPath, TOOL_NAME);

  if (result === null) {
   return { isUpToDate: false, configPath: null as string | null, needsUpdate: false, found: false };
  }

  const configPath = extractConfigPathFromManaged(result.managed);

  if (!configPath) {
   return { isUpToDate: false, configPath: null as string | null, needsUpdate: true, found: true };
  }

  const expectedContent = generateExpectedPreCommitContent(configPath);

  const normalizedExisting = result.managed.trim().replace(/\s+/g, " ");
  const normalizedExpected = expectedContent.trim().replace(/\s+/g, " ");
  const isUpToDate = normalizedExisting === normalizedExpected;

  return { isUpToDate, configPath: configPath as string | null, needsUpdate: !isUpToDate, found: true };
 });
}
```

Add `Context` to the effect import:

```typescript
import { Context, Effect } from "effect";
```

In the `checkCommand` body, add at the top (after `const fs = yield* FileSystem.FileSystem;`):

```typescript
const section = yield* ManagedSection;
```

Replace the managed section checking block (lines 229-254). Remove the manual file reading and extractManagedSection calls. Replace with:

```typescript
// Check managed section status
let managedStatus: { isUpToDate: boolean; configPath: string | null; needsUpdate: boolean; found: boolean } = {
 isUpToDate: false,
 configPath: null,
 needsUpdate: false,
 found: false,
};

if (hasHuskyHook) {
 managedStatus = yield* checkManagedSectionStatus(section, HUSKY_HOOK_PATH);

 if (managedStatus.found && managedStatus.needsUpdate) {
  warnings.push(
   `${WARNING}  Your ${HUSKY_HOOK_PATH} managed section is outdated.\n   Run 'savvy-lint init' to update it (preserves your custom hooks).`,
  );
 } else if (!managedStatus.found) {
  warnings.push(
   `${WARNING}  Your ${HUSKY_HOOK_PATH} does not have a savvy-lint managed section.\n   Run 'savvy-lint init' to add it.`,
  );
 }
} else {
 warnings.push(`${WARNING}  No husky pre-commit hook found.\n   Run 'savvy-lint init' to create it.`);
}
```

Replace the shell hook checking block (lines 265-281) with:

```typescript
// Check shell script hooks (post-checkout, post-merge)
const shellHookPaths = [POST_CHECKOUT_HOOK_PATH, POST_MERGE_HOOK_PATH] as const;
const shellHookStatuses: { path: string; found: boolean; isUpToDate: boolean; needsUpdate: boolean }[] = [];

for (const hookPath of shellHookPaths) {
 const hookExists = yield* fs.exists(hookPath);
 if (hookExists) {
  const status = yield* checkHookManagedSection(section, hookPath, generateExpectedShellScriptsContent());
  shellHookStatuses.push({ path: hookPath, ...status });

  if (status.found && status.needsUpdate) {
   warnings.push(
    `${WARNING}  Your ${hookPath} managed section is outdated.\n   Run 'savvy-lint init' to update it (preserves your custom hooks).`,
   );
  }
 }
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 4: Verify tests pass**

Run: `pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/init.ts src/cli/commands/check.ts
git commit -m "refactor: replace managed section logic with silk-effects ManagedSection"
```

---

## Task 4: Replace ConfigSearch in Handlers

**Files:**

- Modify: `src/handlers/Biome.ts:9,98-101`
- Modify: `src/handlers/Markdown.ts:9,97-100`
- Modify: `src/handlers/Yaml.ts:12,66-69`
- Delete: `src/utils/ConfigSearch.ts`

- [ ] **Step 1: Replace ConfigSearch in Biome handler**

In `src/handlers/Biome.ts`:

Remove:

```typescript
import { ConfigSearch } from "../utils/ConfigSearch.js";
```

Add:

```typescript
import { existsSync } from "node:fs";
```

Replace `findConfig` (lines 98-101) with:

```typescript
 /**
  * Find the Biome config file.
  *
  * Searches in order:
  * 1. `lib/configs/` directory
  * 2. Standard locations (repo root)
  *
  * @returns The config file path, or undefined if not found
  */
 static findConfig(): string | undefined {
  for (const name of ["biome.jsonc", "biome.json"]) {
   const libPath = `lib/configs/${name}`;
   if (existsSync(libPath)) return libPath;
   if (existsSync(name)) return name;
  }
  return undefined;
 }
```

- [ ] **Step 2: Replace ConfigSearch in Markdown handler**

In `src/handlers/Markdown.ts`:

Remove:

```typescript
import { ConfigSearch } from "../utils/ConfigSearch.js";
```

Add:

```typescript
import { existsSync } from "node:fs";
```

Replace `findConfig` (lines 97-100) with:

```typescript
 /**
  * Find the markdownlint config file.
  *
  * Searches in order:
  * 1. `lib/configs/` directory
  * 2. Standard locations (repo root)
  *
  * @returns The config file path, or undefined if not found
  */
 static findConfig(): string | undefined {
  const filenames = [
   ".markdownlint-cli2.jsonc",
   ".markdownlint-cli2.json",
   ".markdownlint-cli2.yaml",
   ".markdownlint-cli2.cjs",
   ".markdownlint.jsonc",
   ".markdownlint.json",
   ".markdownlint.yaml",
  ];
  for (const name of filenames) {
   const libPath = `lib/configs/${name}`;
   if (existsSync(libPath)) return libPath;
   if (existsSync(name)) return name;
  }
  return undefined;
 }
```

- [ ] **Step 3: Replace ConfigSearch in Yaml handler**

In `src/handlers/Yaml.ts`:

Remove:

```typescript
import { ConfigSearch } from "../utils/ConfigSearch.js";
```

Add:

```typescript
import { existsSync } from "node:fs";
```

Replace `findConfig` (lines 66-69) with:

```typescript
 /**
  * Find the yaml-lint config file.
  *
  * Searches in order:
  * 1. `lib/configs/` directory
  * 2. Standard locations (repo root)
  *
  * @returns The config file path, or undefined if not found
  */
 static findConfig(): string | undefined {
  const libPath = "lib/configs/.yaml-lint.json";
  if (existsSync(libPath)) return libPath;
  if (existsSync(".yaml-lint.json")) return ".yaml-lint.json";
  return undefined;
 }
```

- [ ] **Step 4: Delete ConfigSearch.ts**

Delete `src/utils/ConfigSearch.ts`.

- [ ] **Step 5: Verify typecheck passes**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 6: Verify tests pass**

Run: `pnpm vitest run`
Expected: Most tests pass. ConfigSearch tests in `index.test.ts` will fail (addressed in Task 5).

- [ ] **Step 7: Commit**

```bash
git add src/handlers/Biome.ts src/handlers/Markdown.ts src/handlers/Yaml.ts
git rm src/utils/ConfigSearch.ts
git commit -m "refactor: replace ConfigSearch with inline discovery in handlers"
```

---

## Task 5: Update Public API, Tests, and Clean Up Dependencies

**Files:**

- Modify: `src/index.ts:59-60`
- Modify: `src/index.test.ts:603-628`
- Modify: `package.json` (remove `cosmiconfig` dependency)

- [ ] **Step 1: Update public API exports in index.ts**

In `src/index.ts`, remove lines 59-60:

```typescript
export type { ConfigSearchOptions, ConfigSearchResult } from "./utils/ConfigSearch.js";
export { ConfigSearch } from "./utils/ConfigSearch.js";
```

Add re-exports from silk-effects:

```typescript
// Config discovery (from silk-effects)
export { ConfigDiscovery, ConfigDiscoveryLive } from "@savvy-web/silk-effects/config";
export type { ConfigDiscoveryOptions, ConfigLocation, ConfigSource } from "@savvy-web/silk-effects/config";
```

- [ ] **Step 2: Update tests in index.test.ts**

In `src/index.test.ts`, remove the entire `ConfigSearch` describe block (lines 603-628):

```typescript
 describe("ConfigSearch", () => {
  it("should have libConfigDir set to lib/configs", () => {
   expect(ConfigSearch.libConfigDir).toBe("lib/configs");
  });

  it("should have find method for known tools", () => {
   expect(typeof ConfigSearch.find).toBe("function");

   // Should return a result object even if not found
   const result = ConfigSearch.find("markdownlint");
   expect(result).toHaveProperty("found");
   expect(result).toHaveProperty("filepath");
  });

  it("should have findFile method for custom searches", () => {
   expect(typeof ConfigSearch.findFile).toBe("function");
  });

  it("should have resolve method for simple lookups", () => {
   expect(typeof ConfigSearch.resolve).toBe("function");

   // Should return fallback when file not found
   const result = ConfigSearch.resolve("nonexistent.json", "./fallback.json");
   expect(result).toBe("./fallback.json");
  });
 });
```

Remove the `ConfigSearch` import from the test file's import block. It currently imports from `./index.js` — find the line that imports `ConfigSearch` and remove it.

Add a replacement test block for the ConfigDiscovery re-export:

```typescript
 describe("ConfigDiscovery", () => {
  it("should re-export ConfigDiscovery from silk-effects", () => {
   expect(ConfigDiscovery).toBeDefined();
   expect(ConfigDiscoveryLive).toBeDefined();
  });
 });
```

Add the import at the top of the test file:

```typescript
import { ConfigDiscovery, ConfigDiscoveryLive } from "./index.js";
```

- [ ] **Step 3: Remove cosmiconfig dependency**

In `package.json`, remove from `dependencies`:

```json
"cosmiconfig": "^9.0.1",
```

Run: `pnpm install`

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Verify all tests pass**

Run: `pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 6: Run the full lint check**

Run: `pnpm run lint`
Expected: PASS (no unused imports, no broken references).

- [ ] **Step 7: Commit**

```bash
git add src/index.ts src/index.test.ts package.json pnpm-lock.yaml
git commit -m "refactor: update public API exports and remove cosmiconfig"
```

---

## Task 6: Final Verification and Changeset

- [ ] **Step 1: Run full test suite with coverage**

Run: `pnpm run test:coverage`
Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`
Expected: PASS.

- [ ] **Step 4: Build the package**

Run: `pnpm run build`
Expected: Both dev and prod builds succeed.

- [ ] **Step 5: Create changeset**

Create `.changeset/<name>.md` with:

```markdown
---
"@savvy-web/lint-staged": minor
---

## Breaking Changes

### Removed `ConfigSearch` utility

The `ConfigSearch` class and its types (`ConfigSearchOptions`, `ConfigSearchResult`) have been removed. Use `ConfigDiscovery` from `@savvy-web/silk-effects/config` instead, which is now re-exported from this package.

### Removed managed section exports

The following exports have been removed from `init.ts`: `BEGIN_MARKER`, `END_MARKER`, `extractManagedSection`, `generateManagedContent`, `generateShellScriptsManagedContent`. Use `ManagedSection` from `@savvy-web/silk-effects/hooks` directly for managed section operations.

## Refactoring

### Adopted `@savvy-web/silk-effects` for shared logic

Replaced three internal implementations with centralized `@savvy-web/silk-effects` modules:

- **BiomeSchemaSync** — biome config `$schema` URL synchronization (replaces `BiomeSchema.ts`)
- **ManagedSection** — managed sections in husky hooks (replaces inline logic in `init.ts`)
- **ConfigDiscovery** — config file discovery with `lib/configs/` priority (replaces `ConfigSearch.ts`)

### Removed `cosmiconfig` dependency

Config discovery now uses the simpler `lib/configs/` then root search convention from silk-effects, removing the need for `cosmiconfig`.
```

- [ ] **Step 6: Commit changeset**

```bash
git add .changeset/
git commit -m "chore: add changeset for silk-effects adoption"
```
