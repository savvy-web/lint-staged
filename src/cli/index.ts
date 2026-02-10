/**
 * CLI entry point using `@effect/cli`.
 *
 * @remarks
 * This module provides the CLI application for managing lint-staged
 * configuration. It uses Effect for functional error handling and
 * `@effect/cli` for command parsing.
 *
 * @internal
 */
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";
import { checkCommand, fmtCommand, initCommand } from "./commands/index.js";

/** Root command for the CLI with all subcommands. */
const rootCommand = Command.make("savvy-lint").pipe(Command.withSubcommands([initCommand, checkCommand, fmtCommand]));

/** CLI application runner. */
const cli = Command.run(rootCommand, {
	name: "savvy-lint",
	version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

/**
 * Run the CLI application.
 *
 * @remarks
 * Entry point for the CLI binary. Parses command-line arguments
 * and executes the appropriate subcommand.
 *
 * @internal
 */
export function runCli(): void {
	const main = Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(NodeContext.layer));
	NodeRuntime.runMain(main);
}

export { checkCommand, fmtCommand, initCommand, rootCommand };
