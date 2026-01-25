/**
 * Handler for pnpm-workspace.yaml.
 *
 * Optionally sorts with yq, formats with prettier, validates with yaml-lint.
 *
 * @packageDocumentation
 */

import type { LintStagedHandler, PnpmWorkspaceOptions } from "../types.js";
import { Command } from "../utils/Command.js";

/**
 * Handler for pnpm-workspace.yaml.
 *
 * Optionally sorts with yq, formats with prettier, validates with yaml-lint.
 *
 * @remarks
 * The yq sorting is only applied if yq is installed globally.
 * Use `Command.isAvailable('yq')` to check availability.
 *
 * @example
 * ```typescript
 * import { PnpmWorkspace } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [PnpmWorkspace.glob]: PnpmWorkspace.create({
 *     skipYqSort: true, // Skip even if yq is installed
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class PnpmWorkspace {
	/**
	 * Glob pattern for matching pnpm-workspace.yaml.
	 * @defaultValue `'pnpm-workspace.yaml'`
	 */
	static readonly glob = "pnpm-workspace.yaml";

	/**
	 * Default patterns to exclude (none, since this is a single file).
	 * @defaultValue `[]`
	 */
	static readonly defaultExcludes = [] as const;

	/**
	 * The yq command used to sort workspace packages and keys.
	 *
	 * This sorts:
	 * - `packages` array alphabetically
	 * - `onlyBuiltDependencies` array (if present)
	 * - `publicHoistPattern` array (if present)
	 * - All other keys alphabetically
	 */
	static readonly yqSortCommand =
		'yq -i \'({"packages": .packages} * (del(.packages) | sort_keys(.))) | .packages |= sort | (select(has("onlyBuiltDependencies")) | .onlyBuiltDependencies |= sort) // . | (select(has("publicHoistPattern")) | .publicHoistPattern |= sort) // .\' pnpm-workspace.yaml';

	/**
	 * Pre-configured handler with default options.
	 */
	static readonly handler: LintStagedHandler = PnpmWorkspace.create();

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: PnpmWorkspaceOptions = {}): LintStagedHandler {
		const skipYqSort = options.skipYqSort ?? false;
		const skipPrettier = options.skipPrettier ?? false;
		const skipLint = options.skipLint ?? false;

		return (): string | string[] => {
			const commands: string[] = [];

			// Only sort with yq if it's installed and not skipped
			if (!skipYqSort && Command.isAvailable("yq")) {
				commands.push(PnpmWorkspace.yqSortCommand);
			}

			if (!skipPrettier) {
				commands.push("prettier --write pnpm-workspace.yaml");
			}

			if (!skipLint) {
				commands.push("yaml-lint pnpm-workspace.yaml");
			}

			return commands;
		};
	}
}
