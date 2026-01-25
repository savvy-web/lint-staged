/**
 * Handler for package.json files.
 *
 * Sorts fields with sort-package-json and formats with Biome.
 *
 * @packageDocumentation
 */

import type { LintStagedHandler, PackageJsonOptions } from "../types.js";
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

		return (filenames: string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			const files = filtered.join(" ");
			const commands: string[] = [];

			if (!skipSort) {
				commands.push(`sort-package-json ${files}`);
			}

			const biomeCmd = options.biomeConfig
				? `biome check --write --max-diagnostics=none --config=${options.biomeConfig} ${files}`
				: `biome check --write --max-diagnostics=none ${files}`;

			commands.push(biomeCmd);

			return commands;
		};
	}
}
