/**
 * Init command - bootstrap lint-staged configuration.
 *
 * @internal
 */
import { dirname } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import type { FormattingOptions } from "jsonc-parser";
import { applyEdits, modify, parse } from "jsonc-parser";
import { MARKDOWNLINT_CONFIG, MARKDOWNLINT_SCHEMA, MARKDOWNLINT_TEMPLATE } from "../templates/markdownlint.gen.js";

/** Unicode checkmark symbol. */
const CHECK_MARK = "\u2713";

/** Unicode warning symbol. */
const WARNING = "\u26A0";

/** Executable file permission mode. */
const EXECUTABLE_MODE = 0o755;

/** Path for the husky pre-commit hook. */
const HUSKY_HOOK_PATH = ".husky/pre-commit";

/** Path for the husky post-checkout hook. */
const POST_CHECKOUT_HOOK_PATH = ".husky/post-checkout";

/** Path for the husky post-merge hook. */
const POST_MERGE_HOOK_PATH = ".husky/post-merge";

/** Default path for the lint-staged config file. */
const DEFAULT_CONFIG_PATH = "lib/configs/lint-staged.config.ts";

/** Path for the markdownlint-cli2 config file. */
const MARKDOWNLINT_CONFIG_PATH = ".markdownlint-cli2.jsonc";

/** Formatting options for jsonc-parser surgical edits. */
const JSONC_FORMAT: FormattingOptions = { tabSize: 1, insertSpaces: false };

/** Begin marker for managed section. */
const BEGIN_MARKER = "# --- BEGIN SAVVY-LINT MANAGED SECTION ---";

/** End marker for managed section. */
const END_MARKER = "# --- END SAVVY-LINT MANAGED SECTION ---";

/** Available presets. */
type PresetType = "minimal" | "standard" | "silk";

/**
 * Check if a preset includes the ShellScripts handler.
 *
 * @param preset - The preset to check
 * @returns True if the preset includes ShellScripts (standard and silk)
 */
function presetIncludesShellScripts(preset: PresetType): boolean {
	return preset !== "minimal";
}

/**
 * Check if a preset includes markdown tooling.
 *
 * @param preset - The preset to check
 * @returns True if the preset includes Markdown (standard and silk)
 */
function presetIncludesMarkdown(preset: PresetType): boolean {
	return preset !== "minimal";
}

/**
 * Generate the managed section content for the pre-commit hook.
 *
 * @param configPath - Path to the lint-staged config file
 * @returns The managed section content (without markers)
 */
function generateManagedContent(configPath: string): string {
	return `# DO NOT EDIT between these markers - managed by savvy-lint
# Skip in CI environment
if ! { [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; }; then

# Get repo root directory
ROOT=$(git rev-parse --show-toplevel)

# Detect package manager from package.json or lockfiles
detect_pm() {
  # Check packageManager field in package.json (e.g., "pnpm@9.0.0")
  if [ -f "$ROOT/package.json" ]; then
    pm=$(jq -r '.packageManager // empty' "$ROOT/package.json" 2>/dev/null | cut -d'@' -f1)
    if [ -n "$pm" ]; then
      echo "$pm"
      return
    fi
  fi

  # Fallback to lockfile detection
  if [ -f "$ROOT/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$ROOT/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$ROOT/bun.lock" ]; then
    echo "bun"
  else
    echo "npm"
  fi
}

# Run lint-staged with the detected package manager
PM=$(detect_pm)
case "$PM" in
  pnpm) pnpm exec lint-staged --config "$ROOT/${configPath}" ;;
  yarn) yarn exec lint-staged --config "$ROOT/${configPath}" ;;
  bun)  bunx lint-staged --config "$ROOT/${configPath}" ;;
  *)    npx --no -- lint-staged --config "$ROOT/${configPath}" ;;
esac

fi`;
}

/**
 * Generate the managed section content for shell script hooks (post-checkout, post-merge).
 *
 * @returns The managed section content (without markers)
 */
