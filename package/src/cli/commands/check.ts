/**
 * Check command - validate current lint-staged setup.
 *
 * @internal
 */
import { isDeepStrictEqual } from "node:util";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import type { SectionBlock } from "@savvy-web/silk-effects";
import { CheckResult, ConfigDiscovery, ManagedSection, ToolDefinition, ToolDiscovery } from "@savvy-web/silk-effects";
import { Effect } from "effect";
import { parse } from "jsonc-effect";
import { Biome } from "../../handlers/Biome.js";
import {
	HUSKY_HOOK_PATH,
	MARKDOWNLINT_CONFIG_PATH,
	POST_CHECKOUT_HOOK_PATH,
	POST_MERGE_HOOK_PATH,
	SavvyLintSectionDef,
	preCommitBlock,
	shellScriptsBlock,
} from "../sections.js";
import { MARKDOWNLINT_CONFIG, MARKDOWNLINT_SCHEMA } from "../templates/markdownlint.gen.js";

/** Unicode checkmark symbol. */
const CHECK_MARK = "\u2713";

/** Unicode cross symbol. */
const CROSS_MARK = "\u2717";

/** Unicode warning symbol. */
const WARNING = "\u26A0";

/** Unicode bullet symbol. */
const BULLET = "\u2022";

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
 * Find the first existing config file from a list of candidates using ConfigDiscovery.
 *
 * @param discovery - ConfigDiscovery service
 * @param names - Config file names to search for (in priority order)
 * @returns The config file path or null
 */
