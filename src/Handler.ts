/**
 * Abstract base class for all lint-staged handlers.
 *
 * Provides common utilities and establishes the static class pattern
 * for TSDoc-friendly documentation.
 *
 * @example
 * ```typescript
 * // Use default handler
 * export default {
 *   [Biome.glob]: Biome.handler,
 * };
 *
 * // Use customized handler
 * export default {
 *   [Biome.glob]: Biome.create({ exclude: ['vendor/'] }),
 * };
 * ```
 *
 * @packageDocumentation
 */

import type { BaseHandlerOptions, LintStagedHandler } from "./types.js";
import { Filter } from "./utils/Filter.js";

/**
 * Abstract base class for lint-staged handlers.
 *
 * All handler classes extend this base and implement:
 * - `glob` - The recommended glob pattern for matching files
 * - `defaultExcludes` - Default patterns to exclude
 * - `handler` - Pre-configured handler with defaults
 * - `create()` - Factory method for custom configuration
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export abstract class Handler {
	/**
	 * Default glob pattern for this handler.
	 * Use as the key in lint-staged config.
	 */
	static readonly glob: string;

	/**
	 * Default exclude patterns applied when no options provided.
	 */
	static readonly defaultExcludes: readonly string[];

	/**
	 * Pre-configured handler with default options.
	 * Ready to use directly in lint-staged config.
	 */
	static readonly handler: LintStagedHandler;

	/**
	 * Factory method to create a handler with custom options.
	 *
	 * @param _options - Configuration options for this handler
	 * @returns A lint-staged compatible handler function
	 */
	static create(_options?: BaseHandlerOptions): LintStagedHandler {
		throw new Error("Handler.create() must be implemented by subclass");
	}

	/**
	 * Filter filenames based on exclude patterns.
	 *
	 * @param filenames - Array of staged file paths
	 * @param excludes - Patterns to exclude (uses `string.includes()`)
	 * @returns Filtered array of file paths
	 */
	protected static filterFiles(filenames: string[], excludes: string[]): string[] {
		return Filter.exclude(filenames, excludes);
	}

	/**
	 * Join filenames into a space-separated string for command execution.
	 *
	 * @param filenames - Array of file paths
	 * @returns Space-separated string of file paths
	 */
	protected static joinFiles(filenames: string[]): string {
		return filenames.join(" ");
	}

	/**
	 * Return an empty array if no files remain after filtering.
	 * This is the lint-staged convention for "no action needed".
	 *
	 * @param filenames - Array of file paths
	 * @returns The original array, or empty array if input is empty
	 */
	protected static orEmpty<T>(filenames: T[]): T[] {
		return filenames.length > 0 ? filenames : [];
	}
}
