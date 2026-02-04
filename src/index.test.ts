import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	Biome,
	Command,
	ConfigSearch,
	Filter,
	Markdown,
	PackageJson,
	PnpmWorkspace,
	Preset,
	ShellScripts,
	TypeScript,
	Yaml,
	createConfig,
} from "./index.js";

// Test fixtures directory for handler tests
const FIXTURES_DIR: string = join(import.meta.dirname, "__test_fixtures__");

describe("Handler classes", () => {
	beforeAll(() => {
		// Create test fixtures directory
		if (!existsSync(FIXTURES_DIR)) {
			mkdirSync(FIXTURES_DIR, { recursive: true });
		}
	});

	afterAll(() => {
		// Clean up test fixtures
		if (existsSync(FIXTURES_DIR)) {
			rmSync(FIXTURES_DIR, { recursive: true });
		}
	});

	describe("PackageJson", () => {
		it("should have correct glob pattern", () => {
			expect(PackageJson.glob).toBe("**/package.json");
		});

		it("should have default excludes", () => {
			expect(PackageJson.defaultExcludes).toContain("dist/package.json");
			expect(PackageJson.defaultExcludes).toContain("__fixtures__");
		});

		it("should filter excluded files and sort in-place", () => {
			// Create a test package.json with unsorted keys
			const testFile = join(FIXTURES_DIR, "package.json");
			const unsorted = '{"version": "1.0.0", "name": "test"}';
			writeFileSync(testFile, unsorted, "utf-8");

			const handler = PackageJson.create();
			const result = handler([testFile, "dist/package.json", "__fixtures__/package.json"]);

			// Should return biome command chained with git add to stage all changes
			expect(result).toBe(`biome check --write --max-diagnostics=none ${testFile} && git add ${testFile}`);

			// File should have been sorted (name before version)
			const sorted = readFileSync(testFile, "utf-8");
			expect(sorted).toContain('"name"');
			expect(sorted.indexOf('"name"')).toBeLessThan(sorted.indexOf('"version"'));
		});

		it("should skip sort when option is set", () => {
			// Create a test package.json with unsorted keys
			const testFile = join(FIXTURES_DIR, "skip-sort-package.json");
			const unsorted = '{"version": "1.0.0", "name": "test"}';
			writeFileSync(testFile, unsorted, "utf-8");

			const handler = PackageJson.create({ skipSort: true });
			const result = handler([testFile]);

			expect(result).toBe(`biome check --write --max-diagnostics=none ${testFile} && git add ${testFile}`);

			// File should NOT have been sorted
			const content = readFileSync(testFile, "utf-8");
			expect(content).toBe(unsorted);
		});

		it("should return empty array when all files excluded", () => {
			const handler = PackageJson.create();
			const result = handler(["dist/package.json"]);
			expect(result).toEqual([]);
		});
	});

	describe("Biome", () => {
		it("should have correct glob pattern", () => {
			expect(Biome.glob).toBe("*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}");
		});

		it("should filter excluded files", () => {
			const handler = Biome.create();
			const result = handler(["src/index.ts", "package-lock.json", "__fixtures__/test.ts"]);
			expect(result).toContain("biome check --write --no-errors-on-unmatched");
			expect(result).toContain("src/index.ts");
			expect(result).not.toContain("package-lock.json");
		});

		it("should accept custom config", () => {
			const handler = Biome.create({ config: "./custom-biome.json" });
			const result = handler(["src/index.ts"]);
			expect(result).toContain("--config-path=./custom-biome.json");
		});

		it("should have findConfig method", () => {
			expect(typeof Biome.findConfig).toBe("function");
		});

		it("should have findBiome method", () => {
			expect(typeof Biome.findBiome).toBe("function");
		});

		it("should have isAvailable method", () => {
			expect(typeof Biome.isAvailable).toBe("function");
			// Biome is a dev dependency, so it should be available
			expect(Biome.isAvailable()).toBe(true);
		});
	});

	describe("Markdown", () => {
		it("should have correct glob pattern", () => {
			expect(Markdown.glob).toBe("**/*.{md,mdx}");
		});

		it("should use explicit config when provided", () => {
			const handler = Markdown.create({ config: "./custom.jsonc" });
			const result = handler(["README.md"]);
			expect(result).toContain("--config './custom.jsonc'");
			expect(result).toContain("--fix");
		});

		it("should work without config (auto-discovery)", () => {
			const handler = Markdown.create();
			const result = handler(["README.md"]);
			expect(result).toContain("markdownlint-cli2");
			expect(result).toContain("--fix");
			expect(result).toContain("README.md");
		});

		it("should respect noFix option", () => {
			const handler = Markdown.create({ noFix: true });
			const result = handler(["README.md"]);
			expect(result).not.toContain("--fix");
		});

		it("should have findMarkdownlint method", () => {
			expect(typeof Markdown.findMarkdownlint).toBe("function");
		});

		it("should have isAvailable method", () => {
			expect(typeof Markdown.isAvailable).toBe("function");
			// markdownlint-cli2 is a dev dependency, so it should be available
			expect(Markdown.isAvailable()).toBe(true);
		});
	});

	describe("Yaml", () => {
		it("should have correct glob pattern", () => {
			expect(Yaml.glob).toBe("**/*.{yml,yaml}");
		});

		it("should exclude pnpm files by default and format in-place", () => {
			// Create a test YAML file with valid but unformatted content
			const testFile = join(FIXTURES_DIR, "config.yaml");
			const unformatted = "key:   value\nother:    value2";
			writeFileSync(testFile, unformatted, "utf-8");

			const handler = Yaml.create();
			const result = handler([testFile, "pnpm-lock.yaml", "pnpm-workspace.yaml"]);

			// Should return git add command to re-stage modified files
			expect(result).toBe(`git add ${testFile}`);

			// File should be formatted (extra spaces removed)
			const formatted = readFileSync(testFile, "utf-8");
			expect(formatted).toContain("key: value");
			expect(formatted).toContain("other: value2");
		});

		it("should skip formatting when option is set", () => {
			const testFile = join(FIXTURES_DIR, "skip-format.yaml");
			const content = "key:   value\n";
			writeFileSync(testFile, content, "utf-8");

			const handler = Yaml.create({ skipFormat: true, skipValidate: true });
			const result = handler([testFile]);

			expect(result).toEqual([]);
			// File should not be modified
			expect(readFileSync(testFile, "utf-8")).toBe(content);
		});

		it("should have formatFile and validateFile static methods", () => {
			expect(typeof Yaml.formatFile).toBe("function");
			expect(typeof Yaml.validateFile).toBe("function");
		});
	});

	describe("PnpmWorkspace", () => {
		it("should have correct glob pattern", () => {
			expect(PnpmWorkspace.glob).toBe("pnpm-workspace.yaml");
		});

		it("should sort and format in-place", () => {
			// Create a backup of the actual file
			const filepath = "pnpm-workspace.yaml";
			const original = readFileSync(filepath, "utf-8");

			try {
				// Write unsorted content
				const unsorted = "onlyBuiltDependencies:\n  - zlib\n  - abc\npackages:\n  - z-pkg\n  - a-pkg\n";
				writeFileSync(filepath, unsorted, "utf-8");

				const handler = PnpmWorkspace.create();
				const result = handler([]);

				// Should return git add command to re-stage the modified file
				expect(result).toBe("git add pnpm-workspace.yaml");

				// File should be sorted and formatted
				const content = readFileSync(filepath, "utf-8");
				// packages should be first (sorted), and both arrays should be sorted
				expect(content.indexOf("packages")).toBeLessThan(content.indexOf("onlyBuiltDependencies"));
				expect(content.indexOf("a-pkg")).toBeLessThan(content.indexOf("z-pkg"));
				expect(content.indexOf("abc")).toBeLessThan(content.indexOf("zlib"));
			} finally {
				// Restore original file
				writeFileSync(filepath, original, "utf-8");
			}
		});

		it("should have sortContent static method", () => {
			expect(typeof PnpmWorkspace.sortContent).toBe("function");

			const sorted = PnpmWorkspace.sortContent({
				onlyBuiltDependencies: ["z", "a"],
				packages: ["z-pkg", "a-pkg"],
			});

			expect(sorted.packages).toEqual(["a-pkg", "z-pkg"]);
			expect(sorted.onlyBuiltDependencies).toEqual(["a", "z"]);
			// packages should be first key
			expect(Object.keys(sorted)[0]).toBe("packages");
		});
	});

	describe("ShellScripts", () => {
		it("should have correct glob pattern", () => {
			expect(ShellScripts.glob).toBe("**/*.sh");
		});

		it("should exclude .claude/scripts by default", () => {
			const handler = ShellScripts.create();
			const result = handler(["scripts/build.sh", ".claude/scripts/hook.sh"]);
			expect(result).toEqual(["chmod -x scripts/build.sh"]);
		});

		it("should make executable when option is set", () => {
			const handler = ShellScripts.create({ makeExecutable: true });
			const result = handler(["scripts/build.sh"]);
			expect(result).toEqual(["chmod +x scripts/build.sh"]);
		});
	});

	describe("TypeScript", () => {
		it("should have correct glob pattern", () => {
			expect(TypeScript.glob).toBe("*.{ts,cts,mts,tsx}");
		});

		it("should run typecheck when tsdoc is skipped", async () => {
			const handler = TypeScript.create({ skipTsdoc: true });
			const result = await handler(["src/index.ts"]);
			expect(result).toHaveLength(1);
			expect((result as string[])[0]).toContain("tsgo");
		});

		it("should run tsdoc linting programmatically and return only typecheck", async () => {
			// TSDoc linting now runs programmatically (not as a command)
			// The handler returns only the typecheck command
			const handler = TypeScript.create();
			const result = await handler(["src/index.ts"]);
			// Should only have typecheck command (TSDoc runs programmatically)
			expect(result).toHaveLength(1);
			expect((result as string[])[0]).toContain("tsgo --noEmit");
		});

		it("should return empty when both tsdoc and typecheck are skipped", async () => {
			const handler = TypeScript.create({ skipTsdoc: true, skipTypecheck: true });
			const result = await handler(["src/index.ts"]);
			expect(result).toEqual([]);
		});

		it("should use detected package manager for typecheck command", () => {
			// This repo uses pnpm and @typescript/native-preview, so command should use pnpm exec tsgo
			const cmd = TypeScript.getDefaultTypecheckCommand();
			expect(cmd).toBe("pnpm exec tsgo --noEmit");
		});

		it("should detect tsgo compiler when @typescript/native-preview is installed", () => {
			// This repo has @typescript/native-preview installed
			const compiler = TypeScript.detectCompiler();
			expect(compiler).toBe("tsgo");
		});

		it("should have isAvailable method", () => {
			expect(typeof TypeScript.isAvailable).toBe("function");
			// This repo has TypeScript installed
			expect(TypeScript.isAvailable()).toBe(true);
		});

		it("should have isTsdocAvailable method", () => {
			expect(typeof TypeScript.isTsdocAvailable).toBe("function");
		});
	});
});

