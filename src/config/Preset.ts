/**
 * Preset configurations for common lint-staged setups.
 *
 * @packageDocumentation
 */

import type { CreateConfigOptions, LintStagedConfig } from "../types.js";
import { createConfig } from "./createConfig.js";

/**
 * Options for extending a preset.
 */
export interface PresetExtendOptions extends CreateConfigOptions {
	// Inherits all CreateConfigOptions
}

/**
 * Preset configurations for common lint-staged setups.
 *
 * @example
 * ```typescript
 * import { Preset } from '@savvy-web/lint-staged';
 *
 * // Use a preset directly
 * export default Preset.standard();
 *
 * // Extend a preset with customizations
 * export default Preset.standard({
 *   biome: { exclude: ['vendor/'] },
 *   custom: {
 *     '*.css': (files) => `stylelint ${files.join(' ')}`,
 *   },
 * });
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class Preset {
	/**
	 * Minimal preset: formatting only.
	 *
	 * Includes:
	 * - PackageJson (sort + format)
	 * - Biome (format JS/TS/JSON)
	 *
	 * @param extend - Options to customize or extend the preset
	 * @returns A lint-staged configuration object
	 *
	 * @example
	 * ```typescript
	 * import { Preset } from '@savvy-web/lint-staged';
	 *
	 * export default Preset.minimal();
	 * ```
	 */
	static minimal(extend: PresetExtendOptions = {}): LintStagedConfig {
		return createConfig({
			// Enable only formatting handlers
			packageJson: extend.packageJson ?? {},
			biome: extend.biome ?? {},

			// Disable linting and advanced handlers
			markdown: extend.markdown ?? false,
			yaml: extend.yaml ?? false,
			pnpmWorkspace: extend.pnpmWorkspace ?? false,
			shellScripts: extend.shellScripts ?? false,
			typescript: extend.typescript ?? false,
			designDocs: extend.designDocs ?? false,

			// Custom handlers
			custom: extend.custom,
		});
	}

	/**
	 * Standard preset: formatting + linting.
	 *
	 * Includes:
	 * - PackageJson (sort + format)
	 * - Biome (format JS/TS/JSON)
	 * - Markdown (lint + fix)
	 * - Yaml (format + lint)
	 * - PnpmWorkspace (sort + format)
	 * - ShellScripts (chmod management)
	 *
	 * @param extend - Options to customize or extend the preset
	 * @returns A lint-staged configuration object
	 *
	 * @example
	 * ```typescript
	 * import { Preset } from '@savvy-web/lint-staged';
	 *
	 * export default Preset.standard({
	 *   biome: { exclude: ['legacy/'] },
	 * });
	 * ```
	 */
	static standard(extend: PresetExtendOptions = {}): LintStagedConfig {
		return createConfig({
			// Enable formatting and linting handlers
			packageJson: extend.packageJson ?? {},
			biome: extend.biome ?? {},
			markdown: extend.markdown ?? {},
			yaml: extend.yaml ?? {},
			pnpmWorkspace: extend.pnpmWorkspace ?? {},
			shellScripts: extend.shellScripts ?? {},

			// Disable advanced handlers
			typescript: extend.typescript ?? false,
			designDocs: extend.designDocs ?? false,

			// Custom handlers
			custom: extend.custom,
		});
	}

	/**
	 * Full preset: all handlers enabled.
	 *
	 * Includes:
	 * - PackageJson (sort + format)
	 * - Biome (format JS/TS/JSON)
	 * - Markdown (lint + fix)
	 * - Yaml (format + lint)
	 * - PnpmWorkspace (sort + format)
	 * - ShellScripts (chmod management)
	 * - TypeScript (TSDoc + typecheck)
	 * - DesignDocs (validation + timestamps)
	 *
	 * @param extend - Options to customize or extend the preset
	 * @returns A lint-staged configuration object
	 *
	 * @example
	 * ```typescript
	 * import { Preset } from '@savvy-web/lint-staged';
	 *
	 * export default Preset.full({
	 *   typescript: { skipTypecheck: true },
	 * });
	 * ```
	 */
	static full(extend: PresetExtendOptions = {}): LintStagedConfig {
		return createConfig({
			// Enable all handlers
			packageJson: extend.packageJson ?? {},
			biome: extend.biome ?? {},
			markdown: extend.markdown ?? {},
			yaml: extend.yaml ?? {},
			pnpmWorkspace: extend.pnpmWorkspace ?? {},
			shellScripts: extend.shellScripts ?? {},
			typescript: extend.typescript ?? {},
			designDocs: extend.designDocs ?? true, // Enable by default in full preset

			// Custom handlers
			custom: extend.custom,
		});
	}

	/**
	 * Get a preset by name.
	 *
	 * @param name - The preset name: 'minimal', 'standard', or 'full'
	 * @param extend - Options to customize or extend the preset
	 * @returns A lint-staged configuration object
	 *
	 * @example
	 * ```typescript
	 * import { Preset } from '@savvy-web/lint-staged';
	 *
	 * const presetName = process.env.LINT_PRESET || 'standard';
	 * export default Preset.get(presetName);
	 * ```
	 */
	static get(name: "minimal" | "standard" | "full", extend: PresetExtendOptions = {}): LintStagedConfig {
		switch (name) {
			case "minimal":
				return Preset.minimal(extend);
			case "full":
				return Preset.full(extend);
			default:
				return Preset.standard(extend);
		}
	}
}
