/**
 * Handler for TypeScript files.
 *
 * Validates TSDoc syntax with ESLint and runs type checking.
 *
 * @packageDocumentation
 */

import type { LintStagedHandler, TypeScriptOptions } from "../types.js";
import { Command } from "../utils/Command.js";
import { ConfigSearch } from "../utils/ConfigSearch.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for TypeScript files.
 *
 * Validates TSDoc syntax with ESLint and runs type checking.
 *
 * @remarks
 * TSDoc validation only runs on source files (matching `sourcePatterns`),
 * not on test files. Type checking runs on all staged TypeScript files.
 *
 * ESLint config discovery order:
 * 1. Explicit `eslintConfig` option if provided
 * 2. `lib/configs/eslint.config.ts` (and variants)
 * 3. Standard locations (`eslint.config.ts` at repo root, etc.)
 *
 * @example
 * ```typescript
 * import { TypeScript } from '@savvy-web/lint-staged';
 *
 * export default {
 *   // Auto-discovers ESLint config
 *   [TypeScript.glob]: TypeScript.handler,
 *
 *   // Or explicit config
 *   [TypeScript.glob]: TypeScript.create({
 *     skipTypecheck: true,
 *     sourcePatterns: ['src/', 'lib/'],
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class TypeScript {
	/**
	 * Glob pattern for matching TypeScript files.
	 * @defaultValue `'*.{ts,cts,mts,tsx}'`
	 */
	static readonly glob = "*.{ts,cts,mts,tsx}";

	/**
	 * Default patterns to exclude from processing.
	 * @defaultValue `[]`
	 */
	static readonly defaultExcludes = [] as const;

	/**
	 * Default patterns that identify source files for TSDoc validation.
	 * @defaultValue `['src/']`
	 */
	static readonly defaultSourcePatterns = ["src/"] as const;

	/**
	 * Default patterns to exclude from TSDoc linting.
	 * @defaultValue `['.test.', '__test__']`
	 */
	static readonly defaultTsdocExcludes = [".test.", "__test__"] as const;

	/**
	 * Get the default type checking command for the detected package manager.
	 *
	 * @returns Command string like `pnpm exec tsgo --noEmit` or `npx --no tsgo --noEmit`
	 */
	static getDefaultTypecheckCommand(): string {
		const pm = Command.detectPackageManager();
		const prefix = Command.getExecPrefix(pm);
		return [...prefix, "tsgo", "--noEmit"].join(" ");
	}

	/**
	 * Pre-configured handler with default options.
	 * Auto-discovers ESLint config file location.
	 */
	static readonly handler: LintStagedHandler = TypeScript.create();

	/**
	 * Find the ESLint config file.
	 *
	 * Searches in order:
	 * 1. `lib/configs/` directory
	 * 2. Standard locations (repo root)
	 *
	 * @returns The config file path, or undefined if not found
	 */
	static findEslintConfig(): string | undefined {
		const result = ConfigSearch.find("eslint");
		return result.filepath;
	}

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: TypeScriptOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...TypeScript.defaultExcludes];
		const sourcePatterns = options.sourcePatterns ?? [...TypeScript.defaultSourcePatterns];
		const tsdocExcludes = options.excludeTsdoc ?? [...TypeScript.defaultTsdocExcludes];
		const skipTsdoc = options.skipTsdoc ?? false;
		const skipTypecheck = options.skipTypecheck ?? false;
		const typecheckCommand = options.typecheckCommand ?? TypeScript.getDefaultTypecheckCommand();

		// Resolve ESLint config: explicit > auto-discovered
		const eslintConfig = options.eslintConfig ?? TypeScript.findEslintConfig();

		return (filenames: string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			const commands: string[] = [];

			// TSDoc validation - only on source files (not test files)
			if (!skipTsdoc && eslintConfig) {
				const sourceFiles = Filter.apply(filtered, {
					include: sourcePatterns,
					exclude: tsdocExcludes,
				});

				if (sourceFiles.length > 0) {
					commands.push(`eslint --config ${eslintConfig} ${sourceFiles.join(" ")}`);
				}
			}

			// Type checking - runs on the project, not individual files
			if (!skipTypecheck && filtered.length > 0) {
				commands.push(typecheckCommand);
			}

			return commands;
		};
	}
}
