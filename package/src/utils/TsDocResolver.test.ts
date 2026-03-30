import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TsDocResolver } from "./TsDocResolver.js";

const PROJECT_ROOT = join(import.meta.dirname, "../..");

describe("TsDocResolver", () => {
	describe("resolve", () => {
		it("should resolve workspaces for the current project", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const result = resolver.resolve();

			// This project has a tsdoc.json and exports
			expect(result.workspaces.length).toBeGreaterThanOrEqual(1);
			expect(result.workspaces[0]?.files.length).toBeGreaterThan(0);
			expect(result.workspaces[0]?.tsdocConfigPath).toContain("tsdoc.json");
		});

		it("should detect monorepo status", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const result = resolver.resolve();

			expect(typeof result.isMonorepo).toBe("boolean");
		});

		it("should include repo-level tsdoc.json if present", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const result = resolver.resolve();

			// This project has tsdoc.json at root
			expect(result.repoTsdocConfig).toContain("tsdoc.json");
		});
	});

	describe("filterStagedFiles", () => {
		it("should filter staged files to those needing TSDoc linting", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const indexFile = join(PROJECT_ROOT, "src/index.ts");

			const groups = resolver.filterStagedFiles([indexFile]);

			// src/index.ts should be part of the public API
			expect(groups.length).toBeGreaterThanOrEqual(1);
			const allFiles = groups.flatMap((g) => g.files);
			expect(allFiles).toContain(indexFile);
		});

		it("should return empty for files not in public API", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const testFile = join(PROJECT_ROOT, "src/index.test.ts");

			const groups = resolver.filterStagedFiles([testFile]);
			const allFiles = groups.flatMap((g) => g.files);
			expect(allFiles).not.toContain(testFile);
		});

		it("should return empty for non-existent files", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const fakeFile = join(PROJECT_ROOT, "src/nonexistent.ts");

			const groups = resolver.filterStagedFiles([fakeFile]);
			const allFiles = groups.flatMap((g) => g.files);
			expect(allFiles).toEqual([]);
		});

		it("should include tsdocConfigPath in each group", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const indexFile = join(PROJECT_ROOT, "src/index.ts");

			const groups = resolver.filterStagedFiles([indexFile]);

			for (const group of groups) {
				expect(group.tsdocConfigPath).toBeTruthy();
				expect(group.tsdocConfigPath).toContain("tsdoc.json");
			}
		});
	});

	describe("needsLinting", () => {
		it("should return true for public API files", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const indexFile = join(PROJECT_ROOT, "src/index.ts");

			expect(resolver.needsLinting(indexFile)).toBe(true);
		});

		it("should return false for test files", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const testFile = join(PROJECT_ROOT, "src/index.test.ts");

			expect(resolver.needsLinting(testFile)).toBe(false);
		});

		it("should return false for non-existent files", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			expect(resolver.needsLinting("/nonexistent/file.ts")).toBe(false);
		});
	});

	describe("getTsDocConfig", () => {
		it("should return config path for public API files", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const indexFile = join(PROJECT_ROOT, "src/index.ts");

			const config = resolver.getTsDocConfig(indexFile);
			expect(config).toContain("tsdoc.json");
		});

		it("should return undefined for non-public files", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });

			const config = resolver.getTsDocConfig("/nonexistent/file.ts");
			expect(config).toBeUndefined();
		});
	});

	describe("findWorkspace", () => {
		it("should find workspace for files within it", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });
			const indexFile = join(PROJECT_ROOT, "src/index.ts");

			const workspace = resolver.findWorkspace(indexFile);
			expect(workspace).toBeDefined();
			expect(workspace?.name).toBe("@savvy-web/lint-staged");
		});

		it("should return undefined for files outside any workspace", () => {
			const resolver = new TsDocResolver({ rootDir: PROJECT_ROOT });

			const workspace = resolver.findWorkspace("/completely/different/path.ts");
			expect(workspace).toBeUndefined();
		});
	});

	describe("excludePatterns", () => {
		it("should pass exclude patterns to ImportGraph", () => {
			const resolver = new TsDocResolver({
				rootDir: PROJECT_ROOT,
				excludePatterns: ["Handler"],
			});

			const result = resolver.resolve();
			// Files matching the exclude pattern should be filtered out
			for (const workspace of result.workspaces) {
				const handlerFiles = workspace.files.filter((f) => f.includes("Handler.ts"));
				expect(handlerFiles).toEqual([]);
			}
		});
	});
});
