import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	// Externalize typescript - it uses __filename which doesn't work when bundled in ESM
	// Also externalize source-map-support which is an optional typescript dependency
	externals: ["typescript", "source-map-support"],
	transform({ pkg }) {
		delete pkg.devDependencies;
		pkg.scripts = {
			postinstall: "savvy-lint check --quiet || true",
		};
		delete pkg.publishConfig;
		return pkg;
	},
});
