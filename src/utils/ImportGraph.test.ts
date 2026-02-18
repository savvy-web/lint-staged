import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ImportGraph } from "./ImportGraph.js";

const FIXTURES_DIR = join(import.meta.dirname, "__importgraph_fixtures__");
const PROJECT_ROOT = join(import.meta.dirname, "../..");

describe("ImportGraph", () => {
	beforeAll(() => {
		if (!existsSync(FIXTURES_DIR)) {
			mkdirSync(FIXTURES_DIR, { recursive: true });
		}

		// Create fixture files for isolated tests
		writeFileSync(
			join(FIXTURES_DIR, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					module: "nodenext",
					moduleResolution: "nodenext",
					target: "esnext",
					strict: true,
				},
			}),
			"utf-8",
		);

		writeFileSync(
			join(FIXTURES_DIR, "entry.ts"),
			`import { helper } from "./helper.js";\nexport const main = helper();\n`,
			"utf-8",
		);

		writeFileSync(
			join(FIXTURES_DIR, "helper.ts"),
			`import { util } from "./util.js";\nexport function helper(): string { return util(); }\n`,
			"utf-8",
		);

		writeFileSync(join(FIXTURES_DIR, "util.ts"), `export function util(): string { return "ok"; }\n`, "utf-8");

		writeFileSync(
			join(FIXTURES_DIR, "circular-a.ts"),
			`import { b } from "./circular-b.js";\nexport const a = "a";\nexport { b };\n`,
			"utf-8",
		);

		writeFileSync(
			join(FIXTURES_DIR, "circular-b.ts"),
			`import { a } from "./circular-a.js";\nexport const b = "b";\nexport { a };\n`,
			"utf-8",
		);

		writeFileSync(
			join(FIXTURES_DIR, "with-reexport.ts"),
			`export { helper } from "./helper.js";\nexport * from "./util.js";\n`,
			"utf-8",
		);

		writeFileSync(
			join(FIXTURES_DIR, "entry.test.ts"),
			`import { main } from "./entry.js";\nconsole.log(main);\n`,
			"utf-8",
		);

		writeFileSync(
			join(FIXTURES_DIR, "package.json"),
			JSON.stringify({
				name: "test-fixture",
				exports: {
					".": "./entry.ts",
					"./helper": "./helper.ts",
				},
			}),
			"utf-8",
		);
	});

	afterAll(() => {
		if (existsSync(FIXTURES_DIR)) {
			rmSync(FIXTURES_DIR, { recursive: true });
		}
	});

	describe("traceFromEntries", () => {
		it("should trace imports from a single entry point", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["entry.ts"]);

			expect(result.errors).toEqual([]);
			expect(result.entries).toHaveLength(1);
			// Should find entry.ts, helper.ts, util.ts
			expect(result.files).toContain(join(FIXTURES_DIR, "entry.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "helper.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "util.ts"));
		});

		it("should trace multiple entry points", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["entry.ts", "util.ts"]);

			expect(result.entries).toHaveLength(2);
			expect(result.files).toContain(join(FIXTURES_DIR, "entry.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "util.ts"));
		});

		it("should handle circular imports", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["circular-a.ts"]);

			expect(result.errors).toEqual([]);
			expect(result.files).toContain(join(FIXTURES_DIR, "circular-a.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "circular-b.ts"));
		});

		it("should trace re-exports", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["with-reexport.ts"]);

			expect(result.errors).toEqual([]);
			expect(result.files).toContain(join(FIXTURES_DIR, "with-reexport.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "helper.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "util.ts"));
		});

		it("should filter out test files", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["entry.ts"]);

			const testFiles = result.files.filter((f) => f.includes(".test."));
			expect(testFiles).toEqual([]);
		});

		it("should report error for missing entry file", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["nonexistent.ts"]);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.type).toBe("entry_not_found");
		});

		it("should return sorted file list", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromEntries(["entry.ts"]);

			const sorted = [...result.files].sort();
			expect(result.files).toEqual(sorted);
		});

		it("should handle absolute entry paths", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const absolutePath = join(FIXTURES_DIR, "entry.ts");
			const result = graph.traceFromEntries([absolutePath]);

			expect(result.errors).toEqual([]);
			expect(result.files).toContain(absolutePath);
		});

		it("should respect excludePatterns option", () => {
			const graph = new ImportGraph({
				rootDir: FIXTURES_DIR,
				excludePatterns: ["helper"],
			});
			const result = graph.traceFromEntries(["entry.ts"]);

			// entry.ts should be included but helper.ts should be excluded from results
			expect(result.files).toContain(join(FIXTURES_DIR, "entry.ts"));
			expect(result.files).not.toContain(join(FIXTURES_DIR, "helper.ts"));
		});
	});

	describe("traceFromPackageExports", () => {
		it("should trace from package.json exports", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromPackageExports("package.json");

			expect(result.errors).toEqual([]);
			expect(result.files).toContain(join(FIXTURES_DIR, "entry.ts"));
			expect(result.files).toContain(join(FIXTURES_DIR, "helper.ts"));
		});

		it("should return error for missing package.json", () => {
			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromPackageExports("nonexistent/package.json");

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.type).toBe("package_json_not_found");
		});

		it("should return error for invalid package.json", () => {
			const badPkg = join(FIXTURES_DIR, "bad-package.json");
			writeFileSync(badPkg, "not json", "utf-8");

			const graph = new ImportGraph({ rootDir: FIXTURES_DIR });
			const result = graph.traceFromPackageExports("bad-package.json");

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.type).toBe("package_json_parse_error");
		});

		it("should work with the actual project package.json", () => {
			const graph = new ImportGraph({ rootDir: PROJECT_ROOT });
			const result = graph.traceFromPackageExports(join(PROJECT_ROOT, "package.json"));

			expect(result.errors).toEqual([]);
			expect(result.files.length).toBeGreaterThan(0);
			// Should include the main index.ts and its dependencies
			expect(result.files).toContain(join(PROJECT_ROOT, "src/index.ts"));
		});
	});

	describe("static factory methods", () => {
		it("fromEntries should create graph and trace", () => {
			const result = ImportGraph.fromEntries(["entry.ts"], { rootDir: FIXTURES_DIR });

			expect(result.errors).toEqual([]);
			expect(result.files).toContain(join(FIXTURES_DIR, "entry.ts"));
		});

		it("fromPackageExports should create graph and trace", () => {
			const result = ImportGraph.fromPackageExports("package.json", { rootDir: FIXTURES_DIR });

			expect(result.errors).toEqual([]);
			expect(result.files).toContain(join(FIXTURES_DIR, "entry.ts"));
		});
	});

	describe("tsconfig handling", () => {
		it("should use custom tsconfig path", () => {
			const graph = new ImportGraph({
				rootDir: FIXTURES_DIR,
				tsconfigPath: "tsconfig.json",
			});
			const result = graph.traceFromEntries(["entry.ts"]);

			expect(result.errors).toEqual([]);
			expect(result.files.length).toBeGreaterThan(0);
		});

		it("should handle missing custom tsconfig gracefully", () => {
			const graph = new ImportGraph({
				rootDir: FIXTURES_DIR,
				tsconfigPath: "nonexistent-tsconfig.json",
			});
			const result = graph.traceFromEntries(["entry.ts"]);

			// Should still work using default compiler options
			expect(result.files.length).toBeGreaterThan(0);
		});
	});
});
