/**
 * Biome schema URL utilities for config file synchronization.
 *
 * @remarks
 * When the `@biomejs/biome` peer dependency version changes, consuming repos
 * may have stale `$schema` URLs in their `biome.json`/`biome.jsonc` files.
 * This module provides utilities for detecting and updating those URLs.
 *
 * The expected version is injected at build time via `process.env.__BIOME_PEER_VERSION__`.
 *
 * @internal
 */

/** URL prefix for Biome JSON schemas. */
export const SCHEMA_URL_PREFIX = "https://biomejs.dev/schemas/";

/** URL suffix for Biome JSON schemas. */
export const SCHEMA_URL_SUFFIX = "/schema.json";

/** Glob pattern for finding Biome config files. */
export const BIOME_GLOB_PATTERN = "**/biome.{json,jsonc}";

/** Directories to exclude when searching for Biome configs. */
export const BIOME_EXCLUDE_DIRS = ["node_modules", "dist", ".turbo", ".git", ".rslib"];

/**
 * Strip range prefixes from a semver version string.
 *
 * @param versionRange - A version range like `^2.4.5`, `~2.4.5`, or `>=2.4.5`
 * @returns The bare semver string, e.g. `2.4.5`
 *
 * @internal
 */
export function extractSemver(versionRange: string): string {
	return versionRange.replace(/^[^\d]*/, "");
}

/**
 * Build the expected Biome schema URL for a given version.
 *
 * @param version - The bare semver version (e.g. `2.4.5`)
 * @returns The full schema URL
 *
 * @internal
 */
export function buildSchemaUrl(version: string): string {
	return `${SCHEMA_URL_PREFIX}${version}${SCHEMA_URL_SUFFIX}`;
}

/**
 * Get the Biome peer dependency version injected at build time.
 *
 * @returns The bare semver version, or `undefined` if not available
 *
 * @internal
 */
export function getBiomePeerVersion(): string | undefined {
	const raw = process.env.__BIOME_PEER_VERSION__;
	if (!raw) return undefined;
	return extractSemver(raw);
}

/**
 * Get the expected Biome schema URL based on the peer dependency version.
 *
 * @returns The expected schema URL, or `undefined` if the version is not available
 *
 * @internal
 */
export function getExpectedSchemaUrl(): string | undefined {
	const version = getBiomePeerVersion();
	if (!version) return undefined;
	return buildSchemaUrl(version);
}
