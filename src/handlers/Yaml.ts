/**
 * Handler for YAML files.
 *
 * Formats with prettier and validates with yaml-lint.
 *
 * @packageDocumentation
 */

import type { LintStagedHandler, YamlOptions } from "../types.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for YAML files.
 *
 * Formats with prettier and validates with yaml-lint.
 *
 * @remarks
 * Excludes pnpm-lock.yaml and pnpm-workspace.yaml by default.
 * pnpm-workspace.yaml has its own dedicated handler.
 *
 * @example
 * ```typescript
 * import { Yaml } from '@savvy-web/lint-staged';
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
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: YamlOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...Yaml.defaultExcludes];
		const skipPrettier = options.skipPrettier ?? false;
		const skipLint = options.skipLint ?? false;

		return (filenames: string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			const files = filtered.join(" ");
			const commands: string[] = [];

			if (!skipPrettier) {
				const prettierCmd = options.prettierConfig
					? `prettier --write --config ${options.prettierConfig} ${files}`
					: `prettier --write ${files}`;
				commands.push(prettierCmd);
			}

			if (!skipLint) {
				commands.push(`yaml-lint ${files}`);
			}

			return commands;
		};
	}
}
