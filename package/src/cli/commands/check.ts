/**
 * Check command - validate current lint-staged setup.
 *
 * @internal
 */
import { isDeepStrictEqual } from "node:util";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import {
	CheckResult,
	ConfigDiscovery,
	ManagedSection,
	SavvyBaseSection,
	SavvyHooksSection,
	ToolDefinition,
	ToolDiscovery,
	savvyBasePreamble,
	savvyHooksHygiene,
} from "@savvy-web/silk-effects";
import { Effect } from "effect";
import { parse } from "jsonc-effect";
import { Biome } from "../../handlers/Biome.js";
import {
	HUSKY_HOOK_PATH,
	MARKDOWNLINT_CONFIG_PATH,
	POST_CHECKOUT_HOOK_PATH,
	POST_MERGE_HOOK_PATH,
	SavvyLintSectionDef,
	savvyLintBlock,
} from "../sections.js";
import { MARKDOWNLINT_CONFIG, MARKDOWNLINT_SCHEMA } from "../templates/markdownlint.gen.js";

/** Unicode checkmark symbol. */
const CHECK_MARK = "✓";

/** Unicode cross symbol. */
const CROSS_MARK = "✗";

/** Unicode warning symbol. */
const WARNING = "⚠";

/** Unicode bullet symbol. */
const BULLET = "•";

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
 * Validates the `savvy-base` and `savvy-lint` sections in the pre-commit hook and the
 * co-owned `savvy-hooks` hygiene section in `post-checkout` / `post-merge`. Section
 * health degrades the overall verdict even if files exist.
 * With --quiet flag, only outputs warnings (for postinstall usage).
 */
