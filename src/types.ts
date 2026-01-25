/**
 * Type definitions for \@savvy-web/lint-staged
 *
 * @packageDocumentation
 */

/**
 * A lint-staged handler function.
 * Receives an array of staged filenames and returns command(s) to execute.
 */
export type LintStagedHandler = (filenames: string[]) => string | string[] | Promise<string | string[]>;

/**
 * A lint-staged configuration object.
 * Maps glob patterns to handlers.
 */
export type LintStagedConfig = Record<string, LintStagedHandler | string | string[]>;

/**
 * Base options shared by all handlers.
 */
export interface BaseHandlerOptions {
	/**
	 * Patterns to exclude from processing.
	 * Uses `string.includes()` for matching.
	 */
	exclude?: string[];
}

/**
 * Options for the PackageJson handler.
 */
export interface PackageJsonOptions extends BaseHandlerOptions {
	/**
	 * Skip sort-package-json, only run Biome formatting.
	 * @defaultValue false
	 */
	skipSort?: boolean;

	/**
	 * Path to Biome config file.
	 */
	biomeConfig?: string;
}

/**
 * Options for the Biome handler.
 */
export interface BiomeOptions extends BaseHandlerOptions {
	/**
	 * Path to Biome config file.
	 */
	config?: string;

	/**
	 * Additional Biome CLI flags.
	 */
	flags?: string[];
}

/**
 * Options for the DesignDocs handler.
 */
export interface DesignDocsOptions extends BaseHandlerOptions {
	/**
	 * Path to validation script.
	 * @defaultValue '.claude/skills/design-validate/scripts/validate-design-doc.sh'
	 */
	validateScript?: string;

	/**
	 * Path to timestamp update script.
	 * @defaultValue '.claude/skills/design-update/scripts/update-timestamp.sh'
	 */
	timestampScript?: string;

	/**
	 * Skip timestamp updates.
	 * @defaultValue false
	 */
	skipTimestamp?: boolean;
}

/**
 * Options for the Markdown handler.
 */
export interface MarkdownOptions extends BaseHandlerOptions {
	/**
	 * Path to markdownlint-cli2 config file.
	 * @defaultValue './lib/configs/.markdownlint-cli2.jsonc'
	 */
	config?: string;

	/**
	 * Disable auto-fix (lint only).
	 * @defaultValue false
	 */
	noFix?: boolean;
}

/**
 * Options for the PnpmWorkspace handler.
 */
export interface PnpmWorkspaceOptions {
	/**
	 * Skip sorting packages and keys.
	 * @defaultValue false
	 */
	skipSort?: boolean;

	/**
	 * Skip YAML formatting.
	 * @defaultValue false
	 */
	skipFormat?: boolean;

	/**
	 * Skip YAML validation.
	 * @defaultValue false
	 */
	skipLint?: boolean;

	/**
	 * Skip sorting.
	 * @deprecated Use `skipSort` instead. This is kept for backward compatibility.
	 * @defaultValue false
	 */
	skipYqSort?: boolean;

	/**
	 * Skip formatting.
	 * @deprecated Use `skipFormat` instead. This is kept for backward compatibility.
	 * @defaultValue false
	 */
	skipPrettier?: boolean;
}

/**
 * Options for the ShellScripts handler.
 */
export interface ShellScriptsOptions extends BaseHandlerOptions {
	/**
	 * Set executable bit instead of removing it.
	 * @defaultValue false
	 */
	makeExecutable?: boolean;
}

/**
 * Options for the Yaml handler.
 */
export interface YamlOptions extends BaseHandlerOptions {
	/**
	 * Skip YAML formatting.
	 * @defaultValue false
	 */
	skipFormat?: boolean;

	/**
	 * Skip YAML validation.
	 * @defaultValue false
	 */
	skipValidate?: boolean;

	/**
	 * Skip formatting.
	 * @deprecated Use `skipFormat` instead. This is kept for backward compatibility.
	 * @defaultValue false
	 */
	skipPrettier?: boolean;

	/**
	 * Skip validation.
	 * @deprecated Use `skipValidate` instead. This is kept for backward compatibility.
	 * @defaultValue false
	 */
	skipLint?: boolean;
}

/**
 * Options for the TypeScript handler.
 */
export interface TypeScriptOptions extends BaseHandlerOptions {
	/**
	 * Additional patterns to exclude from TSDoc linting.
	 * These are in addition to the default test file exclusions.
	 * @defaultValue ['.test.', '.spec.', '__test__', '__tests__']
	 */
	excludeTsdoc?: string[];

	/**
	 * Skip TSDoc validation.
	 * @defaultValue false
	 */
	skipTsdoc?: boolean;

	/**
	 * Skip type checking.
	 * @defaultValue false
	 */
	skipTypecheck?: boolean;

	/**
	 * Command for type checking.
	 * @defaultValue Auto-detected based on package manager and compiler
	 */
	typecheckCommand?: string;

	/**
	 * Root directory for workspace detection.
	 * Used to find workspaces and tsdoc.json configuration.
	 * @defaultValue process.cwd()
	 */
	rootDir?: string;
}

/**
 * Options for createConfig() helper.
 */
export interface CreateConfigOptions {
	/**
	 * Options for PackageJson handler, or false to disable.
	 */
	packageJson?: PackageJsonOptions | false;

	/**
	 * Options for Biome handler, or false to disable.
	 */
	biome?: BiomeOptions | false;

	/**
	 * Options for DesignDocs handler.
	 * - `true` to enable with defaults
	 * - `false` to disable (default in createConfig)
	 * - Object to enable with custom options
	 */
	designDocs?: DesignDocsOptions | boolean;

	/**
	 * Options for Markdown handler, or false to disable.
	 */
	markdown?: MarkdownOptions | false;

	/**
	 * Options for PnpmWorkspace handler, or false to disable.
	 */
	pnpmWorkspace?: PnpmWorkspaceOptions | false;

	/**
	 * Options for ShellScripts handler, or false to disable.
	 */
	shellScripts?: ShellScriptsOptions | false;

	/**
	 * Options for Yaml handler, or false to disable.
	 */
	yaml?: YamlOptions | false;

	/**
	 * Options for TypeScript handler, or false to disable.
	 */
	typescript?: TypeScriptOptions | false;

	/**
	 * Custom handlers to add to the configuration.
	 */
	custom?: LintStagedConfig;
}

/**
 * Preset type for standard configurations.
 */
export type PresetType = "minimal" | "standard" | "full";
