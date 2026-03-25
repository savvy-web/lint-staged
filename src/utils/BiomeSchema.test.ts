import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import {
	SCHEMA_URL_PREFIX,
	buildSchemaUrl,
	extractSemver,
	findBiomeConfigs,
	getBiomePeerVersion,
	getExpectedSchemaUrl,
} from "./BiomeSchema.js";

describe("BiomeSchema", () => {
	describe("extractSemver", () => {
		it("should strip caret prefix", () => {
			expect(extractSemver("^2.4.5")).toBe("2.4.5");
		});

		it("should strip tilde prefix", () => {
			expect(extractSemver("~2.4.5")).toBe("2.4.5");
		});

		it("should strip >= prefix", () => {
			expect(extractSemver(">=2.4.5")).toBe("2.4.5");
		});

		it("should return bare version unchanged", () => {
			expect(extractSemver("2.4.5")).toBe("2.4.5");
		});

		it("should handle prerelease versions", () => {
			expect(extractSemver("^2.4.5-beta.1")).toBe("2.4.5-beta.1");
		});
	});

	describe("buildSchemaUrl", () => {
		it("should build correct URL from version", () => {
			expect(buildSchemaUrl("2.4.5")).toBe("https://biomejs.dev/schemas/2.4.5/schema.json");
		});
	});

	describe("SCHEMA_URL_PREFIX", () => {
		it("should be the biomejs.dev schemas URL", () => {
			expect(SCHEMA_URL_PREFIX).toBe("https://biomejs.dev/schemas/");
		});
	});

	describe("getBiomePeerVersion", () => {
		const originalEnv = process.env.__BIOME_PEER_VERSION__;

		afterEach(() => {
			if (originalEnv === undefined) {
				delete process.env.__BIOME_PEER_VERSION__;
			} else {
				process.env.__BIOME_PEER_VERSION__ = originalEnv;
			}
		});

		it("should return undefined when env var is not set", () => {
			delete process.env.__BIOME_PEER_VERSION__;
			expect(getBiomePeerVersion()).toBeUndefined();
		});

		it("should strip range prefix from env var", () => {
			process.env.__BIOME_PEER_VERSION__ = "^2.4.5";
			expect(getBiomePeerVersion()).toBe("2.4.5");
		});

		it("should return bare version from env var", () => {
			process.env.__BIOME_PEER_VERSION__ = "2.4.5";
			expect(getBiomePeerVersion()).toBe("2.4.5");
		});
	});

	describe("getExpectedSchemaUrl", () => {
		const originalEnv = process.env.__BIOME_PEER_VERSION__;

		afterEach(() => {
			if (originalEnv === undefined) {
				delete process.env.__BIOME_PEER_VERSION__;
			} else {
				process.env.__BIOME_PEER_VERSION__ = originalEnv;
			}
		});

		it("should return undefined when env var is not set", () => {
			delete process.env.__BIOME_PEER_VERSION__;
			expect(getExpectedSchemaUrl()).toBeUndefined();
		});

		it("should return full schema URL when env var is set", () => {
			process.env.__BIOME_PEER_VERSION__ = "^2.4.5";
			expect(getExpectedSchemaUrl()).toBe("https://biomejs.dev/schemas/2.4.5/schema.json");
		});
	});

	describe("findBiomeConfigs", () => {
		it("should return an array of paths", async () => {
			const result = await Effect.runPromise(findBiomeConfigs());
			expect(Array.isArray(result)).toBe(true);
		});

		it("should find biome.jsonc in the project root", async () => {
			const result = await Effect.runPromise(findBiomeConfigs());
			const hasBiomeConfig = result.some((p) => p === "biome.jsonc" || p.endsWith("/biome.jsonc"));
			expect(hasBiomeConfig).toBe(true);
		});
	});
});
