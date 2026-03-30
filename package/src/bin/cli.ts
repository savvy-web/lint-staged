#!/usr/bin/env node
/**
 * CLI binary entry point.
 *
 * @remarks
 * This file is the entry point for the `savvy-lint` CLI command.
 * It simply delegates to the CLI module which handles all command parsing.
 *
 * @internal
 */
import { runCli } from "../cli/index.js";

runCli();
