import { VitestConfig } from "@savvy-web/vitest";

export default VitestConfig.create({
	coverageExclude: ["src/bin/**", "src/cli/**"],
});
