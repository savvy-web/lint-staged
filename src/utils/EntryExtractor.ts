/**
 * Extracts TypeScript entry points from package.json exports.
 *
 * @packageDocumentation
 */

/**
 * Shape of package.json exports field.
 */
export type ExportsField = string | Record<string, unknown> | null;

/**
 * Result of entry extraction.
 */
export interface EntryExtractionResult {
	/**
	 * Map of export path to resolved TypeScript file path.
	 * Keys are export names (e.g., ".", "./utils"), values are file paths.
	 */
	entries: Record<string, string>;

	/**
	 * Export paths that couldn't be resolved to TypeScript files.
	 */
	unresolved: string[];
}

/**
 * TypeScript file extensions to check when resolving entries.
 */
const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"] as const;

/**
 * Extracts TypeScript entry points from package.json exports field.
 *
 * @remarks
 * Parses the `exports` field of a package.json to find all TypeScript
 * source files that are part of the public API. Handles various export
 * formats including string, object with conditions, and nested exports.
 *
 * @example
 * ```typescript
 * import type { EntryExtractionResult } from '@savvy-web/lint-staged';
 * import { EntryExtractor } from '@savvy-web/lint-staged';
 *
 * const extractor = new EntryExtractor();
 * const packageJson = {
 *   exports: {
 *     ".": "./src/index.ts",
 *     "./utils": "./src/utils/index.ts"
 *   }
 * };
 * const result: EntryExtractionResult = extractor.extract(packageJson);
 * // result.entries = { ".": "./src/index.ts", "./utils": "./src/utils/index.ts" }
 * ```
 */
export class EntryExtractor {
	/**
	 * Extract TypeScript entry points from package.json.
	 *
	 * @param packageJson - Parsed package.json object
	 * @returns Extraction result with entries and unresolved paths
	 */
	extract(packageJson: { exports?: ExportsField; main?: string; module?: string }): EntryExtractionResult {
		const entries: Record<string, string> = {};
		const unresolved: string[] = [];

		const { exports } = packageJson;

		if (!exports) {
			// Fall back to main/module fields
			const mainEntry = packageJson.module ?? packageJson.main;
			if (mainEntry && this.isTypeScriptFile(mainEntry)) {
				entries["."] = mainEntry;
			} else if (mainEntry) {
				unresolved.push(".");
			}
			return { entries, unresolved };
		}

		// Handle string export: "exports": "./src/index.ts"
		if (typeof exports === "string") {
			if (this.isTypeScriptFile(exports)) {
				entries["."] = exports;
			} else {
				unresolved.push(".");
			}
			return { entries, unresolved };
		}

		// Handle object exports
		this.extractFromObject(exports, entries, unresolved, ".");

		return { entries, unresolved };
	}

	/**
	 * Recursively extract entries from an exports object.
	 */
	private extractFromObject(
		obj: Record<string, unknown>,
		entries: Record<string, string>,
		unresolved: string[],
		currentPath: string,
	): void {
		for (const [key, value] of Object.entries(obj)) {
			// Determine the export path
			const exportPath = key.startsWith(".") ? key : currentPath;

			if (typeof value === "string") {
				// Direct path
				if (this.isTypeScriptFile(value)) {
					entries[exportPath] = value;
				} else if (key.startsWith(".")) {
					// Only mark as unresolved if this is an export key, not a condition
					unresolved.push(exportPath);
				}
			} else if (value && typeof value === "object" && !Array.isArray(value)) {
				// Nested object - could be conditions or nested exports
				const nested = value as Record<string, unknown>;

				// Check for TypeScript-specific conditions first
				const tsPath = this.findTypeScriptCondition(nested);
				if (tsPath) {
					entries[exportPath] = tsPath;
				} else if (key.startsWith(".")) {
					// This is a subpath export, recurse
					this.extractFromObject(nested, entries, unresolved, exportPath);
				} else {
					// This is a condition object, look for source/default
					const sourcePath = this.findSourceCondition(nested);
					if (sourcePath && this.isTypeScriptFile(sourcePath)) {
						entries[exportPath] = sourcePath;
					}
				}
			}
		}
	}

	/**
	 * Find a TypeScript file from condition exports.
	 * Looks for: source, types, typescript, development, default
	 */
	private findTypeScriptCondition(conditions: Record<string, unknown>): string | null {
		// Priority order for finding TypeScript source
		const priorityKeys = ["source", "typescript", "development", "default"];

		for (const key of priorityKeys) {
			const value = conditions[key];
			if (typeof value === "string" && this.isTypeScriptFile(value)) {
				return value;
			}
			if (value && typeof value === "object") {
				// Recurse into nested conditions
				const nested = this.findTypeScriptCondition(value as Record<string, unknown>);
				if (nested) return nested;
			}
		}

		return null;
	}

	/**
	 * Find source path from conditions, even if not TypeScript.
	 */
	private findSourceCondition(conditions: Record<string, unknown>): string | null {
		const priorityKeys = ["source", "import", "require", "default"];

		for (const key of priorityKeys) {
			const value = conditions[key];
			if (typeof value === "string") {
				return value;
			}
			if (value && typeof value === "object") {
				const nested = this.findSourceCondition(value as Record<string, unknown>);
				if (nested) return nested;
			}
		}

		return null;
	}

	/**
	 * Check if a path is a TypeScript file.
	 */
	private isTypeScriptFile(filePath: string): boolean {
		return TS_EXTENSIONS.some((ext) => filePath.endsWith(ext));
	}
}