function generateShellScriptsManagedContent(): string {
	return `# DO NOT EDIT between these markers - managed by savvy-lint
if ! { [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; }; then

# Configure git to ignore executable bit changes
# This ensures hook scripts can be made executable locally without git tracking the change
git config core.fileMode false

# Ensure all shell scripts tracked by git are executable
git ls-files -z '*.sh' | xargs -0 -r chmod +x 2>/dev/null || true

fi`;
}

/**
 * Update existing hook content with a new managed section, given content directly.
 *
 * @param existingContent - The existing hook file content
 * @param managedContent - The managed content (without markers)
 * @returns Updated hook content
 */
function updateManagedSectionWithContent(existingContent: string, managedContent: string): string {
	const { beforeSection, afterSection, found } = extractManagedSection(existingContent);

	const newManagedSection = `${BEGIN_MARKER}\n${managedContent}\n${END_MARKER}`;

	if (found) {
		return `${beforeSection}${newManagedSection}${afterSection}`;
	}

	const trimmedContent = existingContent.trimEnd();
	return `${trimmedContent}\n\n${newManagedSection}\n`;
}

/**
 * Extract the managed section from existing hook content.
 *
 * @param content - The existing hook file content
 * @returns Object with beforeSection, managedSection, afterSection, and found flag
 */
function extractManagedSection(content: string): {
	beforeSection: string;
	managedSection: string;
	afterSection: string;
	found: boolean;
} {
	const beginIndex = content.indexOf(BEGIN_MARKER);
	const endIndex = content.indexOf(END_MARKER);

	if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
		return {
			beforeSection: content,
			managedSection: "",
			afterSection: "",
			found: false,
		};
	}

	return {
		beforeSection: content.slice(0, beginIndex),
		managedSection: content.slice(beginIndex, endIndex + END_MARKER.length),
		afterSection: content.slice(endIndex + END_MARKER.length),
		found: true,
	};
}

/**
 * Generate complete hook file content from managed content.
 *
 * @param comment - Header comment describing the hook
 * @param managedContent - The managed content (without markers)
 * @returns Complete shell script content for the hook
 */
function generateFullHookContentFromManaged(comment: string, managedContent: string): string {
	return `#!/usr/bin/env sh
# ${comment}
# Custom hooks can go above or below the managed section

${BEGIN_MARKER}
${managedContent}
${END_MARKER}
`;
}

/**
 * Generate the lint-staged config file content.
 *
 * @param preset - The preset to use
 * @returns Config file content
 */
function generateConfigContent(preset: PresetType): string {
	return `/**
 * lint-staged configuration
 * Generated by savvy-lint init
 */
import type { Configuration } from "lint-staged";
import { Preset } from "@savvy-web/lint-staged";

export default Preset.${preset}() satisfies Configuration;
`;
}

/**
 * Write or update the markdownlint-cli2 config file.
 *
 * @param fs - FileSystem service
 * @param preset - The active preset
 * @param force - Whether to overwrite the entire file
 * @returns Effect that manages the markdownlint config
 */
