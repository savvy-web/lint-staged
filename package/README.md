# @savvy-web/lint-staged

[![npm](https://img.shields.io/npm/v/@savvy-web%2Flint-staged?label=npm&color=cb3837)](https://www.npmjs.com/package/@savvy-web/lint-staged)
[![License: MIT](https://img.shields.io/badge/License-MIT-4caf50.svg)](https://opensource.org/licenses/MIT)
[![Node.js %3E%3D24](https://img.shields.io/badge/Node.js-%3E%3D24-5fa04e.svg)](https://nodejs.org/)
[![TypeScript 6.0](https://img.shields.io/badge/TypeScript-6.0-3178c6.svg)](https://www.typescriptlang.org/)

> **This package is deprecated and no longer maintained.**
> Its lint-staged handlers now ship in
> [`@savvy-web/silk`](https://www.npmjs.com/package/@savvy-web/silk), driven by the
> [`savvy`](https://www.npmjs.com/package/@savvy-web/cli) CLI
> (`savvy lint` replaces `savvy-lint`).
> Sources live in the [Silk Suite monorepo](https://github.com/savvy-web/systems).
> No further releases, fixes, or security patches will be published here.

Composable, configurable lint-staged handlers for pre-commit hooks. Stop duplicating lint-staged configs across projects — reuse handlers with sensible defaults and easy customization.

## Features

- Composable handlers for Biome, Markdown, YAML, TypeScript, and more
- Zero-config presets for instant setup
- CLI tool (`savvy-lint`) to bootstrap and validate your configuration
- Workspace-aware config discovery anchored to workspace root
- Shareable Biome configuration via `"@savvy-web/silk/biome`
- Static class API with excellent TypeScript support

## Install

```bash
# Install the package and required peer dependencies
npm install -D @savvy-web/lint-staged lint-staged husky

# For Biome handler (recommended)
npm install -D @biomejs/biome

# For Markdown handler
npm install -D markdownlint-cli2
```

## Quick start

Use the CLI to bootstrap your configuration:

```bash
npx savvy-lint init --preset standard
```

Or configure manually with a preset:

```typescript
// lint-staged.config.ts
import { Preset } from '@savvy-web/lint-staged';

export default Preset.standard();
```

Or compose individual handlers:

```typescript
// lint-staged.config.ts
import { PackageJson, Biome, Markdown, Yaml } from '@savvy-web/lint-staged';

export default {
  [PackageJson.glob]: PackageJson.handler,
  [Biome.glob]: Biome.handler,
  [Markdown.glob]: Markdown.handler,
  [Yaml.glob]: Yaml.handler,
};
```

## Presets

| Preset | Handlers |
| --- | --- |
| `minimal()` | PackageJson, Biome |
| `standard()` | + Markdown, Yaml, PnpmWorkspace, ShellScripts |
| `silk()` | + TypeScript |

## Available handlers

| Handler | Files | Description |
| --- | --- | --- |
| `PackageJson` | `**/package.json` | Sort and format with Biome |
| `Biome` | `*.{js,ts,jsx,tsx,json,jsonc}` | Format and lint |
| `Markdown` | `**/*.{md,mdx}` | Lint with markdownlint-cli2 |
| `Yaml` | `**/*.{yml,yaml}` | Format (Prettier) and validate (yaml-lint) |
| `PnpmWorkspace` | `pnpm-workspace.yaml` | Sort and format |
| `ShellScripts` | `**/*.sh` | Manage permissions |
| `TypeScript` | `*.{ts,cts,mts,tsx}` | Type checking (tsgo/tsc) |

## CLI

The `savvy-lint` CLI helps bootstrap, validate, and format your setup:

```bash
savvy-lint init                        # Bootstrap hooks, config, and tooling
savvy-lint init --preset silk --force  # Reset pre-commit and config file
savvy-lint check                       # Validate current configuration
savvy-lint check --quiet               # Warnings only (for postinstall)
savvy-lint fmt package-json            # Sort package.json fields
savvy-lint fmt yaml                    # Format YAML files with Prettier
savvy-lint fmt pnpm-workspace          # Sort and format pnpm-workspace.yaml
```

`init` writes two managed sections into `.husky/pre-commit` — a shared `SAVVY-BASE` preamble that defines `pm_exec` and a `SAVVY-LINT` one-liner that runs lint-staged. It also reconciles a co-owned `SAVVY-HOOKS` hygiene section in `.husky/post-checkout` and `.husky/post-merge` that is shared with `@savvy-web/commitlint`. `--force` resets only the pre-commit hook and the lint-staged config file; the hygiene hooks are always reconciled in place because they are co-owned across the Silk Suite tools.

`check` validates each managed section independently and reports a per-section status; a stale or missing section degrades the overall verdict even when the hook file is present.

## Claude Code plugin

A companion Claude Code plugin is available that automatically injects code quality context (Biome, markdownlint, and TypeScript conventions) at session start.

```bash
# Add the Savvy Web plugin marketplace (one-time setup)
/plugin marketplace add savvy-web/systems

# Install the lint-staged plugin for this project
/plugin install lint-staged@savvy-web-systems --scope project
```

## Documentation

- [Handler configuration](../docs/handlers.md) — Detailed options for each handler.
- [Configuration API](../docs/configuration.md) — `createConfig` and `Preset` APIs.
- [CLI reference](../docs/cli.md) — `savvy-lint init`, `check`, and `fmt`.
- [Utilities](../docs/utilities.md) — `Command`, `Filter`, and advanced utilities.
- [Migration guide](../docs/migration.md) — Migrating from raw lint-staged configs.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](../CONTRIBUTING.md) for setup and guidelines.

## License

[MIT](LICENSE)
