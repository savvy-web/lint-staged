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

		// Ensure bin paths have ./ prefix (npm requires this)
		if (pkg.bin && typeof pkg.bin === "object") {
			for (const [name, path] of Object.entries(pkg.bin)) {
				if (typeof path === "string" && !path.startsWith("./")) {
					pkg.bin[name] = `./${path}`;
				}
			}
		}

		return pkg;
	},
});
