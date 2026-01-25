/**
 * \@savvy-web/lint-staged
 *
 * Composable, configurable lint-staged handlers for pre-commit hooks.
 * Provides reusable handlers for Biome, Markdown, YAML, TypeScript, and more.
 *
 * @example
 * ```typescript
 * import { PackageJson, Biome, Markdown, Yaml } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [PackageJson.glob]: PackageJson.handler,
 *   [Biome.glob]: Biome.create({ exclude: ['vendor/'] }),
 *   [Markdown.glob]: Markdown.handler,
 *   [Yaml.glob]: Yaml.handler,
 * };
 * ```
 *
 * @packageDocumentation
 */

// Configuration utilities
export { createConfig } from "./config/createConfig.js";
export type { PresetExtendOptions } from "./config/Preset.js";
export { Preset } from "./config/Preset.js";
// Base class (for extension)
export { Handler } from "./Handler.js";
// Handler classes
export { Biome } from "./handlers/Biome.js";
export { DesignDocs } from "./handlers/DesignDocs.js";
export { Markdown } from "./handlers/Markdown.js";
export { PackageJson } from "./handlers/PackageJson.js";
export { PnpmWorkspace } from "./handlers/PnpmWorkspace.js";
export { ShellScripts } from "./handlers/ShellScripts.js";
export type { TypeScriptCompiler } from "./handlers/TypeScript.js";
export { TypeScript } from "./handlers/TypeScript.js";
export { Yaml } from "./handlers/Yaml.js";
// Types
export type {
	BaseHandlerOptions,
	BiomeOptions,
	CreateConfigOptions,
	DesignDocsOptions,
	LintStagedConfig,
	LintStagedHandler,
	MarkdownOptions,
	PackageJsonOptions,
	PnpmWorkspaceOptions,
	PresetType,
	ShellScriptsOptions,
	TypeScriptOptions,
	YamlOptions,
} from "./types.js";
export type { PackageManager, ToolSearchResult } from "./utils/Command.js";
// Utility classes
export { Command } from "./utils/Command.js";
export type { ConfigSearchOptions, ConfigSearchResult } from "./utils/ConfigSearch.js";
export { ConfigSearch } from "./utils/ConfigSearch.js";
export type { EntryExtractionResult } from "./utils/EntryExtractor.js";
export { EntryExtractor } from "./utils/EntryExtractor.js";
export { Filter } from "./utils/Filter.js";
export type {
	ImportGraphError,
	ImportGraphErrorType,
	ImportGraphOptions,
	ImportGraphResult,
} from "./utils/ImportGraph.js";
export { ImportGraph } from "./utils/ImportGraph.js";
export type {
	TsDocResolverOptions,
	TsDocResolverResult,
	TsDocWorkspace,
} from "./utils/TsDocResolver.js";
export { TsDocResolver } from "./utils/TsDocResolver.js";
