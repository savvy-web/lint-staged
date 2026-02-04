/**
 * Check command - validate current lint-staged setup.
 *
 * @internal
 */
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { Biome } from "../../handlers/Biome.js";
import { Markdown } from "../../handlers/Markdown.js";
import { TypeScript } from "../../handlers/TypeScript.js";
import { BEGIN_MARKER, END_MARKER, extractManagedSection, generateManagedContent } from "./init.js";

/** Unicode checkmark symbol. */
const CHECK_MARK = "\u2713";

/** Unicode cross symbol. */
const CROSS_MARK = "\u2717";

/** Unicode warning symbol. */
const WARNING = "\u26A0";

/** Unicode bullet symbol. */
const BULLET = "\u2022";

/** Husky pre-commit hook path. */
const HUSKY_HOOK_PATH = ".husky/pre-commit";

/** Possible lint-staged configuration file names, in priority order. */
const CONFIG_FILES = [
	"lint-staged.config.js",
	"lint-staged.config.mjs",
	"lint-staged.config.cjs",
	"lint-staged.config.ts",
	".lintstagedrc",
	".lintstagedrc.json",
	".lintstagedrc.yaml",
	".lintstagedrc.yml",
	".lintstagedrc.js",
	".lintstagedrc.cjs",
	".lintstagedrc.mjs",
] as const;

/** Paths to search for config files. */
const CONFIG_SEARCH_PATHS = ["lib/configs/lint-staged.config.js", "lib/configs/lint-staged.config.ts", ...CONFIG_FILES];

/**
 * Find the first existing config file.
 *
 * @param fs - FileSystem service
 * @returns Effect yielding the config file name or null
 */
function findConfigFile(fs: FileSystem.FileSystem) {
	return Effect.gen(function* () {
		for (const file of CONFIG_SEARCH_PATHS) {
			if (yield* fs.exists(file)) {
				return file;
			}
		}
		return null;
	});
}

/**
 * Extract the config path from the managed section.
 *
 * @param managedContent - The content between managed section markers
 * @returns The config path found, or null if not found
 */
function extractConfigPathFromManaged(managedContent: string): string | null {
	// Look for: lint-staged --config "$ROOT/{path}"
	const match = managedContent.match(/lint-staged --config "\$ROOT\/([^"]+)"/);
	return match ? match[1] : null;
}

/**
 * Check if the managed section is up-to-date.
 *
 * @param existingManaged - The existing managed section content
 * @returns Object with isUpToDate flag and any differences
 */
function checkManagedSectionStatus(existingManaged: string): {
	isUpToDate: boolean;
	configPath: string | null;
	needsUpdate: boolean;
} {
	// Extract config path from existing managed section
	const configPath = extractConfigPathFromManaged(existingManaged);

	if (!configPath) {
		return { isUpToDate: false, configPath: null, needsUpdate: true };
	}

	// Generate expected content with same config path
	const expectedContent = `${BEGIN_MARKER}\n${generateManagedContent(configPath)}\n${END_MARKER}`;

	// Normalize whitespace for comparison
	const normalizedExisting = existingManaged.trim().replace(/\s+/g, " ");
	const normalizedExpected = expectedContent.trim().replace(/\s+/g, " ");

	const isUpToDate = normalizedExisting === normalizedExpected;

	return { isUpToDate, configPath, needsUpdate: !isUpToDate };
}

const quietOption = Options.boolean("quiet").pipe(
	Options.withAlias("q"),
	Options.withDescription("Only output warnings (for postinstall usage)"),
	Options.withDefault(false),
);

/**
 * Check command implementation.
 *
 * @remarks
 * Validates the current lint-staged setup and displays detected settings.
 * With --quiet flag, only outputs warnings (for postinstall usage).
 */
