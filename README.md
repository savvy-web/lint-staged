# savvy-web-lint-staged

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Monorepo containing the [`@savvy-web/lint-staged`](./package/) npm package and a
Claude Code companion plugin for code quality context injection.

## Packages

### @savvy-web/lint-staged

Composable, configurable lint-staged handlers for pre-commit hooks. Provides
reusable handlers for Biome, Markdown, YAML, TypeScript, and more.

See the full package documentation at [`package/README.md`](./package/README.md).

### Claude Code Plugin

A companion plugin that injects code quality context at the start of every Claude
Code session. It detects your project's tooling and informs the agent about:

- **Biome** formatting and linting rules (indent style, line width, import
  conventions)
- **markdownlint** configuration (enabled rules, allowed HTML elements, table
  style)
- **TypeScript** conventions (strict mode, ESM imports, `verbatimModuleSyntax`)

This means Claude Code automatically follows your project's code style without
needing to be told each session.

#### Plugin Installation

```bash
# Add the Savvy Web plugin marketplace (one-time setup)
/plugin marketplace add savvy-web/systems

# Install the lint-staged plugin for this project
/plugin install lint-staged@savvy-web-systems --scope project
```

## Repository Structure

```text
lint-staged/
├── package/              # @savvy-web/lint-staged npm package
│   ├── src/              # Package source code
│   ├── package.json
│   └── README.md
├── plugin/               # Claude Code companion plugin
│   ├── .claude-plugin/   # Plugin manifest
│   └── hooks/            # SessionStart hook
├── lib/configs/          # Shared lint configs (markdownlint, lint-staged)
├── docs/                 # Repository documentation
├── package.json          # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── biome.jsonc
```

## Development

```bash
# Install dependencies
pnpm install

# Build all outputs
pnpm run build

# Run tests
pnpm run test

# Lint with Biome
pnpm run lint

# Fix lint issues
pnpm run lint:fix

# Lint markdown
pnpm run lint:md

# Type-check with tsgo
pnpm run typecheck
```

## License

[MIT](./LICENSE)
