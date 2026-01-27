---
"@savvy-web/lint-staged": patch
---

Fix ConfigSearch failing to find config files and Biome config flag

ConfigSearch fixes:

- Add custom loaders for `.jsonc`, `.yaml`, and `.yml` extensions that cosmiconfig doesn't handle by default
- Search `lib/configs/` directory first using direct file existence checks before falling back to cosmiconfig
- Simplify `exists()` method to use `existsSync()` directly

Biome fixes:

- Change `--config=` to `--config-path=` to match Biome CLI expectations