describe("Utility classes", () => {
	describe("Filter", () => {
		it("should exclude files matching patterns", () => {
			const files = ["src/index.ts", "dist/index.js", "__fixtures__/test.ts"];
			const result = Filter.exclude(files, ["dist/", "__fixtures__"]);
			expect(result).toEqual(["src/index.ts"]);
		});

		it("should include only files matching patterns", () => {
			const files = ["src/index.ts", "lib/utils.ts", "test/foo.test.ts"];
			const result = Filter.include(files, ["src/", "lib/"]);
			expect(result).toEqual(["src/index.ts", "lib/utils.ts"]);
		});

		it("should apply both include and exclude", () => {
			const files = ["src/index.ts", "src/index.test.ts", "lib/utils.ts"];
			const result = Filter.apply(files, {
				include: ["src/"],
				exclude: [".test."],
			});
			expect(result).toEqual(["src/index.ts"]);
		});
	});

	describe("Command", () => {
		it("should detect available commands", () => {
			// 'node' should always be available in test environment
			expect(Command.isAvailable("node")).toBe(true);
		});

		it("should return false for non-existent commands", () => {
			expect(Command.isAvailable("definitely-not-a-real-command-12345")).toBe(false);
		});

		it("should detect package manager from package.json", () => {
			// Clear cache first to ensure fresh detection
			Command.clearCache();
			// This repo uses pnpm
			const pm = Command.detectPackageManager();
			expect(pm).toBe("pnpm");
		});

		it("should return correct exec prefix for each package manager", () => {
			expect(Command.getExecPrefix("npm")).toEqual(["npx", "--no"]);
			expect(Command.getExecPrefix("pnpm")).toEqual(["pnpm", "exec"]);
			expect(Command.getExecPrefix("yarn")).toEqual(["yarn", "exec"]);
			expect(Command.getExecPrefix("bun")).toEqual(["bunx"]);
		});

		it("should cache package manager detection", () => {
			Command.clearCache();
			const first = Command.detectPackageManager();
			const second = Command.detectPackageManager();
			expect(first).toBe(second);
		});

		it("should have clearCache method", () => {
			expect(typeof Command.clearCache).toBe("function");
		});

		it("should reject invalid command names", () => {
			// Command injection attempt should throw
			expect(() => Command.isAvailable("node; rm -rf /")).toThrow(/Invalid command name/);
			expect(() => Command.isAvailable("$(whoami)")).toThrow(/Invalid command name/);
			expect(() => Command.isAvailable("node`id`")).toThrow(/Invalid command name/);
		});

		it("should allow valid command names with hyphens", () => {
			// These are valid tool names that should not throw
			expect(() => Command.isAvailable("markdownlint-cli2")).not.toThrow();
			expect(() => Command.isAvailable("sort-package-json")).not.toThrow();
		});
	});

	describe("ConfigSearch", () => {
		it("should have libConfigDir set to lib/configs", () => {
			expect(ConfigSearch.libConfigDir).toBe("lib/configs");
		});

		it("should have find method for known tools", () => {
			expect(typeof ConfigSearch.find).toBe("function");

			// Should return a result object even if not found
			const result = ConfigSearch.find("markdownlint");
			expect(result).toHaveProperty("found");
			expect(result).toHaveProperty("filepath");
		});

		it("should have findFile method for custom searches", () => {
			expect(typeof ConfigSearch.findFile).toBe("function");
		});

		it("should have resolve method for simple lookups", () => {
			expect(typeof ConfigSearch.resolve).toBe("function");

			// Should return fallback when file not found
			const result = ConfigSearch.resolve("nonexistent.json", "./fallback.json");
			expect(result).toBe("./fallback.json");
		});
	});
});

