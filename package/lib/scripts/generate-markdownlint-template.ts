/**
 * Codegen script: reads lib/configs/.markdownlint-cli2.jsonc and generates
 * src/cli/templates/markdownlint.gen.ts with extracted template data.
 *
 * Run with: bun scripts/generate-markdownlint-template.ts
 *
 * @internal
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Effect } from "effect";
import { parse } from "jsonc-effect";

const SOURCE_PATH = resolve(import.meta.dirname, "../../../lib/configs/.markdownlint-cli2.jsonc");
const OUTPUT_PATH = resolve(import.meta.dirname, "../../src/cli/templates/markdownlint.gen.ts");

const sourceText = readFileSync(SOURCE_PATH, "utf-8");
const parsed = Effect.runSync(parse(sourceText)) as Record<string, unknown>;

const schema = parsed.$schema as string;
const config = parsed.config as Record<string, unknown>;

const output = `/**
 * Auto-generated markdownlint template data.
 *
 * DO NOT EDIT — regenerate with: pnpm generate:templates
 *
 * @internal
 */

/** Full markdownlint-cli2 config template. */
export const MARKDOWNLINT_TEMPLATE = ${JSON.stringify(parsed, null, "\t")} as const;

/** The \`$schema\` URL from the template. */
export const MARKDOWNLINT_SCHEMA = ${JSON.stringify(schema)} as const;

/** The \`config\` rules object from the template. */
export const MARKDOWNLINT_CONFIG = ${JSON.stringify(config, null, "\t")} as const;
`;

// Write, format with biome, then check if content actually changed
const existing = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, "utf-8") : null;
writeFileSync(OUTPUT_PATH, output, "utf-8");
try {
	execSync(`biome check --write ${OUTPUT_PATH}`, { stdio: "ignore" });
} catch {
	// biome may not be available or may fail — file is still valid
}
const formatted = readFileSync(OUTPUT_PATH, "utf-8");

if (existing === formatted) {
	// Restore original to preserve mtime for turbo cache
	writeFileSync(OUTPUT_PATH, existing, "utf-8");
	console.log(`${OUTPUT_PATH} is up-to-date`);
} else {
	console.log(`Generated ${OUTPUT_PATH}`);
}
