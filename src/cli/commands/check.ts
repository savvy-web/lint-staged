/**
 * Check command - validate current lint-staged setup.
 *
 * @internal
 */
import { isDeepStrictEqual } from "node:util";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { parse } from "jsonc-parser";
import { Biome } from "../../handlers/Biome.js";
import { Markdown } from "../../handlers/Markdown.js";
import { TypeScript } from "../../handlers/TypeScript.js";
import { MARKDOWNLINT_CONFIG, MARKDOWNLINT_SCHEMA } from "../templates/markdownlint.gen.js";
import {
	BEGIN_MARKER,
	END_MARKER,
	MARKDOWNLINT_CONFIG_PATH,
	POST_CHECKOUT_HOOK_PATH,
	POST_MERGE_HOOK_PATH,
	extractManagedSection,
	generateManagedContent,
	generateShellScriptsManagedContent,
} from "./init.js";

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
	"lint-staged.config.ts",
	"lint-staged.config.js",
	"lint-staged.config.mjs",
	"lint-staged.config.cjs",
	".lintstagedrc",
	".lintstagedrc.json",
	".lintstagedrc.yaml",
	".lintstagedrc.yml",
	".lintstagedrc.js",
	".lintstagedrc.cjs",
	".lintstagedrc.mjs",
] as const;

/** Paths to search for config files. */
const CONFIG_SEARCH_PATHS = ["lib/configs/lint-staged.config.ts", "lib/configs/lint-staged.config.js", ...CONFIG_FILES];

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
 * Check if a hook's managed section is up-to-date against expected content.
 *
 * @param hookPath - Path to the hook file
 * @param hookContent - The hook file content
 * @param expectedManagedContent - The expected managed content (without markers)
 * @returns Object with status information
 */
function checkHookManagedSection(
	hookContent: string,
	expectedManagedContent: string,
): {
	found: boolean;
	isUpToDate: boolean;
	needsUpdate: boolean;
} {
	const { managedSection, found } = extractManagedSection(hookContent);

	if (!found) {
		return { found: false, isUpToDate: false, needsUpdate: false };
	}

	const expectedSection = `${BEGIN_MARKER}\n${expectedManagedContent}\n${END_MARKER}`;

	const normalizedExisting = managedSection.trim().replace(/\s+/g, " ");
	const normalizedExpected = expectedSection.trim().replace(/\s+/g, " ");

	const isUpToDate = normalizedExisting === normalizedExpected;

	return { found: true, isUpToDate, needsUpdate: !isUpToDate };
}

/**
 * Check if the pre-commit managed section is up-to-date.
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

/**
 * Check the markdownlint-cli2 config against the template.
 *
 * @param content - The existing file content
 * @returns Status object with match details
 */
function checkMarkdownlintConfig(content: string): {
	exists: true;
	schemaMatches: boolean;
	configMatches: boolean;
	isUpToDate: boolean;
} {
	const parsed = parse(content) as Record<string, unknown>;
	const schemaMatches = parsed.$schema === MARKDOWNLINT_SCHEMA;
	const existingConfig = parsed.config as Record<string, unknown> | undefined;
	const configMatches = existingConfig !== undefined && isDeepStrictEqual(existingConfig, MARKDOWNLINT_CONFIG);
	return { exists: true, schemaMatches, configMatches, isUpToDate: schemaMatches && configMatches };
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

		// Check shell script hooks (post-checkout, post-merge)
		// Only validate if hook exists AND has a managed section — these are optional
		const shellHookPaths = [POST_CHECKOUT_HOOK_PATH, POST_MERGE_HOOK_PATH] as const;
		const shellHookStatuses: { path: string; found: boolean; isUpToDate: boolean; needsUpdate: boolean }[] = [];

		for (const hookPath of shellHookPaths) {
			const hookExists = yield* fs.exists(hookPath);
			if (hookExists) {
				const hookContent = yield* fs.readFileString(hookPath);
				const status = checkHookManagedSection(hookContent, generateShellScriptsManagedContent());
				shellHookStatuses.push({ path: hookPath, ...status });

				if (status.found && status.needsUpdate) {
					warnings.push(
						`${WARNING}  Your ${hookPath} managed section is outdated.\n   Run 'savvy-lint init' to update it (preserves your custom hooks).`,
					);
				}
			}
		}

		// Check markdownlint config
		const hasMarkdownlintConfig = yield* fs.exists(MARKDOWNLINT_CONFIG_PATH);
		let markdownlintStatus: { exists: boolean; schemaMatches: boolean; configMatches: boolean; isUpToDate: boolean } = {
			exists: false,
			schemaMatches: false,
			configMatches: false,
			isUpToDate: false,
		};

		if (hasMarkdownlintConfig) {
			const mdContent = yield* fs.readFileString(MARKDOWNLINT_CONFIG_PATH);
			markdownlintStatus = checkMarkdownlintConfig(mdContent);

			if (!markdownlintStatus.schemaMatches) {
				warnings.push(
					`${WARNING}  ${MARKDOWNLINT_CONFIG_PATH}: $schema differs from template.\n   Run 'savvy-lint init' to update it.`,
				);
			}
			if (!markdownlintStatus.configMatches) {
				warnings.push(
					`${WARNING}  ${MARKDOWNLINT_CONFIG_PATH}: config rules differ from template.\n   Run 'savvy-lint init --force' to overwrite.`,
				);
			}
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

		// Shell script hook statuses
		for (const status of shellHookStatuses) {
			if (status.found) {
				if (status.isUpToDate) {
					yield* Effect.log(`${CHECK_MARK} ${status.path}: up-to-date`);
				} else {
					yield* Effect.log(`${WARNING} ${status.path}: outdated (run 'savvy-lint init' to update)`);
				}
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

		// Markdownlint config status
		if (hasMarkdownlintConfig) {
			if (markdownlintStatus.isUpToDate) {
				yield* Effect.log(`  ${CHECK_MARK} ${MARKDOWNLINT_CONFIG_PATH}: up-to-date`);
			} else {
				const issues: string[] = [];
				if (!markdownlintStatus.schemaMatches) issues.push("$schema");
				if (!markdownlintStatus.configMatches) issues.push("config");
				yield* Effect.log(`  ${WARNING} ${MARKDOWNLINT_CONFIG_PATH}: ${issues.join(", ")} differ from template`);
			}
		} else {
			yield* Effect.log(`  ${BULLET} ${MARKDOWNLINT_CONFIG_PATH}: not found`);
		}

		// Overall status
		yield* Effect.log("");
		const hasShellHookIssues = shellHookStatuses.some((s) => s.found && s.needsUpdate);
		const hasMarkdownlintIssues = hasMarkdownlintConfig && !markdownlintStatus.isUpToDate;
		const hasIssues =
			!foundConfig ||
			!hasHuskyHook ||
			!managedStatus.found ||
			managedStatus.needsUpdate ||
			hasShellHookIssues ||
			hasMarkdownlintIssues;

		if (hasIssues) {
			yield* Effect.log(`${WARNING} Some issues found. Run 'savvy-lint init' to fix.`);
		} else {
			yield* Effect.log(`${CHECK_MARK} Lint-staged is configured correctly.`);
		}
	}),
).pipe(Command.withDescription("Check current lint-staged configuration and tool availability"));
