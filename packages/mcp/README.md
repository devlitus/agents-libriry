# @devagents/mcp

MCP transport for @devagents — enables the coding agent team in Claude Code, Cursor, and Copilot.

## Overview

The MCP (Model Context Protocol) transport provides integration with IDEs and tools that support the MCP standard. This package wraps the core @devagents/core package with an MCP-compatible server implementation.

## Supported IDEs

- **Claude Code** — Via `.claude/settings.json` configuration
- **Cursor** — Via `.cursor/mcp.json` configuration
- **Copilot** — Via Copilot MCP settings

## Installation

```bash
pnpm add -D @devagents/mcp
```

## Setup

After installation, configure your IDE to connect to the MCP server:

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "devagents": {
      "command": "npx",
      "args": ["devagents-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "devagents": {
      "command": "npx",
      "args": ["devagents-mcp"]
    }
  }
}
```

### Copilot / VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "devagents": {
      "type": "stdio",
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
```

## Usage

Start the MCP server:

```bash
npx devagents-mcp
```

The server will listen for MCP requests and handle orchestration through the standard MCP protocol.

## Available Tools

When connected, the following tools are available:

- `orchestrate` — Run the full agent team workflow
- `architect` — Generate architectural plans
- `coder` — Generate code implementations
- `tester` — Generate and run tests
- `reviewer` — Review code for issues
- `plan` — Generate project plans
- `status` — Check system status

## Binary

The package provides a `devagents-mcp` binary for starting the server:

```bash
devagents-mcp
# or
npx devagents-mcp
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `port` | MCP server port | `3000` |
| `host` | MCP server host | `localhost` |
| `logLevel` | Logging verbosity | `info` |

## Requirements

- Node.js ≥ 20
- @devagents/core (peer dependency)
- MCP-compatible IDE

## License

MIT