export const checkCommand = Command.make("check", { quiet: quietOption }, ({ quiet }) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const ms = yield* ManagedSection;
		const td = yield* ToolDiscovery;
		const discovery = yield* ConfigDiscovery;

		const warnings: string[] = [];

		// Check config file
		const foundConfig = yield* findConfigFile(fs);

		// Check husky hook
		const hasHuskyHook = yield* fs.exists(HUSKY_HOOK_PATH);

		let sectionsHealthy = true;
		let baseStatusLabel: "up-to-date" | "outdated" | "missing" = "missing";
		let lintStatusLabel: "up-to-date" | "outdated" | "missing" = "missing";
		let detectedConfigPath: string | null = null;

		if (hasHuskyHook) {
			// savvy-base section
			const baseResult = yield* ms.check(HUSKY_HOOK_PATH, SavvyBaseSection.block(savvyBasePreamble()));
			if (CheckResult.$is("Found")(baseResult)) {
				baseStatusLabel = baseResult.isUpToDate ? "up-to-date" : "outdated";
				if (!baseResult.isUpToDate) sectionsHealthy = false;
			} else {
				sectionsHealthy = false;
			}

			// savvy-lint section
			const existing = yield* ms.read(HUSKY_HOOK_PATH, SavvyLintSectionDef);
			if (existing) {
				const configPath = extractConfigPathFromManaged(existing.content);
				detectedConfigPath = configPath;
				if (configPath) {
					const lintResult = yield* ms.check(HUSKY_HOOK_PATH, savvyLintBlock(configPath));
					if (CheckResult.$is("Found")(lintResult)) {
						lintStatusLabel = lintResult.isUpToDate ? "up-to-date" : "outdated";
						if (!lintResult.isUpToDate) sectionsHealthy = false;
					} else {
						lintStatusLabel = "outdated";
						sectionsHealthy = false;
					}
				} else {
					lintStatusLabel = "outdated";
					sectionsHealthy = false;
				}
			} else {
				sectionsHealthy = false;
			}

			if (baseStatusLabel !== "up-to-date" || lintStatusLabel !== "up-to-date") {
				warnings.push(
					`${WARNING}  Your ${HUSKY_HOOK_PATH} managed sections are out of date.\n   Run 'savvy-lint init' to update (preserves your custom hooks).`,
				);
			}
		} else {
			sectionsHealthy = false;
			warnings.push(`${WARNING}  No husky pre-commit hook found.\n   Run 'savvy-lint init' to create it.`);
		}

		if (!foundConfig) {
			warnings.push(`${WARNING}  No lint-staged config file found.\n   Run 'savvy-lint init' to create one.`);
		}

		// Hygiene hooks: co-owned savvy-hooks section.
		const shellHookPaths = [POST_CHECKOUT_HOOK_PATH, POST_MERGE_HOOK_PATH] as const;
		const shellHookStatuses: { path: string; found: boolean; isUpToDate: boolean }[] = [];

		for (const hookPath of shellHookPaths) {
			const hookExists = yield* fs.exists(hookPath);
			if (!hookExists) {
				shellHookStatuses.push({ path: hookPath, found: false, isUpToDate: false });
				continue;
			}
			const hygieneResult = yield* ms.check(hookPath, SavvyHooksSection.block(savvyHooksHygiene()));
			const found = CheckResult.$is("Found")(hygieneResult);
			const isUpToDate = CheckResult.$is("Found")(hygieneResult) && hygieneResult.isUpToDate;
			shellHookStatuses.push({ path: hookPath, found, isUpToDate });

			if (!found) {
				sectionsHealthy = false;
				warnings.push(`${WARNING}  ${hookPath} has no savvy-hooks section.\n   Run 'savvy-lint init' to add it.`);
			} else if (!isUpToDate) {
				sectionsHealthy = false;
				warnings.push(`${WARNING}  ${hookPath} savvy-hooks section is outdated.\n   Run 'savvy-lint init' to update.`);
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

		// Managed section status (independent per-section reporting)
		if (hasHuskyHook) {
			if (baseStatusLabel === "up-to-date") {
				yield* Effect.log(`${CHECK_MARK} Base section: up-to-date`);
			} else if (baseStatusLabel === "outdated") {
				yield* Effect.log(`${WARNING} Base section: outdated (run 'savvy-lint init' to update)`);
			} else {
				yield* Effect.log(`${BULLET} Base section: not found (run 'savvy-lint init' to add)`);
			}

			const lintLabel = detectedConfigPath ? ` (config: ${detectedConfigPath})` : "";
			if (lintStatusLabel === "up-to-date") {
				yield* Effect.log(`${CHECK_MARK} Lint section: up-to-date${lintLabel}`);
			} else if (lintStatusLabel === "outdated") {
				yield* Effect.log(`${WARNING} Lint section: outdated (run 'savvy-lint init' to update)`);
			} else {
				yield* Effect.log(`${BULLET} Lint section: not found (run 'savvy-lint init' to add)`);
			}
		}

		// Hygiene hook statuses
		for (const status of shellHookStatuses) {
			if (!status.found) {
				yield* Effect.log(`${BULLET} ${status.path}: savvy-hooks section not found`);
			} else if (status.isUpToDate) {
				yield* Effect.log(`${CHECK_MARK} ${status.path}: up-to-date`);
			} else {
				yield* Effect.log(`${WARNING} ${status.path}: outdated (run 'savvy-lint init' to update)`);
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
		const hasMarkdownlintIssues = hasMarkdownlintConfig && !markdownlintStatus.isUpToDate;
		const hasBiomeSchemaIssues = biomeSchemaStatus.statuses.some((s) => !s.matches);
		const hasIssues =
			!foundConfig || !hasHuskyHook || !sectionsHealthy || hasMarkdownlintIssues || hasBiomeSchemaIssues;

		if (hasIssues) {
			yield* Effect.log(`${WARNING} Some issues found. Run 'savvy-lint init' to fix.`);
		} else {
			yield* Effect.log(`${CHECK_MARK} Lint-staged is configured correctly.`);
		}
	}),
).pipe(Command.withDescription("Check current lint-staged configuration and tool availability"));
