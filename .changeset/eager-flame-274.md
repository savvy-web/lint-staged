---
"@savvy-web/lint-staged": patch
---

Fix runtime issues with PackageJson handler, shell escaping, and CLI configuration

- Fix PackageJson and Biome handler race condition by sorting in-process with bundled sort-package-json library instead of shelling out, and excluding `package.json` from Biome's default patterns
- Add `Filter.shellEscape()` to properly quote file paths with spaces or special characters in all handlers
- Rename `Preset.full()` to `Preset.silk()` for branding consistency
- CLI init now generates `.ts` config files and uses `--preset silk` as default
- Correct bin path (`./savvy-lint`) and repository URL for npm publish
- Remove unnecessary `satisfies Configuration` type assertion from init config template
