/**
 * Handler for JavaScript/TypeScript/JSON files.
 *
 * Formats and lints with Biome.
 *
 * @packageDocumentation
 */

import type { BiomeOptions, LintStagedHandler } from "../types.js";
import { Command } from "../utils/Command.js";
import { ConfigSearch } from "../utils/ConfigSearch.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for JavaScript, TypeScript, and JSON files.
 *
 * Formats and lints with Biome.
 *
 * Biome discovery order:
 * 1. Global `biome` command (preferred)
 * 2. Local installation via `pnpm exec biome`
 * 3. Local installation via `npx biome`
 *
 * Config file discovery order:
 * 1. Explicit `config` option if provided
 * 2. `lib/configs/biome.jsonc` or `lib/configs/biome.json`
 * 3. Standard locations (`biome.jsonc` or `biome.json` at repo root)
 *
 * @throws Error if Biome is not available (globally or locally)
 *
 * @example
 * ```typescript
 * import { Biome } from '@savvy-web/lint-staged';
 *
 * export default {
 *   // Auto-discovers biome command and config file
 *   [Biome.glob]: Biome.handler,
 *
 *   // Or with custom excludes
 *   [Biome.glob]: Biome.create({
 *     exclude: ['vendor/', 'generated/'],
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class Biome {
	/**
	 * Glob pattern for matching JavaScript/TypeScript/JSON files.
	 * @defaultValue `'*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}'`
	 */
	static readonly glob = "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}";

	/**
	 * Default patterns to exclude from processing.
	 * @defaultValue `['package-lock.json', '__fixtures__']`
	 */
	static readonly defaultExcludes = ["package-lock.json", "__fixtures__"] as const;

	/**
	 * Pre-configured handler with default options.
	 * Auto-discovers biome command and config file location.
	 */
	static readonly handler: LintStagedHandler = Biome.create();

	/**
	 * Find the Biome executable.
	 *
	 * Searches in order:
	 * 1. Global `biome` command
	 * 2. `pnpm exec biome`
	 * 3. `npx biome`
	 *
	 * @returns The command to run biome, or undefined if not found
	 */
	static findBiome(): string | undefined {
		const result = Command.findTool("biome");
		return result.command;
	}

	/**
	 * Check if Biome is available.
	 *
	 * @returns `true` if biome is available globally or locally
	 */
	static isAvailable(): boolean {
		return Command.findTool("biome").available;
	}

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
		const result = ConfigSearch.find("biome");
		return result.filepath;
	}

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 * @throws Error if Biome is not available when handler is invoked
	 */
	static create(options: BiomeOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...Biome.defaultExcludes];

		// Resolve config: explicit > auto-discovered
		const config = options.config ?? Biome.findConfig();

		return (filenames: readonly string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			// Find biome - throw if not available
			const biomeCmd = Command.requireTool(
				"biome",
				"Biome is not available. Install it globally (recommended) or add @biomejs/biome as a dev dependency.",
			);

			const files = filtered.join(" ");
			const flags = options.flags ?? [];
			const configFlag = config ? `--config=${config}` : "";

			const cmd = [`${biomeCmd} check --write --no-errors-on-unmatched`, configFlag, ...flags, files]
				.filter(Boolean)
				.join(" ");

			return cmd;
		};
	}
}
