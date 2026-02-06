import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	// Externalize typescript - it uses __filename which doesn't work when bundled in ESM
	// Also externalize source-map-support which is an optional typescript dependency
	externals: ["typescript", "source-map-support"],
	copyPatterns: [
		{
			from: "./**/*.jsonc",
			context: "./src/public",
		},
	],
	transform({ pkg }) {
		pkg.scripts = {
			postinstall: "savvy-lint check --quiet || true",
		};
		delete pkg.devDependencies;
		delete pkg.publishConfig;
		delete pkg.devEngines;
		return pkg;
	},
});
