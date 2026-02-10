/**
 * Handler for YAML files.
 *
 * Formats with Prettier and validates with yaml-lint, both as bundled dependencies.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";
import { lint } from "yaml-lint";
import type { LintStagedHandler, YamlOptions } from "../types.js";
import { ConfigSearch } from "../utils/ConfigSearch.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for YAML files.
 *
 * Formats with Prettier and validates with yaml-lint, both as bundled dependencies.
 *
 * @remarks
 * Excludes pnpm-lock.yaml and pnpm-workspace.yaml by default.
 * pnpm-workspace.yaml has its own dedicated handler.
 *
 * Uses Prettier for formatting and yaml-lint for validation.
 * Both are bundled dependencies (no CLI spawning required).
 *
 * @example
 * ```typescript
 * import { Yaml } from '\@savvy-web/lint-staged';
 *
 * export default {
 *   [Yaml.glob]: Yaml.create({
 *     exclude: ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'generated/'],
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class Yaml {
	/**
	 * Glob pattern for matching YAML files.
	 * @defaultValue `'**\/*.{yml,yaml}'`
	 */
	static readonly glob = "**/*.{yml,yaml}";

	/**
	 * Default patterns to exclude from processing.
	 * @defaultValue `['pnpm-lock.yaml', 'pnpm-workspace.yaml']`
	 */
	static readonly defaultExcludes = ["pnpm-lock.yaml", "pnpm-workspace.yaml"] as const;

	/**
	 * Pre-configured handler with default options.
	 */
	static readonly handler: LintStagedHandler = Yaml.create();

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
		const result = ConfigSearch.find("yamllint");
		return result.filepath;
	}

	/**
	 * Load the yaml-lint schema from a config file.
	 *
	 * @param filepath - Path to the yaml-lint config file
	 * @returns The schema string, or undefined if not found
	 */
	static loadConfig(filepath: string): string | undefined {
		try {
			const content = readFileSync(filepath, "utf-8");
			const config = JSON.parse(content) as { schema?: string };
			return config.schema;
		} catch {
			return undefined;
		}
	}

	/**
	 * Check if yaml-lint is available.
	 *
	 * @returns Always `true` since yaml-lint is a bundled dependency
	 */
	static isAvailable(): boolean {
		return true;
	}

	/**
	 * Format a YAML file in-place using Prettier.
	 *
	 * @param filepath - Path to the YAML file
	 */
	static async formatFile(filepath: string): Promise<void> {
		const content = readFileSync(filepath, "utf-8");
		const prettierConfig = await resolveConfig(filepath);
		const formatted = await format(content, {
			...prettierConfig,
			filepath,
			parser: "yaml",
		});
		writeFileSync(filepath, formatted, "utf-8");
	}

	/**
	 * Validate a YAML file using yaml-lint.
	 *
	 * @param filepath - Path to the YAML file
	 * @param schema - The YAML schema to validate against
	 * @throws Error if the YAML is invalid
	 */
	static async validateFile(filepath: string, schema?: string): Promise<void> {
		const content = readFileSync(filepath, "utf-8");
		await lint(content, schema ? { schema: schema as "DEFAULT_SCHEMA" } : undefined);
	}

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: YamlOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...Yaml.defaultExcludes];
		const skipFormat = options.skipFormat ?? false;
		const skipValidate = options.skipValidate ?? false;

		// Resolve yaml-lint config once at create-time
		const configPath = options.config ?? Yaml.findConfig();
		const schema = configPath ? Yaml.loadConfig(configPath) : undefined;

		return async (filenames: readonly string[]): Promise<string | string[]> => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			// Format first (Prettier), then validate (yaml-lint)
			if (!skipFormat) {
				for (const filepath of filtered) {
					await Yaml.formatFile(filepath);
				}
			}

			if (!skipValidate) {
				for (const filepath of filtered) {
					try {
						await Yaml.validateFile(filepath, schema);
					} catch (error) {
						throw new Error(`Invalid YAML in ${filepath}: ${error instanceof Error ? error.message : String(error)}`);
					}
				}
			}

			// Return no-op to trigger lint-staged auto-staging of in-place changes
			if (!skipFormat) {
				return "true";
			}

			return [];
		};
	}
}
