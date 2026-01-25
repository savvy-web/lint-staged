/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 *
 * Dogfooding our own @savvy-web/lint-staged module.
 */

import { Preset } from "../../dist/dev/index.js";

export default Preset.full({
	markdown: { config: "./lib/configs/.markdownlint-cli2.jsonc" },
});
