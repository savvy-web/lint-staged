/**
 * Fmt command - format files in-place for lint-staged staging.
 *
 * @remarks
 * These subcommands modify files via CLI commands rather than in handler
 * function bodies, so lint-staged can detect the modifications and
 * auto-stage them between array steps.
 *
 * @internal
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import sortPackageJson from "sort-package-json";
import { parse, stringify } from "yaml";
import type { PnpmWorkspaceContent } from "../../handlers/PnpmWorkspace.js";
import { PnpmWorkspace } from "../../handlers/PnpmWorkspace.js";
import { Yaml } from "../../handlers/Yaml.js";

/** Default YAML stringify options matching PnpmWorkspace handler. */
const YAML_STRINGIFY_OPTIONS = {
	indent: 2,
	lineWidth: 0,
	singleQuote: false,
} as const;

/** Repeated file path arguments. */
const filesArg = Args.repeated(Args.file({ name: "files", exists: "yes" }));

/** Sort package.json files with sort-package-json. */
const packageJsonCommand = Command.make("package-json", { files: filesArg }, ({ files }) =>
	Effect.sync(() => {
		for (const filepath of files) {
			const content = readFileSync(filepath, "utf-8");
			const sorted = sortPackageJson(content);
			if (sorted !== content) {
				writeFileSync(filepath, sorted, "utf-8");
			}
		}
	}),
);

/** Sort and format pnpm-workspace.yaml. */
const pnpmWorkspaceCommand = Command.make("pnpm-workspace", {}, () =>
	Effect.sync(() => {
		const filepath = "pnpm-workspace.yaml";

		if (!existsSync(filepath)) {
			return;
		}

		const content = readFileSync(filepath, "utf-8");
		const parsed = parse(content) as PnpmWorkspaceContent;
		const sorted = PnpmWorkspace.sortContent(parsed);
		const formatted = stringify(sorted, YAML_STRINGIFY_OPTIONS);
		writeFileSync(filepath, formatted, "utf-8");
	}),
);

/** Format YAML files with Prettier. */
const yamlCommand = Command.make("yaml", { files: filesArg }, ({ files }) =>
	Effect.gen(function* () {
		for (const filepath of files) {
			yield* Effect.promise(() => Yaml.formatFile(filepath));
		}
	}),
);

/** Parent fmt command with formatting subcommands. */
export const fmtCommand = Command.make("fmt").pipe(
	Command.withSubcommands([packageJsonCommand, pnpmWorkspaceCommand, yamlCommand]),
);
