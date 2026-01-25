/**
 * Handler for Markdown files.
 *
 * Lints and auto-fixes with markdownlint-cli2.
 *
 * @packageDocumentation
 */

import type { LintStagedHandler, MarkdownOptions } from "../types.js";
import { Command } from "../utils/Command.js";
import { ConfigSearch } from "../utils/ConfigSearch.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for Markdown files.
 *
 * Lints and auto-fixes with markdownlint-cli2.
 *
 * Tool discovery order:
 * 1. Global `markdownlint-cli2` command (preferred)
 * 2. Local installation via `pnpm exec markdownlint-cli2`
 * 3. Local installation via `npx markdownlint-cli2`
 *
 * Config file discovery order:
 * 1. Explicit `config` option if provided
 * 2. `lib/configs/.markdownlint-cli2.jsonc` (and variants)
 * 3. Standard locations (`.markdownlint-cli2.jsonc` at repo root, etc.)
 *
 * @throws Error if markdownlint-cli2 is not available (globally or locally)
 *
 * @example
 * ```typescript
 * import { Markdown } from '@savvy-web/lint-staged';
 *
 * export default {
 *   // Auto-discovers command and config file
 *   [Markdown.glob]: Markdown.handler,
 *
 *   // Or explicit config path
 *   [Markdown.glob]: Markdown.create({
 *     config: './config/.markdownlint.jsonc',
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class Markdown {
	/**
	 * Glob pattern for matching Markdown files.
	 * @defaultValue `'**\/*.{md,mdx}'`
	 */
	static readonly glob = "**/*.{md,mdx}";

	/**
	 * Default patterns to exclude from processing.
	 * @defaultValue `[]`
	 */
	static readonly defaultExcludes = [] as const;

	/**
	 * Pre-configured handler with default options.
	 * Auto-discovers command and config file location.
	 */
	static readonly handler: LintStagedHandler = Markdown.create();

	/**
	 * Find the markdownlint-cli2 executable.
	 *
	 * Searches in order:
	 * 1. Global `markdownlint-cli2` command
	 * 2. `pnpm exec markdownlint-cli2`
	 * 3. `npx markdownlint-cli2`
	 *
	 * @returns The command to run markdownlint-cli2, or undefined if not found
	 */
	static findMarkdownlint(): string | undefined {
		const result = Command.findTool("markdownlint-cli2");
		return result.command;
	}

	/**
	 * Check if markdownlint-cli2 is available.
	 *
	 * @returns `true` if markdownlint-cli2 is available globally or locally
	 */
	static isAvailable(): boolean {
		return Command.findTool("markdownlint-cli2").available;
	}

	/**
	 * Find the markdownlint config file.
	 *
	 * Searches in order:
	 * 1. `lib/configs/` directory
	 * 2. Standard locations (repo root)
	 *
	 * @returns The config file path, or undefined if not found
	 */
	static findConfig(): string | undefined {
		const result = ConfigSearch.find("markdownlint");
		return result.filepath;
	}

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 * @throws Error if markdownlint-cli2 is not available when handler is invoked
	 */
	static create(options: MarkdownOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...Markdown.defaultExcludes];
		const noFix = options.noFix ?? false;

		// Resolve config: explicit > auto-discovered
		const config = options.config ?? Markdown.findConfig();

		return (filenames: string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			// Find markdownlint-cli2 - throw if not available
			const mdlintCmd = Command.requireTool(
				"markdownlint-cli2",
				"markdownlint-cli2 is not available. Install it globally or add it as a dev dependency.",
			);

			const files = filtered.join(" ");
			const fixFlag = noFix ? "" : "--fix";
			const configFlag = config ? `--config '${config}'` : "";

			const cmd = [mdlintCmd, configFlag, fixFlag, files].filter(Boolean).join(" ");

			return cmd;
		};
	}
}
