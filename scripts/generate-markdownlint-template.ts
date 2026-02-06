/**
 * Codegen script: reads lib/configs/.markdownlint-cli2.jsonc and generates
 * src/cli/templates/markdownlint.gen.ts with extracted template data.
 *
 * Run with: bun scripts/generate-markdownlint-template.ts
 *
 * @internal
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "jsonc-parser";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_PATH = resolve(ROOT, "lib/configs/.markdownlint-cli2.jsonc");
const OUTPUT_PATH = resolve(ROOT, "src/cli/templates/markdownlint.gen.ts");

const sourceText = readFileSync(SOURCE_PATH, "utf-8");
const parsed = parse(sourceText) as Record<string, unknown>;

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

writeFileSync(OUTPUT_PATH, output, "utf-8");
console.log(`Generated ${OUTPUT_PATH}`);
