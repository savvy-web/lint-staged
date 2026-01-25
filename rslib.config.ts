import type { ConfigParams, RslibConfig } from "@rslib/core";
import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

const config: (env: ConfigParams) => Promise<RslibConfig> = NodeLibraryBuilder.create({
	tsdocLint: true,
	// Externalize typescript - it uses __filename which doesn't work when bundled in ESM
	// Also externalize source-map-support which is an optional typescript dependency
	externals: ["typescript", "source-map-support"],
	async transform({ pkg }) {
		delete pkg.devDependencies;
		delete pkg.scripts;
		delete pkg.publishConfig;
		// Add typescript as a dependency since it's externalized
		pkg.dependencies = {
			...pkg.dependencies,
			typescript: "^5.0.0",
		};
		return pkg;
	},
});

export default config;