function writeMarkdownlintConfig(fs: FileSystem.FileSystem, preset: PresetType, force: boolean) {
	return Effect.gen(function* () {
		const configExists = yield* fs.exists(MARKDOWNLINT_CONFIG_PATH);
		const fullTemplate = JSON.stringify(MARKDOWNLINT_TEMPLATE, null, "\t");

		if (!configExists) {
			// File missing → write full template
			yield* fs.writeFileString(MARKDOWNLINT_CONFIG_PATH, `${fullTemplate}\n`);
			yield* Effect.log(`${CHECK_MARK} Created ${MARKDOWNLINT_CONFIG_PATH}`);
			return;
		}

		if (preset !== "silk") {
			// Standard preset: don't manage existing files
			yield* Effect.log(`${CHECK_MARK} ${MARKDOWNLINT_CONFIG_PATH}: exists (not managed by ${preset} preset)`);
			return;
		}

		if (force) {
			// Force: overwrite entire file with fresh template
			yield* fs.writeFileString(MARKDOWNLINT_CONFIG_PATH, `${fullTemplate}\n`);
			yield* Effect.log(`${CHECK_MARK} Replaced ${MARKDOWNLINT_CONFIG_PATH} (--force)`);
			return;
		}

		// Silk preset, no force: surgical management of $schema + config
		const existingText = yield* fs.readFileString(MARKDOWNLINT_CONFIG_PATH);
		const existingParsed = parse(existingText) as Record<string, unknown>;

		let updatedText = existingText;
		let schemaUpdated = false;

		// Always update $schema silently
		if (existingParsed.$schema !== MARKDOWNLINT_SCHEMA) {
			const edits = modify(updatedText, ["$schema"], MARKDOWNLINT_SCHEMA, { formattingOptions: JSONC_FORMAT });
			updatedText = applyEdits(updatedText, edits);
			schemaUpdated = true;
		}

		// Compare config with isDeepStrictEqual
		const existingConfig = existingParsed.config as Record<string, unknown> | undefined;
		const configMatches = existingConfig !== undefined && isDeepStrictEqual(existingConfig, MARKDOWNLINT_CONFIG);

		if (!configMatches) {
			yield* Effect.log(
				`${WARNING} ${MARKDOWNLINT_CONFIG_PATH}: config rules differ from template (use --force to overwrite)`,
			);
			// Still write schema update if it changed
			if (schemaUpdated) {
				yield* fs.writeFileString(MARKDOWNLINT_CONFIG_PATH, updatedText);
				yield* Effect.log(`${CHECK_MARK} Updated $schema in ${MARKDOWNLINT_CONFIG_PATH}`);
			}
			return;
		}

		if (schemaUpdated) {
			yield* fs.writeFileString(MARKDOWNLINT_CONFIG_PATH, updatedText);
			yield* Effect.log(`${CHECK_MARK} Updated $schema in ${MARKDOWNLINT_CONFIG_PATH}`);
		} else {
			yield* Effect.log(`${CHECK_MARK} ${MARKDOWNLINT_CONFIG_PATH}: up-to-date`);
		}
	});
}

const forceOption = Options.boolean("force").pipe(
	Options.withAlias("f"),
	Options.withDescription("Overwrite entire hook file (not just managed section)"),
	Options.withDefault(false),
);

const configOption = Options.text("config").pipe(
	Options.withAlias("c"),
	Options.withDescription("Relative path for the lint-staged config file (from repo root)"),
	Options.withDefault(DEFAULT_CONFIG_PATH),
);

const presetOption = Options.choice("preset", ["minimal", "standard", "silk"]).pipe(
	Options.withAlias("p"),
	Options.withDescription("Preset to use: minimal, standard, or silk"),
	Options.withDefault("silk" as const),
);

/**
 * Make a file executable.
 *
 * @param path - File path to make executable
 * @returns Effect that makes the file executable
 */
function makeExecutable(path: string) {
	return Effect.tryPromise(() => import("node:fs/promises").then((fs) => fs.chmod(path, EXECUTABLE_MODE)));
}

/**
 * Write a hook file with create/update/force logic.
 *
 * @param fs - FileSystem service
 * @param hookPath - Path to the hook file
 * @param managedContent - The managed content (without markers)
 * @param comment - Header comment for new hook files
 * @param force - Whether to overwrite the entire file
 * @returns Effect that writes the hook
 */