function findConfig(discovery: ConfigDiscovery["Type"], names: readonly string[]) {
	return Effect.gen(function* () {
		for (const name of names) {
			const result = yield* discovery.find(name);
			if (result) return result.path;
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
 * Check if a hook's managed section is up-to-date against an expected block.
 *
 * @param section - ManagedSection service
 * @param hookPath - Path to the hook file
 * @param block - The expected section block
 * @returns Object with status information
 */
function checkHookManagedSection(section: ManagedSection["Type"], hookPath: string, block: SectionBlock) {
	return Effect.gen(function* () {
		const result = yield* section.check(hookPath, block);
		return CheckResult.$match(result, {
			Found: ({ isUpToDate }) => ({ found: true, isUpToDate, needsUpdate: !isUpToDate }),
			NotFound: () => ({ found: false, isUpToDate: false, needsUpdate: false }),
		});
	});
}

/**
 * Check if the pre-commit managed section is up-to-date.
 *
 * @param section - ManagedSection service
 * @param hookPath - Path to the hook file
 * @returns Object with isUpToDate flag and any differences
 */
function checkManagedSectionStatus(section: ManagedSection["Type"], hookPath: string) {
	return Effect.gen(function* () {
		const existing = yield* section.read(hookPath, SavvyLintSectionDef);

		if (existing === null) {
			return { isUpToDate: false, configPath: null as string | null, needsUpdate: false, found: false };
		}

		const configPath = extractConfigPathFromManaged(existing.text);

		if (!configPath) {
			return { isUpToDate: false, configPath: null as string | null, needsUpdate: true, found: true };
		}

		const result = yield* section.check(hookPath, preCommitBlock(configPath));
		return CheckResult.$match(result, {
			Found: ({ isUpToDate }) => ({
				isUpToDate,
				configPath: configPath as string | null,
				needsUpdate: !isUpToDate,
				found: true,
			}),
			NotFound: () => ({ isUpToDate: false, configPath: null as string | null, needsUpdate: false, found: false }),
		});
	});
}

/**
 * Check the markdownlint-cli2 config against the template.
 *
 * @param content - The existing file content
 * @returns Status object with match details
 */
function checkMarkdownlintConfig(content: string) {
	return Effect.gen(function* () {
		const parsed = (yield* parse(content)) as Record<string, unknown>;
		const schemaMatches = parsed.$schema === MARKDOWNLINT_SCHEMA;
		const existingConfig = parsed.config as Record<string, unknown> | undefined;
		const configMatches = existingConfig !== undefined && isDeepStrictEqual(existingConfig, MARKDOWNLINT_CONFIG);
		return { exists: true as const, schemaMatches, configMatches, isUpToDate: schemaMatches && configMatches };
	});
}

/**
 * Check biome config `$schema` URLs against the expected peer dependency version.
 *
 * @remarks
 * Uses `Biome.findAllConfigs()` for workspace-aware discovery, then validates
 * each config's `$schema` URL by reading and parsing the file directly with JSONC.
 *
 * @returns Object with warnings and per-config status
 */
function checkBiomeSchemas() {
	return Effect.gen(function* () {
		const version = process.env.__BIOME_PEER_VERSION__;
		const statuses: { path: string; matches: boolean }[] = [];

		if (!version) return { statuses, warnings: [] as string[] };

		const fs = yield* FileSystem.FileSystem;
		const warnings: string[] = [];
		const expectedSchema = `https://biomejs.dev/schemas/${version}/schema.json`;

		// Use Biome.findAllConfigs() for workspace-aware discovery
		const configPaths = Biome.findAllConfigs();

		for (const configPath of configPaths) {
			const content = yield* fs.readFileString(configPath);
			const parsed = (yield* parse(content)) as Record<string, unknown>;
			const currentSchema = parsed.$schema as string | undefined;

			if (currentSchema === expectedSchema) {
				statuses.push({ path: configPath, matches: true });
			} else {
				statuses.push({ path: configPath, matches: false });
				warnings.push(`${WARNING}  ${configPath}: biome $schema is outdated.\n   Run 'savvy-lint init' to update it.`);
			}
		}

		return { statuses, warnings };
	});
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
		const section = yield* ManagedSection;
		const td = yield* ToolDiscovery;
		const discovery = yield* ConfigDiscovery;

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
			managedStatus = yield* checkManagedSectionStatus(section, HUSKY_HOOK_PATH);

			if (managedStatus.found && managedStatus.needsUpdate) {
				warnings.push(
					`${WARNING}  Your ${HUSKY_HOOK_PATH} managed section is outdated.\n   Run 'savvy-lint init' to update it (preserves your custom hooks).`,
				);
			} else if (!managedStatus.found) {
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
		const shellHookPaths = [POST_CHECKOUT_HOOK_PATH, POST_MERGE_HOOK_PATH] as const;
		const shellHookStatuses: { path: string; found: boolean; isUpToDate: boolean; needsUpdate: boolean }[] = [];

		for (const hookPath of shellHookPaths) {
			const hookExists = yield* fs.exists(hookPath);
			if (hookExists) {
				const status = yield* checkHookManagedSection(section, hookPath, shellScriptsBlock());
				shellHookStatuses.push({ path: hookPath, ...status });

				if (status.found && status.needsUpdate) {
					warnings.push(
						`${WARNING}  Your ${hookPath} managed section is outdated.\n   Run 'savvy-lint init' to update it (preserves your custom hooks).`,
					);
				}
			}
		}

		// Check biome schemas
		const biomeSchemaStatus = yield* checkBiomeSchemas().pipe(
			Effect.catchAll(() =>
				Effect.succeed({
					statuses: [] as { path: string; matches: boolean }[],
					warnings: [`${WARNING}  Could not check biome $schema URLs.`],
				}),
			),
		);
		warnings.push(...biomeSchemaStatus.warnings);

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
			markdownlintStatus = yield* checkMarkdownlintConfig(mdContent);

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

		const biomeAvailable = yield* td.isAvailable(ToolDefinition.make({ name: "biome" }));
		const biomeConfig = yield* findConfig(discovery, ["biome.jsonc", "biome.json"]);
		if (biomeAvailable) {
			const configInfo = biomeConfig ? ` (config: ${biomeConfig})` : "";
			yield* Effect.log(`  ${CHECK_MARK} Biome${configInfo}`);
		} else {
			yield* Effect.log(`  ${BULLET} Biome: not installed`);
		}

		const markdownAvailable = yield* td.isAvailable(ToolDefinition.make({ name: "markdownlint-cli2" }));
		const markdownConfig = yield* findConfig(discovery, [
			".markdownlint-cli2.jsonc",
			".markdownlint-cli2.json",
			".markdownlint-cli2.yaml",
			".markdownlint-cli2.cjs",
			".markdownlint.jsonc",
			".markdownlint.json",
			".markdownlint.yaml",
		]);
		if (markdownAvailable) {
			const configInfo = markdownConfig ? ` (config: ${markdownConfig})` : "";
			yield* Effect.log(`  ${CHECK_MARK} markdownlint-cli2${configInfo}`);
		} else {
			yield* Effect.log(`  ${BULLET} markdownlint-cli2: not installed`);
		}

		const tsgoAvailable = yield* td.isAvailable(ToolDefinition.make({ name: "tsgo" }));
		const tscAvailable = yield* td.isAvailable(ToolDefinition.make({ name: "tsc" }));
		if (tsgoAvailable) {
			yield* Effect.log(`  ${CHECK_MARK} TypeScript (tsgo)`);
		} else if (tscAvailable) {
			yield* Effect.log(`  ${CHECK_MARK} TypeScript (tsc)`);
		} else {
			yield* Effect.log(`  ${BULLET} TypeScript: not installed`);
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

		// Biome schema status
		for (const status of biomeSchemaStatus.statuses) {
			if (status.matches) {
				yield* Effect.log(`  ${CHECK_MARK} ${status.path}: biome $schema up-to-date`);
			} else {
				yield* Effect.log(`  ${WARNING} ${status.path}: biome $schema outdated (run 'savvy-lint init' to update)`);
			}
		}

		// Overall status
		yield* Effect.log("");
		const hasShellHookIssues = shellHookStatuses.some((s) => s.found && s.needsUpdate);
		const hasMarkdownlintIssues = hasMarkdownlintConfig && !markdownlintStatus.isUpToDate;
		const hasBiomeSchemaIssues = biomeSchemaStatus.statuses.some((s) => !s.matches);
		const hasIssues =
			!foundConfig ||
			!hasHuskyHook ||
			!managedStatus.found ||
			managedStatus.needsUpdate ||
			hasShellHookIssues ||
			hasMarkdownlintIssues ||
			hasBiomeSchemaIssues;

		if (hasIssues) {
			yield* Effect.log(`${WARNING} Some issues found. Run 'savvy-lint init' to fix.`);
		} else {
			yield* Effect.log(`${CHECK_MARK} Lint-staged is configured correctly.`);
		}
	}),
).pipe(Command.withDescription("Check current lint-staged configuration and tool availability"));
