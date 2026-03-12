import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";
// biome-ignore lint/correctness/useImportExtensions: JSON import requires .json extension
import pkg from "./package.json" with { type: "json" };

export default NodeLibraryBuilder.create({
	// Externalize typescript - it uses __filename which doesn't work when bundled in ESM
	// Also externalize source-map-support which is an optional typescript dependency
	externals: ["typescript", "source-map-support"],
	define: {
		"process.env.__BIOME_PEER_VERSION__": JSON.stringify(pkg.peerDependencies["@biomejs/biome"]),
	},
	copyPatterns: [
		{
			from: "./**/*.jsonc",
			context: "./src/public",
		},
	],
	transform({ pkg }) {
		delete pkg.devDependencies;
		delete pkg.bundleDependencies;
		delete pkg.publishConfig;
		delete pkg.packageManager;
		delete pkg.devEngines;
		delete pkg.config;
		delete pkg.scripts;
		return pkg;
	},
});
