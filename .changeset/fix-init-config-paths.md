---
"@savvy-web/lint-staged": patch
---

Fix markdownlint config output path and simplify generated lint-staged config.

The init command was writing the markdownlint-cli2 config to the repository
root instead of lib/configs/. It now correctly writes to
lib/configs/.markdownlint-cli2.jsonc and ensures the directory exists.

The generated lint-staged config no longer includes an unnecessary type import
or satisfies annotation.
