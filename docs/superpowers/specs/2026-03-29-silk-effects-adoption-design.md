# Adopt silk-effects: Replace Managed Sections, Config Discovery, and Biome Schema Sync

**Date:** 2026-03-29
**Issue:** #89
**Bump:** minor (0.7.0) with breaking changes noted in changeset

## Summary

Replace three internal implementations in lint-staged with `@savvy-web/silk-effects` modules: `ManagedSection`, `ConfigDiscovery`, and `BiomeSchemaSync`. This centralizes shared business logic in the Silk Suite ecosystem and removes ~460 lines of duplicated code.

## Module Replacements

### 1. ManagedSection (init.ts)

**Current state:** `init.ts` contains inline functions for reading/writing managed sections in husky hook files using `BEGIN_MARKER` / `END_MARKER` constants.

**After migration:**

- Remove `BEGIN_MARKER`, `END_MARKER`, `extractManagedSection`, `updateManagedSectionWithContent`, `generateFullHookContentFromManaged` -- all replaced by `ManagedSection` service with `toolName: "SAVVY-LINT"`.
- Keep `generateManagedContent()` and `generateShellScriptsManagedContent()` -- these produce the content that goes inside managed sections (lint-staged-specific business logic).
- Rewrite `writeHook()` to use `ManagedSection.read()` / `ManagedSection.write()`.
- Remove exported markers and `extractManagedSection` from public API.

**Marker compatibility:** silk-effects generates `# --- BEGIN SAVVY-LINT MANAGED SECTION ---` when called with `toolName: "SAVVY-LINT"`, which matches the current format exactly.

### 2. ConfigDiscovery (ConfigSearch.ts)

**Current state:** `ConfigSearch` is a synchronous static class using cosmiconfig with a `lib/configs/` priority convention. It is exported as public API and used by three handlers.

**After migration:**

- Delete `src/utils/ConfigSearch.ts` entirely.
- Handlers (Biome, Markdown, Yaml) switch to `ConfigDiscovery` Effect service.
- Remove `ConfigSearch`, `ConfigSearchResult`, `ConfigSearchOptions` from `src/index.ts` exports.
- Re-export `ConfigDiscovery` and its types from silk-effects for consumers.

**Note:** The handlers currently call `ConfigSearch.find("biome")` synchronously. After migration, config discovery runs within the Effect context the handlers already participate in.

### 3. BiomeSchemaSync (BiomeSchema.ts)

**Current state:** `BiomeSchema.ts` provides utility functions for building schema URLs and finding biome configs. Version is resolved from `process.env.__BIOME_PEER_VERSION__` which is replaced at build time with a string literal.

**After migration:**

- Delete `src/utils/BiomeSchema.ts` and `src/utils/BiomeSchema.test.ts`.
- `init.ts` `syncBiomeSchemas()` calls `BiomeSchemaSync.sync(process.env.__BIOME_PEER_VERSION__)`.
- `check.ts` biome validation calls `BiomeSchemaSync.check(process.env.__BIOME_PEER_VERSION__)`.
- The build-time env var replacement means the version string is passed directly -- no helper needed.

## Layer Wiring

All three silk-effects services require `FileSystem` from `@effect/platform`. The CLI already provides `NodeContext.layer`. Add the three Live layers:

```typescript
const SilkLayer = Layer.mergeAll(
  ManagedSectionLive,
  ConfigDiscoveryLive,
  BiomeSchemaSyncLive,
);
```

Merge into the existing CLI layer composition.

## Public API Changes

### Removed exports (breaking)

- `ConfigSearch` class
- `ConfigSearchOptions` type
- `ConfigSearchResult` type
- `BEGIN_MARKER` constant
- `END_MARKER` constant
- `extractManagedSection` function
- `generateManagedContent` function
- `generateShellScriptsManagedContent` function

### Added re-exports

- `ConfigDiscovery` and types from `@savvy-web/silk-effects/config`

## Files Modified

- `package.json` -- add `@savvy-web/silk-effects` dependency
- `src/cli/commands/init.ts` -- rewrite managed section + biome sync logic
- `src/cli/commands/check.ts` -- rewrite biome schema check logic
- `src/handlers/Biome.ts` -- ConfigSearch to ConfigDiscovery
- `src/handlers/Markdown.ts` -- ConfigSearch to ConfigDiscovery
- `src/handlers/Yaml.ts` -- ConfigSearch to ConfigDiscovery
- `src/index.ts` -- update exports

## Files Deleted

- `src/utils/ConfigSearch.ts`
- `src/utils/BiomeSchema.ts`
- `src/utils/BiomeSchema.test.ts`

## Testing

- Existing tests updated to reflect new APIs.
- Handler tests may need Effect layer provision if they test config discovery paths.
- ConfigSearch tests in `index.test.ts` replaced with ConfigDiscovery equivalents.
- BiomeSchema tests deleted (covered by silk-effects' own test suite).
- All existing passing tests must continue to pass after migration.
