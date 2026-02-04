/**
 * Configuration factory for generating complete lint-staged configurations.
 */

import { Biome } from "../handlers/Biome.js";
import { Markdown } from "../handlers/Markdown.js";
import { PackageJson } from "../handlers/PackageJson.js";
import { PnpmWorkspace } from "../handlers/PnpmWorkspace.js";
import { ShellScripts } from "../handlers/ShellScripts.js";
import { TypeScript } from "../handlers/TypeScript.js";
import { Yaml } from "../handlers/Yaml.js";
import type { CreateConfigOptions, LintStagedConfig } from "../types.js";

/**
 * Create a complete lint-staged configuration with all handlers.
 *
 * @param options - Configuration options for each handler
 * @returns A lint-staged compatible configuration object
 *
 * @example
 * ```typescript
 * import { createConfig } from '@savvy-web/lint-staged';
 *
 * // Use all defaults
 * export default createConfig();
 *
 * // Customize specific handlers
 * export default createConfig({
 *   packageJson: { skipSort: true },
 *   biome: { exclude: ['vendor/'] },
 *   custom: {
 *     '*.css': (files) => `stylelint ${files.join(' ')}`,
 *   },
 * });
 * ```
 */
export function createConfig(options: CreateConfigOptions = {}): LintStagedConfig {
	const config: LintStagedConfig = {};

	// PackageJson handler
	if (options.packageJson !== false) {
		const handlerOptions = typeof options.packageJson === "object" ? options.packageJson : {};
		config[PackageJson.glob] = PackageJson.create(handlerOptions);
	}

	// Biome handler
	if (options.biome !== false) {
		const handlerOptions = typeof options.biome === "object" ? options.biome : {};
		config[Biome.glob] = Biome.create(handlerOptions);
	}

	// Markdown handler
	if (options.markdown !== false) {
		const handlerOptions = typeof options.markdown === "object" ? options.markdown : {};
		config[Markdown.glob] = Markdown.create(handlerOptions);
	}

	// Yaml handler
	if (options.yaml !== false) {
		const handlerOptions = typeof options.yaml === "object" ? options.yaml : {};
		config[Yaml.glob] = Yaml.create(handlerOptions);
	}

	// PnpmWorkspace handler
	if (options.pnpmWorkspace !== false) {
		const handlerOptions = typeof options.pnpmWorkspace === "object" ? options.pnpmWorkspace : {};
		config[PnpmWorkspace.glob] = PnpmWorkspace.create(handlerOptions);
	}

	// ShellScripts handler
	if (options.shellScripts !== false) {
		const handlerOptions = typeof options.shellScripts === "object" ? options.shellScripts : {};
		config[ShellScripts.glob] = ShellScripts.create(handlerOptions);
	}

	// TypeScript handler
	if (options.typescript !== false) {
		const handlerOptions = typeof options.typescript === "object" ? options.typescript : {};
		config[TypeScript.glob] = TypeScript.create(handlerOptions);
	}

	// Custom handlers
	if (options.custom) {
		for (const [glob, handler] of Object.entries(options.custom)) {
			config[glob] = handler;
		}
	}

	return config;
}
