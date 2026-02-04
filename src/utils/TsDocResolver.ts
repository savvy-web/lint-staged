/**
 * Resolves files for TSDoc linting based on workspace configuration.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { getWorkspaceInfos } from "workspace-tools";
import type { ImportGraphOptions } from "./ImportGraph.js";
import { ImportGraph } from "./ImportGraph.js";

/**
 * Information about a workspace enabled for TSDoc linting.
 */
export interface TsDocWorkspace {
	/** Workspace name from package.json */
	name: string;
	/** Absolute path to the workspace root */
	path: string;
	/** Path to the tsdoc.json config (workspace-level or repo-level) */
	tsdocConfigPath: string;
	/** Files to lint (absolute paths) */
	files: string[];
	/** Errors encountered during resolution */
	errors: string[];
}

/**
 * Result of resolving TSDoc files.
 */
export interface TsDocResolverResult {
	/** Workspaces that are enabled for TSDoc linting */
	workspaces: TsDocWorkspace[];
	/** Whether this is a monorepo */
	isMonorepo: boolean;
	/** Path to repo-level tsdoc.json if present */
	repoTsdocConfig?: string;
}

/**
 * Options for TsDocResolver.
 */
export interface TsDocResolverOptions {
	/** The repository root directory */
	rootDir: string;
	/** Custom exclude patterns for import graph analysis */
	excludePatterns?: string[];
}

/**
 * Resolves files for TSDoc linting based on workspace configuration.
 *
 * @remarks
 * This class handles both single-package repos and monorepos. It uses
 * `workspace-tools` to detect workspaces and checks for `tsdoc.json`
 * configuration files to determine which packages need TSDoc linting.
 *
 * A workspace is enabled for TSDoc linting if:
 * 1. The workspace has a `tsdoc.json` file in its root, OR
 * 2. The repo has a `tsdoc.json` file at its root
 *
 * For enabled workspaces, the resolver:
 * 1. Extracts entry points from the package.json `exports` field
 * 2. Traces imports from those entries using ImportGraph
 * 3. Returns all public API files for linting
 *
 * @example
 * ```typescript
 * import type { TsDocResolverOptions } from '@savvy-web/lint-staged';
 * import { TsDocResolver } from '@savvy-web/lint-staged';
 *
 * const options: TsDocResolverOptions = { rootDir: process.cwd() };
 * const resolver = new TsDocResolver(options);
 * const result = resolver.resolve();
 *
 * for (const workspace of result.workspaces) {
 *   console.log(`${workspace.name}: ${workspace.files.length} files to lint`);
 * }
 * ```
 */
export class TsDocResolver {
	private readonly options: TsDocResolverOptions;

	constructor(options: TsDocResolverOptions) {
		this.options = options;
	}

	/**
	 * Resolve all files that need TSDoc linting.
	 *
	 * @returns Resolution result with workspaces and their files
	 */
	resolve(): TsDocResolverResult {
		const { rootDir } = this.options;
		const workspaces: TsDocWorkspace[] = [];

		// Check for repo-level tsdoc.json
		const repoTsdocPath = join(rootDir, "tsdoc.json");
		const repoTsdocConfig = existsSync(repoTsdocPath) ? repoTsdocPath : undefined;

		// Try to get workspaces (returns undefined if not a monorepo or on error)
		const workspaceInfos = getWorkspaceInfos(rootDir);
		const isMonorepo = workspaceInfos !== undefined && workspaceInfos.length > 1;

		if (workspaceInfos === undefined || workspaceInfos.length === 0) {
			// Single-package repo
			const result = this.resolveWorkspace(rootDir, repoTsdocConfig);
			if (result) {
				workspaces.push(result);
			}
		} else {
			// Monorepo - process each workspace
			for (const info of workspaceInfos) {
				const workspacePath = info.path;
				const result = this.resolveWorkspace(workspacePath, repoTsdocConfig);
				if (result) {
					workspaces.push(result);
				}
			}
		}

		const result: TsDocResolverResult = {
			workspaces,
			isMonorepo,
		};

		// Only add repoTsdocConfig if defined (exactOptionalPropertyTypes)
		if (repoTsdocConfig !== undefined) {
			result.repoTsdocConfig = repoTsdocConfig;
		}

		return result;
	}

