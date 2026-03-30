import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TsDocLintResult } from "./TsDocLinter.js";
import { TsDocLinter } from "./TsDocLinter.js";

const FIXTURES_DIR = join(import.meta.dirname, "__tsdoc_fixtures__");

describe("TsDocLinter", () => {
	beforeAll(() => {
		if (!existsSync(FIXTURES_DIR)) {
			mkdirSync(FIXTURES_DIR, { recursive: true });
		}
	});

	afterAll(() => {
		if (existsSync(FIXTURES_DIR)) {
			rmSync(FIXTURES_DIR, { recursive: true });
		}
	});

	describe("lintFiles", () => {
		it("should return empty array for empty file list", async () => {
			const linter = new TsDocLinter();
			const results = await linter.lintFiles([]);
			expect(results).toEqual([]);
		});

		it("should lint files with valid TSDoc", async () => {
			const file = join(FIXTURES_DIR, "valid.ts");
			writeFileSync(file, `/** A valid function. */\nexport function foo(): void {}\n`, "utf-8");

			const linter = new TsDocLinter();
			const results = await linter.lintFiles([file]);

			expect(results).toHaveLength(1);
			expect(results[0]?.errorCount).toBe(0);
		});

		it("should detect invalid TSDoc syntax", async () => {
			const file = join(FIXTURES_DIR, "invalid.ts");
			// Use an invalid TSDoc tag that eslint-plugin-tsdoc will catch
			writeFileSync(file, `/** @badtag This is invalid. */\nexport function bar(): void {}\n`, "utf-8");

			const linter = new TsDocLinter();
			const results = await linter.lintFiles([file]);

			expect(results).toHaveLength(1);
			expect(results[0]?.errorCount).toBeGreaterThan(0);
			expect(results[0]?.messages.length).toBeGreaterThan(0);
			expect(results[0]?.messages[0]?.ruleId).toBe("tsdoc/syntax");
		});

		it("should report line and column for errors", async () => {
			const file = join(FIXTURES_DIR, "location.ts");
			writeFileSync(file, `/** @badtag invalid */\nexport function baz(): void {}\n`, "utf-8");

			const linter = new TsDocLinter();
			const results = await linter.lintFiles([file]);

			expect(results[0]?.messages[0]?.line).toBeGreaterThan(0);
			expect(results[0]?.messages[0]?.column).toBeGreaterThan(0);
			expect(results[0]?.messages[0]?.severity).toBe(2);
		});
	});

	describe("lintFilesAndThrow", () => {
		it("should not throw for valid TSDoc", async () => {
			const file = join(FIXTURES_DIR, "valid-throw.ts");
			writeFileSync(file, `/** A valid function.\n * @returns Nothing. */\nexport function foo(): void {}\n`, "utf-8");

			const linter = new TsDocLinter();
			await expect(linter.lintFilesAndThrow([file])).resolves.toBeUndefined();
		});

		it("should throw for invalid TSDoc", async () => {
			const file = join(FIXTURES_DIR, "invalid-throw.ts");
			writeFileSync(file, `/** @badtag This is invalid. */\nexport function bar(): void {}\n`, "utf-8");

			const linter = new TsDocLinter();
			await expect(linter.lintFilesAndThrow([file])).rejects.toThrow("TSDoc validation failed");
		});

		it("should not throw for empty file list", async () => {
			const linter = new TsDocLinter();
			await expect(linter.lintFilesAndThrow([])).resolves.toBeUndefined();
		});
	});

	describe("formatResults", () => {
		it("should return empty string for clean results", () => {
			const results: TsDocLintResult[] = [{ filePath: "/test.ts", errorCount: 0, warningCount: 0, messages: [] }];
			expect(TsDocLinter.formatResults(results)).toBe("");
		});

		it("should format errors", () => {
			const results: TsDocLintResult[] = [
				{
					filePath: "/test.ts",
					errorCount: 1,
					warningCount: 0,
					messages: [{ line: 1, column: 5, severity: 2, message: "Bad tag", ruleId: "tsdoc/syntax" }],
				},
			];
			const output = TsDocLinter.formatResults(results);
			expect(output).toContain("/test.ts");
			expect(output).toContain("error");
			expect(output).toContain("Bad tag");
			expect(output).toContain("(tsdoc/syntax)");
			expect(output).toContain("1 error(s)");
		});

		it("should format warnings", () => {
			const results: TsDocLintResult[] = [
				{
					filePath: "/test.ts",
					errorCount: 0,
					warningCount: 1,
					messages: [{ line: 2, column: 1, severity: 1, message: "Minor issue", ruleId: null }],
				},
			];
			const output = TsDocLinter.formatResults(results);
			expect(output).toContain("warning");
			expect(output).toContain("Minor issue");
			expect(output).toContain("0 error(s), 1 warning(s)");
		});

		it("should skip clean files in output", () => {
			const results: TsDocLintResult[] = [
				{ filePath: "/clean.ts", errorCount: 0, warningCount: 0, messages: [] },
				{
					filePath: "/dirty.ts",
					errorCount: 1,
					warningCount: 0,
					messages: [{ line: 1, column: 1, severity: 2, message: "Error", ruleId: "tsdoc/syntax" }],
				},
			];
			const output = TsDocLinter.formatResults(results);
			expect(output).not.toContain("/clean.ts");
			expect(output).toContain("/dirty.ts");
		});
	});

	describe("hasErrors", () => {
		it("should return false for clean results", () => {
			const results: TsDocLintResult[] = [{ filePath: "/test.ts", errorCount: 0, warningCount: 0, messages: [] }];
			expect(TsDocLinter.hasErrors(results)).toBe(false);
		});

		it("should return true when errors exist", () => {
			const results: TsDocLintResult[] = [{ filePath: "/test.ts", errorCount: 1, warningCount: 0, messages: [] }];
			expect(TsDocLinter.hasErrors(results)).toBe(true);
		});

		it("should return false for warnings only", () => {
			const results: TsDocLintResult[] = [{ filePath: "/test.ts", errorCount: 0, warningCount: 3, messages: [] }];
			expect(TsDocLinter.hasErrors(results)).toBe(false);
		});
	});

	describe("constructor options", () => {
		it("should accept custom ignore patterns without throwing", () => {
			const linter = new TsDocLinter({ ignorePatterns: ["**/generated/**"] });
			expect(linter).toBeDefined();
		});

		it("should accept empty options", () => {
			const linter = new TsDocLinter();
			expect(linter).toBeDefined();
		});
	});
});
