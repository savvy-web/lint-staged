/**
 * Handler for TypeScript files.
 *
 * Validates TSDoc syntax with ESLint and runs type checking.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { LintStagedHandler, TypeScriptOptions } from "../types.js";
import type { ToolSearchResult } from "../utils/Command.js";
import { Command } from "../utils/Command.js";
import { Filter } from "../utils/Filter.js";
import { TsDocLinter } from "../utils/TsDocLinter.js";
import { TsDocResolver } from "../utils/TsDocResolver.js";

/**
 * TypeScript compiler to use.
 */
export type TypeScriptCompiler = "tsgo" | "tsc";

/**
 * Handler for TypeScript files.
 *
 * Validates TSDoc syntax with ESLint and runs type checking.
 *
 * @remarks
 * TSDoc validation uses intelligent file discovery based on workspace
 * configuration:
 *
 * 1. Detects workspaces using the npm/pnpm/yarn workspace protocol
 * 2. A workspace is enabled for TSDoc if it has `tsdoc.json` or the repo root has one
 * 3. For enabled workspaces, extracts entry points from `package.json` exports
 * 4. Traces imports from entries to find all public API files
 * 5. Only lints files that are part of the public API
 *
 * This ensures that:
 * - Only documented public API files are linted
 * - Internal implementation files are skipped
 * - Test files and fixtures are automatically excluded
 *
 * Type checking runs on all staged TypeScript files using the configured
 * compiler (tsgo or tsc).
 *
 * @example
 * ```typescript
 * import { TypeScript } from '\@savvy-web/lint-staged';
 *
 * export default {
 *   // Auto-discovers workspaces and lints public API files
 *   [TypeScript.glob]: TypeScript.handler,
 *
 *   // Or explicit config
 *   [TypeScript.glob]: TypeScript.create({
 *     skipTypecheck: true,
 *     skipTsdoc: false,
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
	 * Default patterns to exclude from TSDoc linting.
	 * @defaultValue `['.test.', '.spec.', '__test__', '__tests__']`
	 */
	static readonly defaultTsdocExcludes = [".test.", ".spec.", "__test__", "__tests__"] as const;

	/** Cached compiler detection result */
	private static cachedCompilerResult: { compiler: TypeScriptCompiler; tool: ToolSearchResult } | null = null;

	/**
	 * Detect which TypeScript compiler to use.
	 *
	 * Uses `Command.findTool()` to check for available compilers:
	 * 1. `tsgo` (native TypeScript) — checked first
	 * 2. `tsc` (standard TypeScript) — fallback
	 *
	 * @remarks
	 * Unlike the previous implementation that parsed `package.json` dependencies,
	 * this uses runtime tool detection which works correctly with pnpm catalogs,
	 * peer dependencies, and hoisted/transitive deps.
	 *
	 * @param _cwd - Ignored (kept for backward compatibility)
	 * @returns The compiler to use, or undefined if neither is available
	 */
	static detectCompiler(_cwd?: string): TypeScriptCompiler | undefined {
		if (TypeScript.cachedCompilerResult !== null) {
			return TypeScript.cachedCompilerResult.compiler;
		}

		// Check for native TypeScript (tsgo) first
		const tsgo = Command.findTool("tsgo");
		if (tsgo.available) {
			TypeScript.cachedCompilerResult = { compiler: "tsgo", tool: tsgo };
			return "tsgo";
		}

		// Fall back to standard TypeScript (tsc)
		const tsc = Command.findTool("tsc");
		if (tsc.available) {
			TypeScript.cachedCompilerResult = { compiler: "tsc", tool: tsc };
			return "tsc";
		}

		return undefined;
	}

	/**
	 * Check if a TypeScript compiler is available.
	 *
	 * @returns `true` if either tsgo or tsc is available
	 */
	static isAvailable(): boolean {
		return TypeScript.detectCompiler() !== undefined;
	}

	/**
	 * Get the default type checking command for the detected compiler.
	 *
	 * @remarks
	 * Uses the cached `ToolSearchResult` from `detectCompiler()` to build
	 * the command string, avoiding a separate package manager detection step.
	 *
	 * @returns Command string like `pnpm exec tsgo --noEmit` or `tsgo --noEmit`
	 * @throws Error if no TypeScript compiler is available
	 */
	static getDefaultTypecheckCommand(): string {
		const compiler = TypeScript.detectCompiler();
		if (!compiler || !TypeScript.cachedCompilerResult) {
			throw new Error(
				"No TypeScript compiler found. Install 'typescript' or '@typescript/native-preview' as a dev dependency.",
			);
		}

		return `${TypeScript.cachedCompilerResult.tool.command} --noEmit`;
	}

	/**
	 * Clear the cached compiler detection result.
	 * Useful for testing or when the environment changes.
	 */
	static clearCache(): void {
		TypeScript.cachedCompilerResult = null;
	}

	/**
	 * Pre-configured handler with default options.
	 * Auto-discovers workspaces for TSDoc linting.
	 */
	static readonly handler: LintStagedHandler = TypeScript.create();

	/**
	 * Check if TSDoc linting is available for the repository.
	 *
	 * TSDoc linting requires:
	 * 1. A `tsdoc.json` file at repo root or workspace level
	 * 2. Package(s) with `exports` field in package.json
	 *
	 * @param cwd - Directory to search from (defaults to process.cwd())
	 * @returns `true` if TSDoc linting can be performed
	 */
	static isTsdocAvailable(cwd: string = Command.findRoot()): boolean {
		// Check for tsdoc.json
		const tsdocPath = join(cwd, "tsdoc.json");
		return existsSync(tsdocPath);
	}

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: TypeScriptOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...TypeScript.defaultExcludes];
		const tsdocExcludes = options.excludeTsdoc ?? [...TypeScript.defaultTsdocExcludes];
		const skipTsdoc = options.skipTsdoc ?? false;
		const skipTypecheck = options.skipTypecheck ?? false;
		const rootDir = options.rootDir ?? Command.findRoot();

		// Lazy-load typecheck command to avoid throwing during import
		let typecheckCommand: string | undefined;
		const getTypecheckCommand = (): string => {
			if (typecheckCommand === undefined) {
				typecheckCommand = options.typecheckCommand ?? TypeScript.getDefaultTypecheckCommand();
			}
			return typecheckCommand;
		};

		return async (filenames: readonly string[]): Promise<string | string[]> => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			const commands: string[] = [];

			// TSDoc validation using intelligent workspace-aware file discovery
			if (!skipTsdoc) {
				const resolver = new TsDocResolver({
					rootDir,
					excludePatterns: [...tsdocExcludes],
				});

				// Convert relative paths to absolute for comparison
				const absoluteFiles = filtered.map((f) => (isAbsolute(f) ? f : join(rootDir, f)));

				// Filter to only files that need TSDoc linting
				const tsdocGroups = resolver.filterStagedFiles(absoluteFiles);

				// Lint each group of files using bundled ESLint
				for (const group of tsdocGroups) {
					if (group.files.length > 0) {
						const linter = new TsDocLinter({
							ignorePatterns: tsdocExcludes.map((p) => `**/*${p}*`),
						});

						const results = await linter.lintFiles(group.files);

						if (TsDocLinter.hasErrors(results)) {
							// Format and throw to fail the lint-staged task
							const output = TsDocLinter.formatResults(results);
							throw new Error(`TSDoc validation failed:\n${output}`);
						}
					}
				}
			}

			// Type checking - runs on the project, not individual files
			if (!skipTypecheck && filtered.length > 0) {
				commands.push(getTypecheckCommand());
			}

			return commands;
		};
	}
}
