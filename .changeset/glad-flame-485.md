---
"@savvy-web/lint-staged": patch
---

## Bug Fixes

Fix `savvy-lint init` CLI crash caused by stale npm build resolving `jsonc-effect` to `jsonc-parser`, which stripped Effect wrapping from JSONC operations. Update `jsonc-effect` to ^0.2.1 and rebuild.

## Tests

Add coverage exclusions for CLI code (`src/bin/**`, `src/cli/**`) and new `BiomeSchema` test suite (14 tests) to meet strict coverage thresholds.
