import { describe, expect, it } from "vitest";
import {
	Biome,
	Command,
	ConfigSearch,
	DesignDocs,
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

describe("Handler classes", () => {
	describe("PackageJson", () => {
		it("should have correct glob pattern", () => {
			expect(PackageJson.glob).toBe("**/package.json");
		});

		it("should have default excludes", () => {
			expect(PackageJson.defaultExcludes).toContain("dist/package.json");
			expect(PackageJson.defaultExcludes).toContain("__fixtures__");
		});

		it("should filter excluded files", () => {
			const handler = PackageJson.create();
			const result = handler(["package.json", "dist/package.json", "__fixtures__/package.json"]);
			expect(result).toEqual([
				"sort-package-json package.json",
				"biome check --write --max-diagnostics=none package.json",
			]);
		});

		it("should skip sort when option is set", () => {
			const handler = PackageJson.create({ skipSort: true });
			const result = handler(["package.json"]);
			expect(result).toEqual(["biome check --write --max-diagnostics=none package.json"]);
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
			expect(result).toContain("--config=./custom-biome.json");
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

		it("should exclude pnpm files by default", () => {
			const handler = Yaml.create();
			const result = handler(["config.yaml", "pnpm-lock.yaml", "pnpm-workspace.yaml"]);
			expect(result).toEqual(["prettier --write config.yaml", "yaml-lint config.yaml"]);
		});

		it("should skip prettier when option is set", () => {
			const handler = Yaml.create({ skipPrettier: true });
			const result = handler(["config.yaml"]);
			expect(result).toEqual(["yaml-lint config.yaml"]);
		});
	});

	describe("PnpmWorkspace", () => {
		it("should have correct glob pattern", () => {
			expect(PnpmWorkspace.glob).toBe("pnpm-workspace.yaml");
		});

		it("should include prettier and yaml-lint by default", () => {
			const handler = PnpmWorkspace.create({ skipYqSort: true });
			const result = handler([]);
			expect(result).toContain("prettier --write pnpm-workspace.yaml");
			expect(result).toContain("yaml-lint pnpm-workspace.yaml");
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

		it("should run tsdoc on source files only when config provided", () => {
			const handler = TypeScript.create({
				skipTypecheck: true,
				eslintConfig: "./eslint.config.ts",
			});
			const result = handler(["src/index.ts", "src/index.test.ts", "test/foo.ts"]);
			// Should only include src/index.ts (source file, not test)
			expect(result).toHaveLength(1);
			expect((result as string[])[0]).toContain("src/index.ts");
			expect((result as string[])[0]).not.toContain("test.ts");
		});

		it("should skip tsdoc when option is set", () => {
			const handler = TypeScript.create({ skipTsdoc: true });
			const result = handler(["src/index.ts"]);
			expect(result).toHaveLength(1);
			expect((result as string[])[0]).toContain("tsgo");
		});

		it("should skip tsdoc when no eslint config found", () => {
			// When no config is explicitly provided and none is found, tsdoc is skipped
			const handler = TypeScript.create({ skipTypecheck: true });
			const result = handler(["src/index.ts"]);
			// No eslint config found = no tsdoc commands, and typecheck is skipped
			expect(result).toEqual([]);
		});
	});

	describe("DesignDocs", () => {
		it("should have correct glob pattern", () => {
			expect(DesignDocs.glob).toBe(".claude/design/**/*.md");
		});

		it("should run validate and timestamp scripts", () => {
			const handler = DesignDocs.create();
			const result = handler([".claude/design/module/doc.md"]);
			expect(result).toHaveLength(2);
			expect((result as string[])[0]).toContain("validate-design-doc.sh");
			expect((result as string[])[1]).toContain("update-timestamp.sh");
		});

		it("should skip timestamp when option is set", () => {
			const handler = DesignDocs.create({ skipTimestamp: true });
			const result = handler([".claude/design/module/doc.md"]);
			expect(result).toHaveLength(1);
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
		it("should create config with all default handlers except designDocs", () => {
			const config = createConfig();

			expect(config[PackageJson.glob]).toBeDefined();
			expect(config[Biome.glob]).toBeDefined();
			expect(config[Markdown.glob]).toBeDefined();
			expect(config[Yaml.glob]).toBeDefined();
			expect(config[PnpmWorkspace.glob]).toBeDefined();
			expect(config[ShellScripts.glob]).toBeDefined();
			expect(config[TypeScript.glob]).toBeDefined();
			// DesignDocs is disabled by default
			expect(config[DesignDocs.glob]).toBeUndefined();
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

		it("should allow enabling designDocs with true", () => {
			const config = createConfig({
				designDocs: true,
			});

			expect(config[DesignDocs.glob]).toBeDefined();
		});

		it("should allow enabling designDocs with options", () => {
			const config = createConfig({
				designDocs: { skipTimestamp: true },
			});

			expect(config[DesignDocs.glob]).toBeDefined();
		});

		it("should pass options to handlers", () => {
			const config = createConfig({
				biome: { exclude: ["custom/"] },
			});

			const handler = config[Biome.glob];
			expect(typeof handler).toBe("function");

			// Test that the custom exclude is applied
			const result = (handler as (f: string[]) => string)(["src/index.ts", "custom/file.ts"]);
			expect(result).toBe("biome check --write --no-errors-on-unmatched src/index.ts");
		});

		it("should include custom handlers", () => {
			const customHandler = (files: string[]): string => `custom-tool ${files.join(" ")}`;
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
				// TypeScript and DesignDocs are disabled
				expect(config[TypeScript.glob]).toBeUndefined();
				expect(config[DesignDocs.glob]).toBeUndefined();
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
			it("should include all handlers including designDocs", () => {
				const config = Preset.full();

				expect(config[PackageJson.glob]).toBeDefined();
				expect(config[Biome.glob]).toBeDefined();
				expect(config[Markdown.glob]).toBeDefined();
				expect(config[Yaml.glob]).toBeDefined();
				expect(config[PnpmWorkspace.glob]).toBeDefined();
				expect(config[ShellScripts.glob]).toBeDefined();
				expect(config[TypeScript.glob]).toBeDefined();
				expect(config[DesignDocs.glob]).toBeDefined();
			});

			it("should allow customizing handlers", () => {
				const config = Preset.full({
					typescript: { skipTypecheck: true },
					designDocs: { skipTimestamp: true },
				});

				expect(config[TypeScript.glob]).toBeDefined();
				expect(config[DesignDocs.glob]).toBeDefined();
			});

			it("should allow disabling handlers", () => {
				const config = Preset.full({
					designDocs: false,
				});

				expect(config[DesignDocs.glob]).toBeUndefined();
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
				expect(config[DesignDocs.glob]).toBeDefined();
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
