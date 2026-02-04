---
"@savvy-web/lint-staged": minor
---

Add `savvy-lint` CLI with `init` and `check` commands for bootstrapping and validating lint-staged configuration.

**New features:**
- `savvy-lint init` - Creates `.husky/pre-commit` hook and `lib/configs/lint-staged.config.js` with preset selection
- `savvy-lint check` - Validates configuration status and tool availability
- Managed section markers in husky hooks to preserve custom code during updates
- `--quiet` flag for postinstall usage

**Breaking changes:**
- Removed `DesignDocs` handler (moved to separate Claude Code plugin)
- Removed `DesignDocsOptions` type
- Removed `designDocs` option from `CreateConfigOptions` and presets
