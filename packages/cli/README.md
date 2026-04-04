# @devagents/cli

Command-line interface for @devagents — setup, configuration, and environment checks.

## Overview

The CLI provides commands for setting up the @devagents agent team in your project, verifying your environment, and configuring IDE integrations.

## Commands

### `devagents setup`

Interactive wizard to configure @devagents for your project:

```bash
npx devagents setup
# or
pnpm exec devagents setup
```

The setup wizard will:
- Detect your environment (Node.js, package manager)
- Prompt for LLM provider selection (Anthropic, OpenAI, Ollama)
- Collect API keys and configure credentials
- Set up the project structure

### `devagents check`

Verify your environment is correctly configured:

```bash
npx devagents check
# or
pnpm exec devagents check
```

Checks performed:
- LLM provider connectivity and credentials
- ACP binary availability (for ACP transport)
- MCP binary availability (for MCP transport)
- SQLite/better-sqlite3 installation
- Project configuration validity

### `devagents init-ide`

Generate IDE-specific configuration files:

```bash
npx devagents init-ide [zed|jetbrains|vscode|claude-code|cursor]
# or
pnpm exec devagents init-ide
```

Supported IDEs:
- `zed` — Creates `.zed/settings.json`
- `jetbrains` — Creates JetBrains configuration
- `vscode` — Creates `.vscode/settings.json`
- `claude-code` — Creates `.claude/settings.json`
- `cursor` — Creates `.cursor/mcp.json`

## Installation

```bash
pnpm add -D @devagents/cli
```

## Global Usage

Install globally for system-wide access:

```bash
npm install -g @devagents/cli
devagents setup
```

## Configuration

The CLI stores configuration in:
- Project-level: `./.devagents/config.json`
- User-level: `~/.devagents/config.json`

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Configuration error |
| `3` | Environment check failed |

## Requirements

- Node.js ≥ 20
- pnpm 9.x (recommended) or npm

## License

MIT

---

See the [main README](../../README.md) for full documentation.
