# @savvy-web/lint-staged

[![npm version](https://img.shields.io/npm/v/@savvy-web/lint-staged)](https://www.npmjs.com/package/@savvy-web/lint-staged)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Composable, configurable lint-staged handlers for pre-commit hooks. Stop
duplicating lint-staged configs across projects - use reusable handlers with
sensible defaults and easy customization.

## Features

- Composable handlers for Biome, Markdown, YAML, TypeScript, and more
- Zero-config presets for instant setup
- Workspace-aware TSDoc validation for public APIs
- Bundled dependencies for fast, offline-capable execution
- Static class API with excellent TypeScript and TSDoc support

## Installation

```bash
# Install the package and required peer dependencies
npm install -D @savvy-web/lint-staged lint-staged husky

# For Biome handler (recommended)
npm install -D @biomejs/biome

# For Markdown handler
npm install -D markdownlint-cli2
```

## Quick Start

Use a preset for instant setup:

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
| ------ | -------- |
| `minimal()` | PackageJson, Biome |
| `standard()` | + Markdown, Yaml, PnpmWorkspace, ShellScripts |
| `silk()` | + TypeScript |

Extend any preset with options:

```typescript
import { Preset } from '@savvy-web/lint-staged';

export default Preset.standard({
  biome: { exclude: ['vendor/'] },
  typescript: {}, // Enable TypeScript in standard
});
```

## Available Handlers

| Handler | Files | Description |
| ------- | ----- | ----------- |
| `PackageJson` | `**/package.json` | Sort and format with Biome |
| `Biome` | `*.{js,ts,jsx,tsx,json,jsonc}` | Format and lint |
| `Markdown` | `**/*.{md,mdx}` | Lint with markdownlint-cli2 |
| `Yaml` | `**/*.{yml,yaml}` | Format and validate |
| `PnpmWorkspace` | `pnpm-workspace.yaml` | Sort and format |
| `ShellScripts` | `**/*.sh` | Manage permissions |
| `TypeScript` | `*.{ts,tsx}` | TSDoc validation + typecheck |

## Documentation

- [Handler Configuration](./docs/handlers.md) - Detailed options for each handler
- [Utilities](./docs/utilities.md) - Command, Filter, and advanced utilities
- [Configuration API](./docs/configuration.md) - createConfig and Preset APIs
- [Migration Guide](./docs/migration.md) - Migrating from raw lint-staged configs

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup
and guidelines.

## License

[MIT](./LICENSE)
