# @savvy-web/lint-staged

Composable, configurable lint-staged handlers for pre-commit hooks.

## Installation

```bash
pnpm add @savvy-web/lint-staged
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
| `full()` | + TypeScript, DesignDocs |

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
| `Biome` | `*.{js,ts,jsx,tsx,json}` | Format and lint |
| `Markdown` | `**/*.{md,mdx}` | Lint with markdownlint-cli2 |
| `Yaml` | `**/*.{yml,yaml}` | Format and validate |
| `PnpmWorkspace` | `pnpm-workspace.yaml` | Sort and format |
| `ShellScripts` | `**/*.sh` | Manage permissions |
| `TypeScript` | `*.{ts,tsx}` | TSDoc validation + typecheck |
| `DesignDocs` | `.claude/design/**/*.md` | Validate structure |

## Peer Dependencies

```bash
# Required
pnpm add -D lint-staged

# For Biome handler
pnpm add -D @biomejs/biome

# For Markdown handler (optional)
pnpm add -D markdownlint-cli2
```

## Documentation

- [Handler Configuration](./docs/handlers.md) - Detailed options for each handler
- [Utilities](./docs/utilities.md) - Command, Filter, and advanced utilities
- [Configuration API](./docs/configuration.md) - createConfig and Preset APIs
- [Migration Guide](./docs/migration.md) - Migrating from raw lint-staged configs

## License

See [LICENSE](./LICENSE) for details.
