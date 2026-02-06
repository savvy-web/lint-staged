/**
 * Handler for YAML files.
 *
 * Formats and validates YAML files using the bundled yaml library.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import type { LintStagedHandler, YamlOptions } from "../types.js";
import { Filter } from "../utils/Filter.js";

/**
 * Default YAML stringify options for consistent formatting.
 */
const DEFAULT_STRINGIFY_OPTIONS = {
	indent: 2,
	lineWidth: 0, // Disable line wrapping
	singleQuote: false,
} as const;

/**
 * Handler for YAML files.
 *
 * Formats and validates YAML files using the bundled yaml library.
 *
 * @remarks
 * Excludes pnpm-lock.yaml and pnpm-workspace.yaml by default.
 * pnpm-workspace.yaml has its own dedicated handler.
 *
 * Uses the `yaml` package for both formatting and validation
 * as a bundled dependency (no CLI spawning required).
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
	 * Format a YAML file in-place.
	 *
	 * @param filepath - Path to the YAML file
	 * @param options - Stringify options for the yaml package
	 */
	static formatFile(filepath: string, options?: Parameters<typeof stringify>[1]): void {
		const content = readFileSync(filepath, "utf-8");
		const parsed = parse(content);
		const formatted = stringify(parsed, { ...DEFAULT_STRINGIFY_OPTIONS, ...options });
		writeFileSync(filepath, formatted, "utf-8");
	}

	/**
	 * Validate a YAML file.
	 *
	 * @param filepath - Path to the YAML file
	 * @throws Error if the YAML is invalid
	 */
	static validateFile(filepath: string): void {
		const content = readFileSync(filepath, "utf-8");
		parse(content); // Throws on invalid YAML
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

		return (filenames: readonly string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			// Format YAML files in-place using the bundled yaml library
			if (!skipFormat) {
				for (const filepath of filtered) {
					Yaml.formatFile(filepath);
				}
			}

			// Validate YAML files - parsing throws on invalid YAML
			if (!skipValidate) {
				for (const filepath of filtered) {
					try {
						Yaml.validateFile(filepath);
					} catch (error) {
						throw new Error(`Invalid YAML in ${filepath}: ${error instanceof Error ? error.message : String(error)}`);
					}
				}
			}

			return [];
		};
	}
}
