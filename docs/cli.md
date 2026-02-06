# CLI Reference

The `savvy-lint` CLI helps you bootstrap and validate your lint-staged setup.

## Installation

The CLI is included with `@savvy-web/lint-staged` and available as
`savvy-lint` when installed.

```bash
# Via npx (no global install needed)
npx savvy-lint <command>

# Or with pnpm
pnpm exec savvy-lint <command>
```

## Commands

### `savvy-lint init`

Bootstrap lint-staged configuration, husky hooks, and tooling configs.

```bash
savvy-lint init [options]
```

**What it creates:**

- `.husky/pre-commit` -- Managed hook that runs lint-staged
- `.husky/post-checkout` -- Managed hook for shell script permissions
  (standard/silk presets)
- `.husky/post-merge` -- Managed hook for shell script permissions
  (standard/silk presets)
- `.markdownlint-cli2.jsonc` -- Markdownlint config (standard/silk presets)
- Lint-staged config file at the specified path

| Option | Alias | Default | Description |
| ------ | ----- | ------- | ----------- |
| `--preset` | `-p` | `silk` | Preset: `minimal`, `standard`, or `silk` |
| `--config` | `-c` | `lib/configs/lint-staged.config.ts` | Config file path (relative to repo root) |
| `--force` | `-f` | `false` | Overwrite entire hook files (not just managed section) |

**Examples:**

```bash
# Default silk preset
savvy-lint init

# Standard preset with custom config location
savvy-lint init --preset standard --config lint-staged.config.ts

# Overwrite all managed files
savvy-lint init --force
```

#### Managed Sections

The `init` command uses managed sections in hook files. This allows you to add
custom logic above or below the managed section without it being overwritten
when you re-run `init`:

```bash
#!/usr/bin/env sh
# Your custom hooks go here (above the managed section)

# --- BEGIN SAVVY-LINT MANAGED SECTION ---
# DO NOT EDIT between these markers - managed by savvy-lint
# ... lint-staged invocation ...
# --- END SAVVY-LINT MANAGED SECTION ---

# Your custom hooks go here (below the managed section)
```

Running `savvy-lint init` again will only update the content between the markers.
Use `--force` to replace the entire file.

### `savvy-lint check`

Validate the current lint-staged configuration and display detected settings.

```bash
savvy-lint check [options]
```

| Option | Alias | Default | Description |
| ------ | ----- | ------- | ----------- |
| `--quiet` | `-q` | `false` | Only output warnings (for postinstall usage) |

**What it checks:**

- Lint-staged config file exists
- Husky pre-commit hook is present
- Managed sections are up-to-date
- Shell script hooks are current (post-checkout, post-merge)
- Markdownlint config matches the template
- Tool availability (Biome, markdownlint-cli2, TypeScript, TSDoc)

**Examples:**

```bash
# Full status output
savvy-lint check

# Quiet mode (for postinstall scripts)
savvy-lint check --quiet
```

**Sample output:**

```text
Checking lint-staged configuration...

✓ Config file: lib/configs/lint-staged.config.ts
✓ Husky hook: .husky/pre-commit
✓ Managed section: up-to-date
✓ .husky/post-checkout: up-to-date
✓ .husky/post-merge: up-to-date

Tool availability:
  ✓ Biome (config: biome.jsonc)
  ✓ markdownlint-cli2 (config: lib/configs/.markdownlint-cli2.jsonc)
  ✓ TypeScript (tsgo)
  ✓ TSDoc (tsdoc.json found)
  ✓ .markdownlint-cli2.jsonc: up-to-date

✓ Lint-staged is configured correctly.
```

## Postinstall Usage

You can run `savvy-lint check --quiet` as a postinstall script to alert
developers when their setup is outdated:

```json
{
  "scripts": {
    "postinstall": "savvy-lint check --quiet || true"
  }
}
```

This will silently pass when everything is up-to-date, and display warnings
when action is needed.
