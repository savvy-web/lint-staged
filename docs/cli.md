# CLI reference

The `savvy-lint` CLI helps you bootstrap and validate your lint-staged setup.

## Install

The CLI is included with `@savvy-web/lint-staged` and available as `savvy-lint` when installed.

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

- `.husky/pre-commit` — Two ordered managed sections: a shared `SAVVY-BASE` preamble that defines `ROOT`, `in_ci`, and `pm_exec`, followed by a `SAVVY-LINT` one-liner that runs lint-staged.
- `.husky/post-checkout` — A co-owned `SAVVY-HOOKS` hygiene block that disables `core.fileMode` and restores executable bits on tracked `*.sh` files (standard/silk presets).
- `.husky/post-merge` — The same `SAVVY-HOOKS` hygiene block (standard/silk presets).
- `.markdownlint-cli2.jsonc` — Markdownlint config (standard/silk presets).
- Lint-staged config file at the specified path.

| Option | Alias | Default | Description |
| ------ | ----- | ------- | ----------- |
| `--preset` | `-p` | `silk` | Preset: `minimal`, `standard`, or `silk` |
| `--config` | `-c` | `lib/configs/lint-staged.config.ts` | Config file path (relative to repo root) |
| `--force` | `-f` | `false` | Reset `.husky/pre-commit` and the lint-staged config file (hygiene hooks are never force-reset) |

**Examples:**

```bash
# Default silk preset
savvy-lint init

# Standard preset with custom config location
savvy-lint init --preset standard --config lint-staged.config.ts

# Reset the pre-commit hook and the lint-staged config file
savvy-lint init --force
```

#### Managed sections

The `init` command writes managed sections into hook files so you can add custom logic above, below, or between them without losing edits when you re-run `init`. The pre-commit hook contains two ordered sections — the shared `SAVVY-BASE` preamble (also used by `@savvy-web/commitlint`) and the `SAVVY-LINT` one-liner — laid out like this:

```bash
#!/usr/bin/env sh
# Your custom hooks go here (above the managed sections)

# --- BEGIN SAVVY-BASE MANAGED SECTION ---
# DO NOT EDIT between these markers - shared preamble
ROOT="$(git rev-parse --show-toplevel)"
in_ci() { [ -n "${CI:-}" ]; }
# ...detect_pm, PM, pm_exec helpers...
# --- END SAVVY-BASE MANAGED SECTION ---

# --- BEGIN SAVVY-LINT MANAGED SECTION ---
# DO NOT EDIT between these markers - managed by savvy-lint
in_ci || pm_exec lint-staged --config "$ROOT/<your-config>"
# --- END SAVVY-LINT MANAGED SECTION ---

# Your custom hooks go here (below the managed sections)
```

`pm_exec` selects the local exec form for the detected package manager — `pnpm exec`, `yarn exec`, `bun x`, or `npx --no --` — so the pre-commit hook works on any supported toolchain without changes to the hook body.

The post-checkout and post-merge hooks carry a single `SAVVY-HOOKS` hygiene block that is shared with `@savvy-web/commitlint`:

```bash
#!/usr/bin/env sh

# --- BEGIN SAVVY-HOOKS MANAGED SECTION ---
# DO NOT EDIT between these markers - managed by savvy-hooks
# ...disables core.fileMode, restores +x on tracked *.sh files...
# --- END SAVVY-HOOKS MANAGED SECTION ---
```

Re-running `savvy-lint init` only updates content between markers. `--force` resets `.husky/pre-commit` (rewriting from the file header) and the lint-staged config file. Hygiene hooks are always reconciled with the same `sync` semantics, force or not, because they are co-owned with `@savvy-web/commitlint` — force-overwriting them from one tool would clobber edits that belong to the other.

### `savvy-lint check`

Validate the current lint-staged configuration and display detected settings.

```bash
savvy-lint check [options]
```

| Option | Alias | Default | Description |
| ------ | ----- | ------- | ----------- |
| `--quiet` | `-q` | `false` | Only output warnings (for postinstall usage) |

**What it checks:**

- Lint-staged config file exists.
- Husky pre-commit hook is present.
- The `SAVVY-BASE` and `SAVVY-LINT` sections in `.husky/pre-commit` are present and up-to-date (checked independently).
- The `SAVVY-HOOKS` hygiene section in `.husky/post-checkout` and `.husky/post-merge` is present and up-to-date.
- Markdownlint config `$schema` and rules match the template.
- Biome config `$schema` URLs match the peer-dependency version.
- Tool availability (Biome, markdownlint-cli2, TypeScript).

Each section is validated independently. A missing or stale section degrades the overall verdict even when the hook file itself exists, so you cannot have a present-but-broken hook silently passing the check.

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
✓ Base section: up-to-date
✓ Lint section: up-to-date (config: lib/configs/lint-staged.config.ts)
✓ .husky/post-checkout: up-to-date
✓ .husky/post-merge: up-to-date

Tool availability:
  ✓ Biome (config: biome.jsonc)
  ✓ markdownlint-cli2 (config: lib/configs/.markdownlint-cli2.jsonc)
  ✓ TypeScript (tsgo)
  ✓ lib/configs/.markdownlint-cli2.jsonc: up-to-date

✓ Lint-staged is configured correctly.
```

### `savvy-lint fmt`

Format files in-place. These subcommands are used internally by handler `fmtCommand()` methods to produce CLI commands that lint-staged can detect and auto-stage. They can also be run manually.

```bash
savvy-lint fmt <subcommand> [files...]
```

**Subcommands:**

| Subcommand | Description |
| ---------- | ----------- |
| `package-json` | Sort `package.json` fields with sort-package-json |
| `pnpm-workspace` | Sort and format `pnpm-workspace.yaml` |
| `yaml` | Format YAML files with Prettier |

**Examples:**

```bash
# Sort a package.json file
savvy-lint fmt package-json package.json

# Format YAML files
savvy-lint fmt yaml config.yaml .github/workflows/ci.yaml

# Sort pnpm-workspace.yaml (no file argument needed)
savvy-lint fmt pnpm-workspace
```

**Why `fmt` exists:**

lint-staged v16 only auto-stages file changes made by commands it executes, not by JavaScript handler function bodies. The `fmt` subcommands wrap in-place file modifications as CLI commands so lint-staged can detect and stage the changes between sequential steps.

## Postinstall usage

You can run `savvy-lint check --quiet` as a postinstall script to alert developers when their setup is outdated:

```json
{
  "scripts": {
    "postinstall": "savvy-lint check --quiet || true"
  }
}
```

This will silently pass when everything is up-to-date, and display warnings when action is needed.
