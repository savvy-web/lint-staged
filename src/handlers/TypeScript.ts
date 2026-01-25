/**
 * Handler for TypeScript files.
 *
 * Validates TSDoc syntax with ESLint and runs type checking.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LintStagedHandler, TypeScriptOptions } from "../types.js";
import { Command } from "../utils/Command.js";
import { ConfigSearch } from "../utils/ConfigSearch.js";
import { Filter } from "../utils/Filter.js";

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
	 * Detect which TypeScript compiler to use based on package.json dependencies.
	 *
	 * Checks for:
	 * 1. `\@typescript/native-preview` in dependencies/devDependencies → `tsgo`
	 * 2. `typescript` in dependencies/devDependencies → `tsc`
	 *
	 * @param cwd - Directory to search for package.json (defaults to process.cwd())
	 * @returns The compiler to use, or undefined if neither is installed
	 */
	static detectCompiler(cwd: string = process.cwd()): TypeScriptCompiler | undefined {
		const packageJsonPath = join(cwd, "package.json");

		if (!existsSync(packageJsonPath)) {
			return undefined;
		}

		try {
			const content = readFileSync(packageJsonPath, "utf-8");
			const pkg = JSON.parse(content) as {
				dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>;
			};

			const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

			// Check for native TypeScript (tsgo) first
			if ("@typescript/native-preview" in allDeps) {
				return "tsgo";
			}

			// Fall back to standard TypeScript (tsc)
			if ("typescript" in allDeps) {
				return "tsc";
			}
		} catch {
			// Failed to read or parse package.json
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
	 * Get the default type checking command for the detected package manager and compiler.
	 *
	 * @returns Command string like `pnpm exec tsgo --noEmit` or `npx --no tsc --noEmit`
	 * @throws Error if no TypeScript compiler is detected in package.json
	 */
	static getDefaultTypecheckCommand(): string {
		const compiler = TypeScript.detectCompiler();
		if (!compiler) {
			throw new Error(
				"No TypeScript compiler found. Install 'typescript' or '@typescript/native-preview' as a dev dependency.",
			);
		}

		const pm = Command.detectPackageManager();
		const prefix = Command.getExecPrefix(pm);
		return [...prefix, compiler, "--noEmit"].join(" ");
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
