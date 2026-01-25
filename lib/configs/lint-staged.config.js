/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 *
 * Dogfooding our own @savvy-web/lint-staged module.
 */

import {
	Biome,
	DesignDocs,
	Markdown,
	PackageJson,
	PnpmWorkspace,
	ShellScripts,
	TypeScript,
	Yaml,
} from "../../dist/dev/index.js";

export default {
	[PackageJson.glob]: PackageJson.handler,
	[Biome.glob]: Biome.handler,
	[DesignDocs.glob]: DesignDocs.handler,
	[Markdown.glob]: Markdown.create({ config: "./lib/configs/.markdownlint-cli2.jsonc" }),
	[PnpmWorkspace.glob]: PnpmWorkspace.handler,
	[ShellScripts.glob]: ShellScripts.handler,
	[Yaml.glob]: Yaml.handler,
	[TypeScript.glob]: TypeScript.create({ eslintConfig: "./lib/configs/eslint.config.ts" }),
};