describe("Configuration utilities", () => {
	describe("createConfig", () => {
		it("should create config with all default handlers", () => {
			const config = createConfig();

			expect(config[PackageJson.glob]).toBeDefined();
			expect(config[Biome.glob]).toBeDefined();
			expect(config[Markdown.glob]).toBeDefined();
			expect(config[Yaml.glob]).toBeDefined();
			expect(config[PnpmWorkspace.glob]).toBeDefined();
			expect(config[ShellScripts.glob]).toBeDefined();
			expect(config[TypeScript.glob]).toBeDefined();
		});

		it("should allow disabling handlers", () => {
			const config = createConfig({
				packageJson: false,
				biome: false,
				markdown: false,
			});

			expect(config[PackageJson.glob]).toBeUndefined();
			expect(config[Biome.glob]).toBeUndefined();
			expect(config[Markdown.glob]).toBeUndefined();
			// Others should still be present
			expect(config[Yaml.glob]).toBeDefined();
		});

		it("should pass options to handlers", () => {
			const config = createConfig({
				biome: { exclude: ["custom/"] },
			});

			const handler = config[Biome.glob];
			expect(typeof handler).toBe("function");

			// Test that the custom exclude is applied
			const result = (handler as (f: readonly string[]) => string)(["src/index.ts", "custom/file.ts"]);
			// ConfigSearch finds biome.jsonc in this repo, so --config flag is included
			expect(result).toContain("biome check --write --no-errors-on-unmatched");
			expect(result).toContain("src/index.ts");
			expect(result).not.toContain("custom/file.ts");
		});

		it("should include custom handlers", () => {
			const customHandler = (files: readonly string[]): string => `custom-tool ${files.join(" ")}`;
			const config = createConfig({
				custom: {
					"*.css": customHandler,
				},
			});

			expect(config["*.css"]).toBe(customHandler);
		});
	});

	describe("Preset", () => {
		describe("minimal", () => {
			it("should include only PackageJson and Biome", () => {
				const config = Preset.minimal();

				expect(config[PackageJson.glob]).toBeDefined();
				expect(config[Biome.glob]).toBeDefined();
				expect(config[Markdown.glob]).toBeUndefined();
				expect(config[Yaml.glob]).toBeUndefined();
				expect(config[TypeScript.glob]).toBeUndefined();
			});

			it("should allow extending with custom options", () => {
				const config = Preset.minimal({
					biome: { exclude: ["vendor/"] },
				});

				expect(config[Biome.glob]).toBeDefined();
			});

			it("should allow enabling additional handlers", () => {
				const config = Preset.minimal({
					markdown: {}, // Enable markdown
				});

				expect(config[Markdown.glob]).toBeDefined();
			});
		});

		describe("standard", () => {
			it("should include formatting and linting handlers", () => {
				const config = Preset.standard();

				expect(config[PackageJson.glob]).toBeDefined();
				expect(config[Biome.glob]).toBeDefined();
				expect(config[Markdown.glob]).toBeDefined();
				expect(config[Yaml.glob]).toBeDefined();
				expect(config[PnpmWorkspace.glob]).toBeDefined();
				expect(config[ShellScripts.glob]).toBeDefined();
				// TypeScript is disabled in standard preset
				expect(config[TypeScript.glob]).toBeUndefined();
			});

			it("should allow extending with options", () => {
				const config = Preset.standard({
					biome: { exclude: ["legacy/"] },
					typescript: {}, // Enable typescript
				});

				expect(config[Biome.glob]).toBeDefined();
				expect(config[TypeScript.glob]).toBeDefined();
			});
		});

		describe("full", () => {
			it("should include all handlers", () => {
				const config = Preset.full();

				expect(config[PackageJson.glob]).toBeDefined();
				expect(config[Biome.glob]).toBeDefined();
				expect(config[Markdown.glob]).toBeDefined();
				expect(config[Yaml.glob]).toBeDefined();
				expect(config[PnpmWorkspace.glob]).toBeDefined();
				expect(config[ShellScripts.glob]).toBeDefined();
				expect(config[TypeScript.glob]).toBeDefined();
			});

			it("should allow customizing handlers", () => {
				const config = Preset.full({
					typescript: { skipTypecheck: true },
				});

				expect(config[TypeScript.glob]).toBeDefined();
			});
		});

		describe("get", () => {
			it("should return minimal preset by name", () => {
				const config = Preset.get("minimal");
				expect(config[Markdown.glob]).toBeUndefined();
			});

			it("should return standard preset by name", () => {
				const config = Preset.get("standard");
				expect(config[Markdown.glob]).toBeDefined();
				expect(config[TypeScript.glob]).toBeUndefined();
			});

			it("should return full preset by name", () => {
				const config = Preset.get("full");
				expect(config[TypeScript.glob]).toBeDefined();
			});

			it("should allow extending presets via get", () => {
				const config = Preset.get("standard", {
					typescript: {},
				});
				expect(config[TypeScript.glob]).toBeDefined();
			});
		});
	});
});
