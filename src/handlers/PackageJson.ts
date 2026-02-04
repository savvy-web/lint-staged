/**
 * Handler for package.json files.
 *
 * Sorts fields with sort-package-json and formats with Biome.
 */

import type { LintStagedHandler, PackageJsonOptions } from "../types.js";
import { Command } from "../utils/Command.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for package.json files.
 *
 * Sorts fields with sort-package-json and formats with Biome.
 *
 * @example
 * ```typescript
 * import { PackageJson } from '@savvy-web/lint-staged';
 *
 * export default {
 *   // Use defaults
 *   [PackageJson.glob]: PackageJson.handler,
 *
 *   // Or customize
 *   [PackageJson.glob]: PackageJson.create({
 *     exclude: ['packages/legacy/package.json'],
 *     skipSort: true,
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class PackageJson {
	/**
	 * Glob pattern for matching package.json files.
	 * @defaultValue `'**\/package.json'`
	 */
	static readonly glob = "**/package.json";

	/**
	 * Default patterns to exclude from processing.
	 * @defaultValue `['dist/package.json', '__fixtures__']`
	 */
	static readonly defaultExcludes = ["dist/package.json", "__fixtures__"] as const;

	/**
	 * Pre-configured handler with default options.
	 */
	static readonly handler: LintStagedHandler = PackageJson.create();

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: PackageJsonOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...PackageJson.defaultExcludes];
		const skipSort = options.skipSort ?? false;

		return (filenames: readonly string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			const files = filtered.join(" ");
			const commands: string[] = [];

			// Sort package.json files using sort-package-json CLI
			if (!skipSort) {
				const pm = Command.detectPackageManager();
				const prefix = Command.getExecPrefix(pm);
				const sortCmd = [...prefix, "sort-package-json", files].join(" ");
				commands.push(sortCmd);
			}

			// Build Biome formatting command
			const biomeCmd = options.biomeConfig
				? `biome check --write --max-diagnostics=none --config-path=${options.biomeConfig} ${files}`
				: `biome check --write --max-diagnostics=none ${files}`;
			commands.push(biomeCmd);

			// Chain all commands with && to ensure proper sequencing and staging
			return commands.join(" && ");
		};
	}
}
