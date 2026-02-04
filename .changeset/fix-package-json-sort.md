---
"@savvy-web/lint-staged": patch
---

Fix PackageJson handler race condition with Biome handler

- Reverted to using bundled sort-package-json library programmatically (CLI approach failed for consumers)
- Added `package.json` to Biome handler's default excludes to prevent parallel processing race condition
- PackageJson handler now exclusively handles package.json files (sort + biome + git add)
