/**
 * Handler for design documentation files.
 *
 * Validates structure and updates last-synced timestamps.
 *
 * @packageDocumentation
 */

import type { DesignDocsOptions, LintStagedHandler } from "../types.js";
import { Filter } from "../utils/Filter.js";

/**
 * Handler for design documentation files.
 *
 * Validates structure and updates last-synced timestamps.
 *
 * @remarks
 * This handler is optional and requires the design documentation system
 * to be set up in the project. Projects without `.claude/skills/` will
 * still work, but the validation and timestamp scripts must exist.
 *
 * @example
 * ```typescript
 * import { DesignDocs } from '@savvy-web/lint-staged';
 *
 * export default {
 *   [DesignDocs.glob]: DesignDocs.create({
 *     validateScript: './scripts/validate-doc.sh',
 *   }),
 * };
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class DesignDocs {
	/**
	 * Glob pattern for matching design documentation files.
	 * @defaultValue `'.claude/design/**\/*.md'`
	 */
	static readonly glob = ".claude/design/**/*.md";

	/**
	 * Default patterns to exclude from processing.
	 * @defaultValue `['design.config.json']`
	 */
	static readonly defaultExcludes = ["design.config.json"] as const;

	/**
	 * Default path to the validation script.
	 * @defaultValue `'.claude/skills/design-validate/scripts/validate-design-doc.sh'`
	 */
	static readonly defaultValidateScript = ".claude/skills/design-validate/scripts/validate-design-doc.sh";

	/**
	 * Default path to the timestamp update script.
	 * @defaultValue `'.claude/skills/design-update/scripts/update-timestamp.sh'`
	 */
	static readonly defaultTimestampScript = ".claude/skills/design-update/scripts/update-timestamp.sh";

	/**
	 * Pre-configured handler with default options.
	 */
	static readonly handler: LintStagedHandler = DesignDocs.create();

	/**
	 * Create a handler with custom options.
	 *
	 * @param options - Configuration options
	 * @returns A lint-staged compatible handler function
	 */
	static create(options: DesignDocsOptions = {}): LintStagedHandler {
		const excludes = options.exclude ?? [...DesignDocs.defaultExcludes];
		const validateScript = options.validateScript ?? DesignDocs.defaultValidateScript;
		const timestampScript = options.timestampScript ?? DesignDocs.defaultTimestampScript;
		const skipTimestamp = options.skipTimestamp ?? false;

		return (filenames: readonly string[]): string | string[] => {
			const filtered = Filter.exclude(filenames, excludes);

			if (filtered.length === 0) {
				return [];
			}

			// Return commands per file: validate, then update timestamp
			const commands: string[] = [];

			for (const file of filtered) {
				commands.push(`${validateScript} "${file}"`);

				if (!skipTimestamp) {
					commands.push(`${timestampScript} "${file}"`);
				}
			}

			return commands;
		};
	}
}
