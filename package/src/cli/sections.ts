/**
 * Shared managed section definitions and constants for CLI commands.
 *
 * @internal
 */
import { SectionDefinition, ShellSectionDefinition } from "@savvy-web/silk-effects";

/** Path for the husky pre-commit hook. */
export const HUSKY_HOOK_PATH = ".husky/pre-commit";

/** Path for the husky post-checkout hook. */
export const POST_CHECKOUT_HOOK_PATH = ".husky/post-checkout";

/** Path for the husky post-merge hook. */
export const POST_MERGE_HOOK_PATH = ".husky/post-merge";

/** Default path for the lint-staged config file. */
export const DEFAULT_CONFIG_PATH = "lib/configs/lint-staged.config.ts";

/** Path for the markdownlint-cli2 config file. */
export const MARKDOWNLINT_CONFIG_PATH = "lib/configs/.markdownlint-cli2.jsonc";

/** Section definition for savvy-lint managed sections in shell hooks. */
export const SavvyLintSection = ShellSectionDefinition.make({ toolName: "SAVVY-LINT" });

/**
 * Plain section definition for identity operations (`read`, `isManaged`) on savvy-lint sections.
 *
 * @remarks
 * Use this with {@link ManagedSection.read} or {@link ManagedSection.isManaged}.
 * For content operations use {@link SavvyLintSection}.
 */
export const SavvyLintSectionDef = SectionDefinition.make({ toolName: "SAVVY-LINT" });

/**
 * Generate the managed section content for the pre-commit hook.
 *
 * @param configPath - Path to the lint-staged config file
 * @returns The managed section content (without markers)
 */
export function generateManagedContent(configPath: string): string {
	return `# DO NOT EDIT between these markers - managed by savvy-lint
# Skip in CI environment
if ! { [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; }; then

# Get repo root directory
ROOT=$(git rev-parse --show-toplevel)

# Detect package manager from package.json or lockfiles
detect_pm() {
  # Check packageManager field in package.json (e.g., "pnpm@9.0.0")
  if [ -f "$ROOT/package.json" ]; then
    pm=$(jq -r '.packageManager // empty' "$ROOT/package.json" 2>/dev/null | cut -d'@' -f1)
    if [ -n "$pm" ]; then
      echo "$pm"
      return
    fi
  fi

  # Fallback to lockfile detection
  if [ -f "$ROOT/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$ROOT/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$ROOT/bun.lock" ]; then
    echo "bun"
  else
    echo "npm"
  fi
}

# Run lint-staged with the detected package manager
PM=$(detect_pm)
case "$PM" in
  pnpm) pnpm exec lint-staged --config "$ROOT/${configPath}" ;;
  yarn) yarn exec lint-staged --config "$ROOT/${configPath}" ;;
  bun)  bunx lint-staged --config "$ROOT/${configPath}" ;;
  *)    npx --no -- lint-staged --config "$ROOT/${configPath}" ;;
esac

fi`;
}

/**
 * Generate the managed section content for shell script hooks (post-checkout, post-merge).
 *
 * @returns The managed section content (without markers)
 */
export function generateShellScriptsManagedContent(): string {
	return `# DO NOT EDIT between these markers - managed by savvy-lint
if ! { [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; }; then

# Configure git to ignore executable bit changes
# This ensures hook scripts can be made executable locally without git tracking the change
git config core.fileMode false

# Ensure all shell scripts tracked by git are executable
git ls-files -z '*.sh' | xargs -0 -r chmod +x 2>/dev/null || true

fi`;
}

/** Block factory for pre-commit hook content. */
export const preCommitBlock = SavvyLintSection.generate(generateManagedContent);

/** Create a section block for shell script hooks (post-checkout, post-merge). */
export const shellScriptsBlock = () => SavvyLintSection.block(generateShellScriptsManagedContent());
