/**
 * Analyzes TypeScript import relationships to discover all files
 * reachable from specified entry points.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, normalize, resolve } from "node:path";
import ts from "typescript";
import { EntryExtractor } from "./EntryExtractor.js";

/**
 * Types of errors that can occur during import graph analysis.
 */
export type ImportGraphErrorType =
	| "tsconfig_not_found"
	| "tsconfig_read_error"
	| "tsconfig_parse_error"
	| "package_json_not_found"
	| "package_json_parse_error"
	| "entry_not_found"
	| "file_read_error";

/**
 * Structured error from import graph analysis.
 */
export interface ImportGraphError {
	/** The type of error that occurred. */
	type: ImportGraphErrorType;
	/** Human-readable error message. */
	message: string;
	/** The file path related to the error, if applicable. */
	path?: string;
}

/**
 * Options for configuring the ImportGraph analyzer.
 */
export interface ImportGraphOptions {
	/** The project root directory. */
	rootDir: string;
	/** Custom path to the TypeScript configuration file. */
	tsconfigPath?: string;
	/** Additional patterns to exclude from results. */
	excludePatterns?: string[];
}

/**
 * Result of import graph analysis.
 */
export interface ImportGraphResult {
	/** All TypeScript source files reachable from the entry points. */
	files: string[];
	/** The entry points that were traced. */
	entries: string[];
	/** Errors encountered during import graph analysis. */
	errors: ImportGraphError[];
}

/**
 * Analyzes TypeScript import relationships to discover all files
 * reachable from specified entry points.
 *
 * @remarks
 * This class uses the TypeScript compiler API to trace import statements
 * and discover all files that are part of the public API. It handles:
 *
 * - Static imports: `import \{ foo \} from "./module"`
 * - Dynamic imports: `import("./module")`
 * - Re-exports: `export * from "./module"` and `export \{ foo \} from "./module"`
 * - Circular imports (via visited set tracking)
 *
 * The class automatically filters out:
 * - Files in node_modules
 * - Declaration files (.d.ts)
 * - Test files (*.test.ts, *.spec.ts)
 * - Files in __test__ directories
 *
 * @example
 * ```typescript
 * import type { ImportGraphOptions } from '@savvy-web/lint-staged';
 * import { ImportGraph } from '@savvy-web/lint-staged';
 *
 * const options: ImportGraphOptions = { rootDir: process.cwd() };
 * const graph = new ImportGraph(options);
 * const result = graph.traceFromPackageExports('./package.json');
 * console.log('Public API files:', result.files);
 * ```
 */
export class ImportGraph {
	private readonly options: ImportGraphOptions;
	private program: ts.Program | null = null;
	private compilerOptions: ts.CompilerOptions | null = null;
	private moduleResolutionCache: ts.ModuleResolutionCache | null = null;

	constructor(options: ImportGraphOptions) {
		this.options = options;
	}

	/**
	 * Trace all imports from the given entry points.
	 *
	 * @param entryPaths - Paths to entry files (relative to rootDir or absolute)
	 * @returns Deduplicated list of all reachable TypeScript files
	 */
	traceFromEntries(entryPaths: string[]): ImportGraphResult {
		const errors: ImportGraphError[] = [];
		const visited = new Set<string>();
		const entries: string[] = [];

		// Initialize TypeScript program
		const initResult = this.initializeProgram();
		if (!initResult.success) {
			return {
				files: [],
				entries: [],
				errors: [initResult.error],
			};
		}

		// Resolve and trace each entry point
		for (const entryPath of entryPaths) {
			const absolutePath = this.resolveEntryPath(entryPath);

			if (!existsSync(absolutePath)) {
				errors.push({
					type: "entry_not_found",
					message: `Entry file not found: ${entryPath}`,
					path: absolutePath,
				});
				continue;
			}

			entries.push(absolutePath);
			this.traceImports(absolutePath, visited, errors);
		}

		// Filter results to only TypeScript source files
		const files = Array.from(visited).filter((file) => this.isSourceFile(file));

		return {
			files: files.sort(),
			entries,
			errors,
		};
	}

	/**
	 * Trace imports from package.json exports.
	 *
	 * @param packageJsonPath - Path to package.json (relative to rootDir or absolute)
	 * @returns Deduplicated list of all reachable TypeScript files
	 */
	traceFromPackageExports(packageJsonPath: string): ImportGraphResult {
		const absolutePath = this.resolveEntryPath(packageJsonPath);

		// Read and parse package.json
		let packageJson: Record<string, unknown>;
		try {
			if (!existsSync(absolutePath)) {
				return {
					files: [],
					entries: [],
					errors: [
						{
							type: "package_json_not_found",
							message: `Failed to read package.json: File not found at ${absolutePath}`,
							path: absolutePath,
						},
					],
				};
			}
			const content = readFileSync(absolutePath, "utf-8");
			packageJson = JSON.parse(content) as Record<string, unknown>;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				files: [],
				entries: [],
				errors: [
					{
						type: "package_json_parse_error",
						message: `Failed to parse package.json: ${message}`,
						path: absolutePath,
					},
				],
			};
		}