	/**
	 * Resolve files for a single workspace.
	 *
	 * @param workspacePath - Path to the workspace root
	 * @param repoTsdocConfig - Path to repo-level tsdoc.json if present
	 * @returns Workspace info if enabled for TSDoc, null otherwise
	 */
	private resolveWorkspace(workspacePath: string, repoTsdocConfig?: string): TsDocWorkspace | null {
		const packageJsonPath = join(workspacePath, "package.json");

		// Check if package.json exists
		if (!existsSync(packageJsonPath)) {
			return null;
		}

		// Read package.json for name and exports
		let packageJson: { name?: string; exports?: unknown };
		try {
			const content = readFileSync(packageJsonPath, "utf-8");
			packageJson = JSON.parse(content) as typeof packageJson;
		} catch {
			return null;
		}

		// Check for workspace-level tsdoc.json
		const workspaceTsdocPath = join(workspacePath, "tsdoc.json");
		const workspaceTsdocConfig = existsSync(workspaceTsdocPath) ? workspaceTsdocPath : undefined;

		// Determine which tsdoc.json to use (workspace takes precedence)
		const tsdocConfigPath = workspaceTsdocConfig ?? repoTsdocConfig;

		// If no tsdoc.json found, this workspace is not enabled for TSDoc
		if (!tsdocConfigPath) {
			return null;
		}

		// Check if package has exports (required for TSDoc linting)
		if (!packageJson.exports) {
			return null;
		}

		const name = packageJson.name ?? relative(this.options.rootDir, workspacePath);
		const errors: string[] = [];

		// Use ImportGraph to trace files from package exports
		const graphOptions: ImportGraphOptions = {
			rootDir: workspacePath,
		};

		// Only add excludePatterns if defined (ImportGraphOptions requires string[], not string[] | undefined)
		if (this.options.excludePatterns !== undefined) {
			graphOptions.excludePatterns = this.options.excludePatterns;
		}

		const graph = new ImportGraph(graphOptions);

		const result = graph.traceFromPackageExports(packageJsonPath);

		// Collect errors
		for (const error of result.errors) {
			errors.push(error.message);
		}

		return {
			name,
			path: workspacePath,
			tsdocConfigPath,
			files: result.files,
			errors,
		};
	}

	/**
	 * Filter staged files to only those that need TSDoc linting.
	 *
	 * @param stagedFiles - Array of staged file paths (absolute)
	 * @returns Files that are in workspaces enabled for TSDoc and are public API files
	 */
	filterStagedFiles(stagedFiles: string[]): { files: string[]; tsdocConfigPath: string }[] {
		const result = this.resolve();
		const output: { files: string[]; tsdocConfigPath: string }[] = [];

		// Create a set of all files that need linting for quick lookup
		for (const workspace of result.workspaces) {
			const workspaceFiles = new Set(workspace.files);
			const matchedFiles = stagedFiles.filter((f) => workspaceFiles.has(f));

			if (matchedFiles.length > 0) {
				output.push({
					files: matchedFiles,
					tsdocConfigPath: workspace.tsdocConfigPath,
				});
			}
		}

		return output;
	}

	/**
	 * Check if a specific file needs TSDoc linting.
	 *
	 * @param filePath - Absolute path to the file
	 * @returns True if the file is in a workspace enabled for TSDoc and is a public API file
	 */
	needsLinting(filePath: string): boolean {
		const result = this.resolve();

		for (const workspace of result.workspaces) {
			if (workspace.files.includes(filePath)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get the tsdoc.json config path for a specific file.
	 *
	 * @param filePath - Absolute path to the file
	 * @returns Path to tsdoc.json if the file needs linting, undefined otherwise
	 */
	getTsDocConfig(filePath: string): string | undefined {
		const result = this.resolve();

		for (const workspace of result.workspaces) {
			if (workspace.files.includes(filePath)) {
				return workspace.tsdocConfigPath;
			}
		}

		return undefined;
	}

	/**
	 * Find the workspace that contains a file.
	 *
	 * @param filePath - Absolute path to the file
	 * @returns Workspace info if found, undefined otherwise
	 */
	findWorkspace(filePath: string): TsDocWorkspace | undefined {
		const result = this.resolve();

		for (const workspace of result.workspaces) {
			// Check if file is within workspace path
			if (filePath.startsWith(workspace.path)) {
				return workspace;
			}
		}

		return undefined;
	}
}
