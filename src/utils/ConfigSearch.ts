/**
 * Configuration file discovery utility using cosmiconfig.
 *
 * Searches for config files in a prioritized order:
 * 1. `lib/configs/` directory (agency convention)
 * 2. Standard locations (repo root, etc.)
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { cosmiconfigSync, defaultLoaders } from "cosmiconfig";

/**
 * Result of a config search.
 */
export interface ConfigSearchResult {
	/** The resolved file path, or undefined if not found */
	filepath: string | undefined;
	/** Whether a config file was found */
	found: boolean;
}

/**
 * Options for config search.
 */
export interface ConfigSearchOptions {
	/** Starting directory for search (defaults to cwd) */
	searchFrom?: string;
	/** Stop searching when reaching this directory */
	stopDir?: string;
}

/**
 * Tool configuration definitions.
 */
interface ToolConfig {
	/** The cosmiconfig module name */
	moduleName: string;
	/** Files to search for in lib/configs/ */
	libConfigFiles: string[];
	/** Standard search places (cosmiconfig default format) */
	standardPlaces: string[];
}

/**
 * Predefined tool configurations.
 */
const TOOL_CONFIGS: Record<string, ToolConfig> = {
	markdownlint: {
		moduleName: "markdownlint-cli2",
		libConfigFiles: [
			".markdownlint-cli2.jsonc",
			".markdownlint-cli2.json",
			".markdownlint-cli2.yaml",
			".markdownlint-cli2.cjs",
			".markdownlint.jsonc",
			".markdownlint.json",
			".markdownlint.yaml",
		],
		standardPlaces: [
			".markdownlint-cli2.jsonc",
			".markdownlint-cli2.json",
			".markdownlint-cli2.yaml",
			".markdownlint-cli2.cjs",
			".markdownlint.jsonc",
			".markdownlint.json",
			".markdownlint.yaml",
		],
	},
	biome: {
		moduleName: "biome",
		libConfigFiles: ["biome.jsonc", "biome.json"],
		standardPlaces: ["biome.jsonc", "biome.json"],
	},
	eslint: {
		moduleName: "eslint",
		libConfigFiles: ["eslint.config.ts", "eslint.config.js", "eslint.config.mjs"],
		standardPlaces: ["eslint.config.ts", "eslint.config.js", "eslint.config.mjs"],
	},
	prettier: {
		moduleName: "prettier",
		libConfigFiles: [".prettierrc", ".prettierrc.json", ".prettierrc.yaml", ".prettierrc.js", "prettier.config.js"],
		standardPlaces: [
			".prettierrc",
			".prettierrc.json",
			".prettierrc.yaml",
			".prettierrc.js",
			"prettier.config.js",
			"package.json",
		],
	},
};

/**
 * Static utility class for discovering configuration files.
 *
 * Searches in a prioritized order:
 * 1. `lib/configs/` directory first (agency convention)
 * 2. Standard locations (repo root, package.json, etc.)
 *
 * @example
 * ```typescript
 * import { ConfigSearch } from '@savvy-web/lint-staged';
 *
 * // Find markdownlint config
 * const result = ConfigSearch.find('markdownlint');
 * if (result.found) {
 *   console.log(`Found config at: ${result.filepath}`);
 * }
 *
 * // Find with custom search locations
 * const custom = ConfigSearch.findFile('myapp', {
 *   libConfigFiles: ['myapp.config.js'],
 *   standardPlaces: ['myapp.config.js', '.myapprc'],
 * });
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class ConfigSearch {
	/**
	 * Default directory for agency config files.
	 */
	static readonly libConfigDir = "lib/configs";

	/**
	 * Find a configuration file for a known tool.
	 *
	 * Supported tools: 'markdownlint', 'biome', 'eslint', 'prettier'
	 *
	 * @param tool - The tool name
	 * @param options - Search options
	 * @returns Search result with filepath if found
	 *
	 * @example
	 * ```typescript
	 * const result = ConfigSearch.find('markdownlint');
	 * if (result.found) {
	 *   // Use result.filepath
	 * }
	 * ```
	 */
	static find(
		tool: "markdownlint" | "biome" | "eslint" | "prettier",
		options: ConfigSearchOptions = {},
	): ConfigSearchResult {
		const config = TOOL_CONFIGS[tool];
		if (!config) {
			return { filepath: undefined, found: false };
		}

		return ConfigSearch.findFile(config.moduleName, {
			libConfigFiles: config.libConfigFiles,
			standardPlaces: config.standardPlaces,
			...options,
		});
	}

	/**
	 * Find a configuration file with custom search locations.
	 *
	 * @param moduleName - The cosmiconfig module name
	 * @param options - Search configuration
	 * @returns Search result with filepath if found
	 *
	 * @example
	 * ```typescript
	 * const result = ConfigSearch.findFile('myapp', {
	 *   libConfigFiles: ['myapp.config.js'],
	 *   standardPlaces: ['myapp.config.js', '.myapprc'],
	 * });
	 * ```
	 */
	static findFile(
		moduleName: string,
		options: ConfigSearchOptions & {
			libConfigFiles?: string[];
			standardPlaces?: string[];
		} = {},
	): ConfigSearchResult {
		const { searchFrom = process.cwd(), stopDir, libConfigFiles = [], standardPlaces = [] } = options;

		// Custom loaders for extensions cosmiconfig doesn't handle by default
		const loaders = {
			".jsonc": defaultLoaders[".json"],
			".yaml": defaultLoaders[".yaml"],
			".yml": defaultLoaders[".yaml"],
		};

		// First, check lib/configs/ directory (agency convention)
		const libConfigDir = join(searchFrom, ConfigSearch.libConfigDir);
		for (const file of libConfigFiles) {
			const filepath = join(libConfigDir, file);
			if (existsSync(filepath)) {
				return { filepath, found: true };
			}
		}

		// Fall back to standard cosmiconfig search from cwd
		if (standardPlaces.length === 0) {
			return { filepath: undefined, found: false };
		}

		try {
			const explorer = cosmiconfigSync(moduleName, {
				searchPlaces: standardPlaces,
				loaders,
				// Only include stopDir if defined (cosmiconfig requires string, not string | undefined)
				...(stopDir !== undefined && { stopDir }),
			});

			const result = explorer.search(searchFrom);

			if (result?.filepath) {
				return { filepath: result.filepath, found: true };
			}
		} catch {
			// Config not found or error reading
		}

		return { filepath: undefined, found: false };
	}

	/**
	 * Check if a config file exists at a specific path.
	 *
	 * @param filepath - Path to check
	 * @returns true if the file exists
	 */
	static exists(filepath: string): boolean {
		return existsSync(filepath);
	}

	/**
	 * Get the path to a config file, checking lib/configs/ first.
	 *
	 * This is a simpler method that just checks for a specific filename
	 * in lib/configs/ first, then falls back to the provided default.
	 *
	 * @param filename - The config filename to look for
	 * @param fallback - Fallback path if not found in lib/configs/
	 * @returns The resolved config path
	 *
	 * @example
	 * ```typescript
	 * // Returns 'lib/configs/.markdownlint-cli2.jsonc' if it exists,
	 * // otherwise returns './.markdownlint-cli2.jsonc'
	 * const config = ConfigSearch.resolve(
	 *   '.markdownlint-cli2.jsonc',
	 *   './.markdownlint-cli2.jsonc'
	 * );
	 * ```
	 */
	static resolve(filename: string, fallback: string): string {
		const libPath = `${ConfigSearch.libConfigDir}/${filename}`;

		if (ConfigSearch.exists(libPath)) {
			return libPath;
		}

		return fallback;
	}
}