		// Extract entry points
		const extractor = new EntryExtractor();
		const { entries } = extractor.extract(packageJson as Parameters<EntryExtractor["extract"]>[0]);

		// Convert entry paths to absolute paths
		const packageDir = dirname(absolutePath);
		const entryPaths = Object.values(entries).map((p) => resolve(packageDir, p));

		return this.traceFromEntries(entryPaths);
	}

	/**
	 * Initialize the TypeScript program for module resolution.
	 */
	private initializeProgram(): { success: true } | { success: false; error: ImportGraphError } {
		if (this.program) {
			return { success: true };
		}

		// Find tsconfig.json
		const configPath = this.findTsConfig();
		if (!configPath) {
			// Use default compiler options if no tsconfig found
			this.compilerOptions = {
				moduleResolution: ts.ModuleResolutionKind.NodeNext,
				module: ts.ModuleKind.NodeNext,
				target: ts.ScriptTarget.ESNext,
				strict: true,
			};

			this.moduleResolutionCache = ts.createModuleResolutionCache(
				this.options.rootDir,
				(fileName) => fileName.toLowerCase(),
				this.compilerOptions,
			);

			const host = ts.createCompilerHost(this.compilerOptions, true);
			host.getCurrentDirectory = (): string => this.options.rootDir;
			this.program = ts.createProgram([], this.compilerOptions, host);

			return { success: true };
		}

		// Parse tsconfig.json
		const configFile = ts.readConfigFile(configPath, (path) => readFileSync(path, "utf-8"));
		if (configFile.error) {
			const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
			return {
				success: false,
				error: {
					type: "tsconfig_read_error",
					message: `Failed to read tsconfig.json: ${message}`,
					path: configPath,
				},
			};
		}

		const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));

		if (parsed.errors.length > 0) {
			const messages = parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("\n");
			return {
				success: false,
				error: {
					type: "tsconfig_parse_error",
					message: `Failed to parse tsconfig.json: ${messages}`,
					path: configPath,
				},
			};
		}

		this.compilerOptions = parsed.options;

		// Create module resolution cache
		this.moduleResolutionCache = ts.createModuleResolutionCache(
			this.options.rootDir,
			(fileName) => fileName.toLowerCase(),
			this.compilerOptions,
		);

		// Create a minimal program for module resolution
		const host = ts.createCompilerHost(this.compilerOptions, true);
		host.getCurrentDirectory = (): string => this.options.rootDir;

		this.program = ts.createProgram([], this.compilerOptions, host);

		return { success: true };
	}

	/**
	 * Find tsconfig.json path.
	 */
	private findTsConfig(): string | null {
		if (this.options.tsconfigPath) {
			const customPath = isAbsolute(this.options.tsconfigPath)
				? this.options.tsconfigPath
				: resolve(this.options.rootDir, this.options.tsconfigPath);

			if (existsSync(customPath)) {
				return customPath;
			}
			return null;
		}

		// Search for tsconfig.json from rootDir upward
		const configPath = ts.findConfigFile(this.options.rootDir, (path) => existsSync(path));

		return configPath ?? null;
	}

	/**
	 * Resolve entry path to absolute path.
	 */
	private resolveEntryPath(entryPath: string): string {
		if (isAbsolute(entryPath)) {
			return normalize(entryPath);
		}
		return normalize(resolve(this.options.rootDir, entryPath));
	}

	/**
	 * Recursively trace imports from a source file.
	 */
	private traceImports(filePath: string, visited: Set<string>, errors: ImportGraphError[]): void {
		const normalizedPath = normalize(filePath);

		// Skip if already visited
		if (visited.has(normalizedPath)) {
			return;
		}

		// Skip external modules
		if (this.isExternalModule(normalizedPath)) {
			return;
		}

		// Mark as visited
		visited.add(normalizedPath);

		// Read and parse the file
		let content: string;
		try {
			content = readFileSync(normalizedPath, "utf-8");
		} catch {
			errors.push({
				type: "file_read_error",
				message: `Failed to read file: ${normalizedPath}`,
				path: normalizedPath,
			});
			return;
		}

		// Create a source file for AST analysis
		const sourceFile = ts.createSourceFile(normalizedPath, content, ts.ScriptTarget.Latest, true);

		// Extract imports
		const imports = this.extractImports(sourceFile);

		// Resolve and trace each import
		for (const importPath of imports) {
			const resolved = this.resolveImport(importPath, normalizedPath);
			if (resolved) {
				this.traceImports(resolved, visited, errors);
			}
		}
	}

	/**
	 * Extract all import/export module specifiers from a source file.
	 */
	private extractImports(sourceFile: ts.SourceFile): string[] {
		const imports: string[] = [];

		const visit = (node: ts.Node): void => {
			// import declarations: import { foo } from "./module"
			if (ts.isImportDeclaration(node)) {
				const specifier = node.moduleSpecifier;
				if (ts.isStringLiteral(specifier)) {
					imports.push(specifier.text);
				}
			}

			// export declarations: export { foo } from "./module"
			else if (ts.isExportDeclaration(node)) {
				const specifier = node.moduleSpecifier;
				if (specifier && ts.isStringLiteral(specifier)) {
					imports.push(specifier.text);
				}
			}

			// dynamic imports: import("./module")
			else if (ts.isCallExpression(node)) {
				const expression = node.expression;
				if (expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
					const arg = node.arguments[0];
					if (arg && ts.isStringLiteral(arg)) {
						imports.push(arg.text);
					}
				}
			}

			ts.forEachChild(node, visit);
		};

		visit(sourceFile);
		return imports;
	}

	/**
	 * Resolve a module specifier to an absolute file path.
	 */
	private resolveImport(specifier: string, fromFile: string): string | null {
		// Skip external packages (not relative or alias imports)
		if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
			// Could be a path alias - try to resolve via TS
			if (!this.compilerOptions?.paths || !Object.keys(this.compilerOptions.paths).length) {
				return null;
			}
		}

		if (!this.compilerOptions || !this.moduleResolutionCache) {
			return null;
		}

		// Use TypeScript module resolution
		const resolved = ts.resolveModuleName(
			specifier,
			fromFile,
			this.compilerOptions,
			ts.sys,
			this.moduleResolutionCache,
		);

		if (resolved.resolvedModule) {
			const resolvedPath = resolved.resolvedModule.resolvedFileName;

			// Skip external modules and declaration files
			if (resolved.resolvedModule.isExternalLibraryImport) {
				return null;
			}

			// Convert .d.ts to .ts if we're looking at declaration files that have source
			if (resolvedPath.endsWith(".d.ts")) {
				const sourcePath = resolvedPath.replace(/\.d\.ts$/, ".ts");
				if (existsSync(sourcePath)) {
					return sourcePath;
				}
				// No source file, skip declaration-only files
				return null;
			}

			return resolvedPath;
		}

		return null;
	}

	/**
	 * Check if a path is an external module (node_modules).
	 */
	private isExternalModule(filePath: string): boolean {
		return filePath.includes("/node_modules/") || filePath.includes("\\node_modules\\");
	}

	/**
	 * Check if a file should be included in results.
	 * Filters out test files and non-TypeScript files.
	 */
	private isSourceFile(filePath: string): boolean {
		// Must be TypeScript
		if (
			!filePath.endsWith(".ts") &&
			!filePath.endsWith(".tsx") &&
			!filePath.endsWith(".mts") &&
			!filePath.endsWith(".cts")
		) {
			return false;
		}

		// Skip declaration files
		if (filePath.endsWith(".d.ts") || filePath.endsWith(".d.mts") || filePath.endsWith(".d.cts")) {
			return false;
		}

		// Skip test files (default patterns)
		if (filePath.includes(".test.") || filePath.includes(".spec.")) {
			return false;
		}

		// Skip test directories (default patterns)
		if (filePath.includes("/__test__/") || filePath.includes("\\__test__\\")) {
			return false;
		}
		if (filePath.includes("/__tests__/") || filePath.includes("\\__tests__\\")) {
			return false;
		}

		// Check custom exclude patterns
		const excludePatterns = this.options.excludePatterns ?? [];
		for (const pattern of excludePatterns) {
			if (filePath.includes(pattern)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Traces TypeScript imports from entry points.
	 *
	 * @param entryPaths - Paths to entry files (relative to rootDir or absolute)
	 * @param options - Import graph configuration options
	 * @returns All TypeScript files reachable from the entries
	 */
	static fromEntries(entryPaths: string[], options: ImportGraphOptions): ImportGraphResult {
		const graph = new ImportGraph(options);
		return graph.traceFromEntries(entryPaths);
	}

	/**
	 * Traces TypeScript imports from package.json exports.
	 *
	 * @param packageJsonPath - Path to package.json (relative to rootDir or absolute)
	 * @param options - Import graph configuration options
	 * @returns All TypeScript files reachable from the package exports
	 */
	static fromPackageExports(packageJsonPath: string, options: ImportGraphOptions): ImportGraphResult {
		const graph = new ImportGraph(options);
		return graph.traceFromPackageExports(packageJsonPath);
	}
}
