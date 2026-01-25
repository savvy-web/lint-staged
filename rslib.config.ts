import type { ConfigParams, RslibConfig } from "@rslib/core";
import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

const config: (env: ConfigParams) => Promise<RslibConfig> = NodeLibraryBuilder.create({
	async transform({ pkg }) {
		delete pkg.devDependencies;
		delete pkg.scripts;
		delete pkg.publishConfig;
		return pkg;
	},
});

export default config;
