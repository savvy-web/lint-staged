import { describe, expect, it } from "vitest";
import type { EntryExtractionResult } from "./EntryExtractor.js";
import { EntryExtractor } from "./EntryExtractor.js";

describe("EntryExtractor", () => {
	const extractor = new EntryExtractor();

	describe("extract", () => {
		it("should extract from string exports", () => {
			const result = extractor.extract({ exports: "./src/index.ts" });
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
			expect(result.unresolved).toEqual([]);
		});

		it("should mark non-TS string exports as unresolved", () => {
			const result = extractor.extract({ exports: "./dist/index.js" });
			expect(result.entries).toEqual({});
			expect(result.unresolved).toEqual(["."]);
		});

		it("should extract from object exports with subpaths", () => {
			const result = extractor.extract({
				exports: {
					".": "./src/index.ts",
					"./utils": "./src/utils/index.ts",
				},
			});
			expect(result.entries).toEqual({
				".": "./src/index.ts",
				"./utils": "./src/utils/index.ts",
			});
			expect(result.unresolved).toEqual([]);
		});

		it("should extract from conditional exports with source condition", () => {
			const result = extractor.extract({
				exports: {
					".": {
						source: "./src/index.ts",
						import: "./dist/index.mjs",
						require: "./dist/index.cjs",
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should extract from conditional exports with typescript condition", () => {
			const result = extractor.extract({
				exports: {
					".": {
						typescript: "./src/index.ts",
						import: "./dist/index.mjs",
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should extract from conditional exports with development condition", () => {
			const result = extractor.extract({
				exports: {
					".": {
						development: "./src/index.tsx",
						default: "./dist/index.js",
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.tsx" });
		});

		it("should extract from nested conditional exports", () => {
			const result = extractor.extract({
				exports: {
					".": {
						import: {
							source: "./src/index.mts",
							default: "./dist/index.mjs",
						},
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.mts" });
		});

		it("should handle subpath exports with conditions", () => {
			const result = extractor.extract({
				exports: {
					".": "./src/index.ts",
					"./utils": {
						source: "./src/utils.ts",
						import: "./dist/utils.mjs",
					},
				},
			});
			expect(result.entries).toEqual({
				".": "./src/index.ts",
				"./utils": "./src/utils.ts",
			});
		});

		it("should fall back to main field when no exports", () => {
			const result = extractor.extract({ main: "./src/index.ts" });
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should prefer module over main when no exports", () => {
			const result = extractor.extract({
				main: "./dist/index.js",
				module: "./src/index.ts",
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should mark non-TS main as unresolved", () => {
			const result = extractor.extract({ main: "./dist/index.js" });
			expect(result.entries).toEqual({});
			expect(result.unresolved).toEqual(["."]);
		});

		it("should return empty for no exports/main/module", () => {
			const result = extractor.extract({});
			expect(result.entries).toEqual({});
			expect(result.unresolved).toEqual([]);
		});

		it("should return empty for null exports", () => {
			const result = extractor.extract({ exports: null });
			expect(result.entries).toEqual({});
			expect(result.unresolved).toEqual([]);
		});

		it("should handle .tsx files", () => {
			const result = extractor.extract({ exports: "./src/App.tsx" });
			expect(result.entries).toEqual({ ".": "./src/App.tsx" });
		});

		it("should handle .mts files", () => {
			const result = extractor.extract({ exports: "./src/index.mts" });
			expect(result.entries).toEqual({ ".": "./src/index.mts" });
		});

		it("should handle .cts files", () => {
			const result = extractor.extract({ exports: "./src/index.cts" });
			expect(result.entries).toEqual({ ".": "./src/index.cts" });
		});

		it("should mark non-TS subpath exports as unresolved", () => {
			const result = extractor.extract({
				exports: {
					".": "./src/index.ts",
					"./styles": "./dist/styles.css",
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
			expect(result.unresolved).toEqual(["./styles"]);
		});

		it("should handle condition object without TS files via source fallback", () => {
			const result: EntryExtractionResult = extractor.extract({
				exports: {
					".": {
						import: "./dist/index.mjs",
						require: "./dist/index.cjs",
					},
				},
			});
			// No TS conditions and source conditions resolve to non-TS files
			expect(result.entries).toEqual({});
		});

		it("should recurse into nested default conditions", () => {
			const result = extractor.extract({
				exports: {
					".": {
						default: {
							source: "./src/index.ts",
							default: "./dist/index.js",
						},
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should resolve TS file via findSourceCondition when no TS conditions exist", () => {
			// This triggers the findSourceCondition fallback (lines 128-131)
			const result = extractor.extract({
				exports: {
					".": {
						node: {
							import: "./src/index.ts",
						},
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should resolve non-TS file via findSourceCondition and skip it", () => {
			const result = extractor.extract({
				exports: {
					".": {
						node: {
							import: "./dist/index.mjs",
						},
					},
				},
			});
			expect(result.entries).toEqual({});
		});

		it("should resolve via nested findSourceCondition", () => {
			// Tests the recursive object branch in findSourceCondition (lines 172-174)
			const result = extractor.extract({
				exports: {
					".": {
						node: {
							import: {
								default: "./src/index.ts",
							},
						},
					},
				},
			});
			expect(result.entries).toEqual({ ".": "./src/index.ts" });
		});

		it("should handle findTypeScriptCondition with string non-TS default", () => {
			const result = extractor.extract({
				exports: {
					".": {
						default: "./dist/index.js",
					},
				},
			});
			// default is a string but not TS, so findTypeScriptCondition skips it
			// Then findSourceCondition finds it as source, but it's not TS
			expect(result.entries).toEqual({});
		});
	});
});