function writeHook(
	fs: FileSystem.FileSystem,
	hookPath: string,
	managedContent: string,
	comment: string,
	force: boolean,
) {
	return Effect.gen(function* () {
		const hookExists = yield* fs.exists(hookPath);

		if (hookExists && !force) {
			const existingContent = yield* fs.readFileString(hookPath);
			const { found } = extractManagedSection(existingContent);

			const updatedContent = updateManagedSectionWithContent(existingContent, managedContent);
			yield* fs.writeFileString(hookPath, updatedContent);
			yield* makeExecutable(hookPath);

			if (found) {
				yield* Effect.log(`${CHECK_MARK} Updated managed section in ${hookPath}`);
			} else {
				yield* Effect.log(`${CHECK_MARK} Added managed section to ${hookPath}`);
			}
		} else if (hookExists && force) {
			yield* fs.writeFileString(hookPath, generateFullHookContentFromManaged(comment, managedContent));
			yield* makeExecutable(hookPath);
			yield* Effect.log(`${CHECK_MARK} Replaced ${hookPath} (--force)`);
		} else {
			yield* fs.makeDirectory(".husky", { recursive: true });
			yield* fs.writeFileString(hookPath, generateFullHookContentFromManaged(comment, managedContent));
			yield* makeExecutable(hookPath);
			yield* Effect.log(`${CHECK_MARK} Created ${hookPath}`);
		}
	});
}

/**
 * Init command implementation.
 *
 * @remarks
 * Creates the necessary configuration files for lint-staged:
 * - `.husky/pre-commit` hook with managed section
 * - `.husky/post-checkout` and `.husky/post-merge` hooks (when preset includes ShellScripts)
 * - `.markdownlint-cli2.jsonc` config (when preset includes Markdown)
 * - lint-staged config at the specified path
 *
 * The managed section feature allows users to add custom hooks above/below
 * the savvy-lint section without them being overwritten on updates.
 */
export const initCommand = Command.make(
	"init",
	{ force: forceOption, config: configOption, preset: presetOption },
	({ force, config, preset }) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;

			if (config.startsWith("/")) {
				yield* Effect.fail(new Error("Config path must be relative to repository root, not absolute"));
			}

			yield* Effect.log("Initializing lint-staged configuration...\n");

			// Write pre-commit hook (always)
			yield* writeHook(
				fs,
				HUSKY_HOOK_PATH,
				generateManagedContent(config),
				"Pre-commit hook with savvy-lint managed section",
				force,
			);

			// Write post-checkout and post-merge hooks (when preset includes ShellScripts)
			if (presetIncludesShellScripts(preset)) {
				const shellContent = generateShellScriptsManagedContent();

				yield* writeHook(
					fs,
					POST_CHECKOUT_HOOK_PATH,
					shellContent,
					"Post-checkout hook with savvy-lint managed section",
					force,
				);

				yield* writeHook(
					fs,
					POST_MERGE_HOOK_PATH,
					shellContent,
					"Post-merge hook with savvy-lint managed section",
					force,
				);
			}

			// Write markdownlint config (when preset includes Markdown)
			if (presetIncludesMarkdown(preset)) {
				yield* writeMarkdownlintConfig(fs, preset, force);
			}

			// Handle config file
			const configExists = yield* fs.exists(config);

			if (configExists && !force) {
				yield* Effect.log(`${WARNING} ${config} already exists (use --force to overwrite)`);
			} else {
				const configDir = dirname(config);
				if (configDir && configDir !== ".") {
					yield* fs.makeDirectory(configDir, { recursive: true });
				}
				yield* fs.writeFileString(config, generateConfigContent(preset));
				yield* Effect.log(`${CHECK_MARK} Created ${config} (preset: ${preset})`);
			}

			yield* Effect.log("\nDone! Lint-staged is ready to use.");
		}),
).pipe(Command.withDescription("Initialize lint-staged configuration and husky hooks"));

export {
	BEGIN_MARKER,
	END_MARKER,
	MARKDOWNLINT_CONFIG_PATH,
	POST_CHECKOUT_HOOK_PATH,
	POST_MERGE_HOOK_PATH,
	extractManagedSection,
	generateManagedContent,
	generateShellScriptsManagedContent,
};
