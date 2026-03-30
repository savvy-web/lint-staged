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

export type { ConfigLocation } from "@savvy-web/silk-effects";
export { ConfigDiscovery, ConfigDiscoveryLive } from "@savvy-web/silk-effects";
export { checkCommand, fmtCommand, initCommand, rootCommand, runCli } from "./cli/index.js";
export { createConfig } from "./config/createConfig.js";
export type { PresetExtendOptions } from "./config/Preset.js";
export { Preset } from "./config/Preset.js";
export { Handler } from "./Handler.js";
export { Biome } from "./handlers/Biome.js";
export { Markdown } from "./handlers/Markdown.js";
export { PackageJson } from "./handlers/PackageJson.js";
export type { PnpmWorkspaceContent } from "./handlers/PnpmWorkspace.js";
export { PnpmWorkspace } from "./handlers/PnpmWorkspace.js";
export { ShellScripts } from "./handlers/ShellScripts.js";
export type { TypeScriptCompiler } from "./handlers/TypeScript.js";
export { TypeScript } from "./handlers/TypeScript.js";
export { Yaml } from "./handlers/Yaml.js";
export type {
	BaseHandlerOptions,
	BiomeOptions,
	CreateConfigOptions,
	LintStagedConfig,
	LintStagedEntry,
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
export { Command } from "./utils/Command.js";
export type { EntryExtractionResult, ExportsField } from "./utils/EntryExtractor.js";
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
	TsDocLintMessage,
	TsDocLintResult,
	TsDocLinterOptions,
} from "./utils/TsDocLinter.js";
export { TsDocLinter } from "./utils/TsDocLinter.js";
export type {
	TsDocResolverOptions,
	TsDocResolverResult,
	TsDocWorkspace,
} from "./utils/TsDocResolver.js";
export { TsDocResolver } from "./utils/TsDocResolver.js";
