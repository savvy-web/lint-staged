---
"@savvy-web/lint-staged": patch
---

Fix PackageJson handler race condition and rename Preset.full to Preset.silk

- Reverted to using bundled sort-package-json library programmatically (CLI approach failed for consumers)
- Added `package.json` to Biome handler's default excludes to prevent parallel processing race condition
- PackageJson handler now exclusively handles package.json files (sort + biome + git add)
- Renamed `Preset.full()` to `Preset.silk()` for branding consistency
- CLI init command now uses `--preset silk` as default (replacing `--preset full`)
- Added `Filter.shellEscape()` to properly escape file paths with spaces or special characters
- All handlers now use shell-escaped paths to prevent command injection issues
