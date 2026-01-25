/**
 * TSDoc linter using ESLint with bundled configuration.
 *
 * @packageDocumentation
 */

import tsParser from "@typescript-eslint/parser";
import type { Linter } from "eslint";
import { ESLint } from "eslint";
import tsdoc from "eslint-plugin-tsdoc";

/**
 * Result of linting a file for TSDoc issues.
 */
export interface TsDocLintResult {
	/** Absolute path to the file */
	filePath: string;
	/** Number of errors found */
	errorCount: number;
	/** Number of warnings found */
	warningCount: number;
	/** Individual messages */
	messages: TsDocLintMessage[];
}

/**
 * A single lint message.
 */
export interface TsDocLintMessage {
	/** Line number (1-indexed) */
	line: number;
	/** Column number (1-indexed) */
	column: number;
	/** Severity: 1 = warning, 2 = error */
	severity: 1 | 2;
	/** The error/warning message */
	message: string;
	/** The rule that triggered this message */
	ruleId: string | null;
}

/**
 * Options for TsDocLinter.
 */
export interface TsDocLinterOptions {
	/** Additional patterns to ignore */
	ignorePatterns?: string[];
}

/**
 * TSDoc linter using ESLint with bundled configuration.
 *
 * @remarks
 * This class provides programmatic TSDoc linting using ESLint's Node.js API.
 * It bundles the required ESLint configuration internally, so consumers
 * don't need to configure ESLint themselves.
 *
 * The linter checks for TSDoc syntax errors using the `eslint-plugin-tsdoc` plugin.
 *
 * @example
 * ```typescript
 * import type { TsDocLintResult } from '@savvy-web/lint-staged';
 * import { TsDocLinter } from '@savvy-web/lint-staged';
 *
 * const linter = new TsDocLinter();
 * const results: TsDocLintResult[] = await linter.lintFiles(['src/index.ts', 'src/utils.ts']);
 *
 * for (const result of results) {
 *   if (result.errorCount > 0) {
 *     console.log(`${result.filePath}: ${result.errorCount} errors`);
 *   }
 * }
 * ```
 */
export class TsDocLinter {
	private readonly eslint: ESLint;

	constructor(options: TsDocLinterOptions = {}) {
		const ignorePatterns = options.ignorePatterns ?? [];

		// Build the flat config programmatically
		const config: Linter.Config[] = [
			{
				ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", ...ignorePatterns],
			},
			{
				files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
				languageOptions: {
					parser: tsParser,
				},
				plugins: { tsdoc },
				rules: {
					"tsdoc/syntax": "error",
				},
			},
		];

		this.eslint = new ESLint({
			overrideConfigFile: true,
			overrideConfig: config,
		});
	}

	/**
	 * Lint files for TSDoc issues.
	 *
	 * @param filePaths - Array of absolute file paths to lint
	 * @returns Array of lint results
	 */
	async lintFiles(filePaths: string[]): Promise<TsDocLintResult[]> {
		if (filePaths.length === 0) {
			return [];
		}

		const results = await this.eslint.lintFiles(filePaths);

		return results.map((result) => ({
			filePath: result.filePath,
			errorCount: result.errorCount,
			warningCount: result.warningCount,
			messages: result.messages.map((msg) => ({
				line: msg.line,
				column: msg.column,
				severity: msg.severity as 1 | 2,
				message: msg.message,
				ruleId: msg.ruleId,
			})),
		}));
	}

	/**
	 * Lint files and throw if any errors are found.
	 *
	 * @param filePaths - Array of absolute file paths to lint
	 * @throws Error if any TSDoc errors are found
	 */
	async lintFilesAndThrow(filePaths: string[]): Promise<void> {
		const results = await this.lintFiles(filePaths);
		const errors: string[] = [];

		for (const result of results) {
			if (result.errorCount > 0) {
				for (const msg of result.messages) {
					if (msg.severity === 2) {
						errors.push(`${result.filePath}:${msg.line}:${msg.column} - ${msg.message}`);
					}
				}
			}
		}

		if (errors.length > 0) {
			throw new Error(`TSDoc validation failed:\n${errors.join("\n")}`);
		}
	}

	/**
	 * Format lint results as a human-readable string.
	 *
	 * @param results - Array of lint results
	 * @returns Formatted string output
	 */
	static formatResults(results: TsDocLintResult[]): string {
		const lines: string[] = [];

		for (const result of results) {
			if (result.errorCount === 0 && result.warningCount === 0) {
				continue;
			}

			lines.push(`\n${result.filePath}`);

			for (const msg of result.messages) {
				const severity = msg.severity === 2 ? "error" : "warning";
				const rule = msg.ruleId ? ` (${msg.ruleId})` : "";
				lines.push(`  ${msg.line}:${msg.column}  ${severity}  ${msg.message}${rule}`);
			}
		}

		const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
		const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);

		if (totalErrors > 0 || totalWarnings > 0) {
			lines.push(`\n✖ ${totalErrors} error(s), ${totalWarnings} warning(s)`);
		}

		return lines.join("\n");
	}

	/**
	 * Check if there are any errors in the results.
	 *
	 * @param results - Array of lint results
	 * @returns True if any errors were found
	 */
	static hasErrors(results: TsDocLintResult[]): boolean {
		return results.some((r) => r.errorCount > 0);
	}
}