export const checkCommand = Command.make("check", { quiet: quietOption }, ({ quiet }) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const warnings: string[] = [];

		// Check config file
		const foundConfig = yield* findConfigFile(fs);

		// Check husky hook
		const hasHuskyHook = yield* fs.exists(HUSKY_HOOK_PATH);

		// Check managed section status
		let managedStatus: { isUpToDate: boolean; configPath: string | null; needsUpdate: boolean; found: boolean } = {
			isUpToDate: false,
			configPath: null,
			needsUpdate: false,
			found: false,
		};

		if (hasHuskyHook) {
			const hookContent = yield* fs.readFileString(HUSKY_HOOK_PATH);
			const { managedSection, found } = extractManagedSection(hookContent);

			if (found) {
				const status = checkManagedSectionStatus(managedSection);
				managedStatus = { ...status, found: true };

				if (status.needsUpdate) {
					warnings.push(
						`${WARNING}  Your ${HUSKY_HOOK_PATH} managed section is outdated.\n   Run 'savvy-lint init' to update it (preserves your custom hooks).`,
					);
				}
			} else {
				managedStatus = { isUpToDate: false, configPath: null, needsUpdate: false, found: false };
				warnings.push(
					`${WARNING}  Your ${HUSKY_HOOK_PATH} does not have a savvy-lint managed section.\n   Run 'savvy-lint init' to add it.`,
				);
			}
		} else {
			warnings.push(`${WARNING}  No husky pre-commit hook found.\n   Run 'savvy-lint init' to create it.`);
		}

		if (!foundConfig) {
			warnings.push(`${WARNING}  No lint-staged config file found.\n   Run 'savvy-lint init' to create one.`);
		}

		// Quiet mode: only output warnings
		if (quiet) {
			if (warnings.length > 0) {
				for (const warning of warnings) {
					yield* Effect.log(warning);
				}
			}
			return;
		}

		// Full output mode
		yield* Effect.log("Checking lint-staged configuration...\n");

		// Config file status
		if (foundConfig) {
			yield* Effect.log(`${CHECK_MARK} Config file: ${foundConfig}`);
		} else {
			yield* Effect.log(`${CROSS_MARK} No lint-staged config file found`);
		}

		// Husky hook status
		if (hasHuskyHook) {
			yield* Effect.log(`${CHECK_MARK} Husky hook: ${HUSKY_HOOK_PATH}`);
		} else {
			yield* Effect.log(`${CROSS_MARK} No husky pre-commit hook found`);
		}

		// Managed section status
		if (hasHuskyHook) {
			if (managedStatus.found) {
				if (managedStatus.isUpToDate) {
					yield* Effect.log(`${CHECK_MARK} Managed section: up-to-date`);
				} else {
					yield* Effect.log(`${WARNING} Managed section: outdated (run 'savvy-lint init' to update)`);
				}
			} else {
				yield* Effect.log(`${BULLET} Managed section: not found (run 'savvy-lint init' to add)`);
			}
		}

		// Tool availability
		yield* Effect.log("\nTool availability:");

		const biomeAvailable = Biome.isAvailable();
		const biomeConfig = Biome.findConfig();
		if (biomeAvailable) {
			const configInfo = biomeConfig ? ` (config: ${biomeConfig})` : "";
			yield* Effect.log(`  ${CHECK_MARK} Biome${configInfo}`);
		} else {
			yield* Effect.log(`  ${BULLET} Biome: not installed`);
		}

		const markdownAvailable = Markdown.isAvailable();
		const markdownConfig = Markdown.findConfig();
		if (markdownAvailable) {
			const configInfo = markdownConfig ? ` (config: ${markdownConfig})` : "";
			yield* Effect.log(`  ${CHECK_MARK} markdownlint-cli2${configInfo}`);
		} else {
			yield* Effect.log(`  ${BULLET} markdownlint-cli2: not installed`);
		}

		const typescriptAvailable = TypeScript.isAvailable();
		if (typescriptAvailable) {
			const compiler = TypeScript.detectCompiler();
			yield* Effect.log(`  ${CHECK_MARK} TypeScript (${compiler})`);
		} else {
			yield* Effect.log(`  ${BULLET} TypeScript: not installed`);
		}

		const tsdocAvailable = TypeScript.isTsdocAvailable();
		if (tsdocAvailable) {
			yield* Effect.log(`  ${CHECK_MARK} TSDoc (tsdoc.json found)`);
		} else {
			yield* Effect.log(`  ${BULLET} TSDoc: no tsdoc.json found`);
		}

		// Overall status
		yield* Effect.log("");
		const hasIssues = !foundConfig || !hasHuskyHook || !managedStatus.found || managedStatus.needsUpdate;

		if (hasIssues) {
			yield* Effect.log(`${WARNING} Some issues found. Run 'savvy-lint init' to fix.`);
		} else {
			yield* Effect.log(`${CHECK_MARK} Lint-staged is configured correctly.`);
		}
	}),
).pipe(Command.withDescription("Check current lint-staged configuration and tool availability"));
