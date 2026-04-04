# @devagents/acp

ACP transport for @devagents — enables the coding agent team in Zed, JetBrains, and VS Code.

## Overview

The ACP (Agent Communication Protocol) transport provides tight integration with IDEs that support the ACP SDK. This package wraps the core @devagents/core package with an ACP-compatible agent process.

## Supported IDEs

- **Zed** — Via `.zed/settings.json` configuration
- **JetBrains** — Via IDE settings (IDEA, WebStorm, PyCharm, etc.)
- **VS Code** — Via `.vscode/settings.json` configuration

## Installation

```bash
pnpm add -D @devagents/acp
```

## Setup

After installation, configure your IDE to connect to the ACP agent:

### Zed

Add to `.zed/settings.json`:

```json
{
  "agent": {
    "agents": [
      {
        "name": "Dev Team",
        "command": "./node_modules/.bin/devagents-acp"
      }
    ]
  }
}
```

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "acp.agents": [
    {
      "name": "Dev Team",
      "command": "./node_modules/.bin/devagents-acp"
    }
  ]
}
```

### JetBrains

Configure in Preferences → Languages & Frameworks → Agent Protocol → Dev Agents

## Usage

Start the ACP agent:

```bash
npx devagents-acp
```

The agent will listen for ACP connections from your IDE and handle orchestration requests.

## Binary

The package provides a `devagents-acp` binary for starting the agent process:

```bash
devagents-acp
# or
npx devagents-acp
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `port` | ACP server port | `8080` |
| `host` | ACP server host | `localhost` |
| `logLevel` | Logging verbosity | `info` |

## Requirements

- Node.js ≥ 20
- @devagents/core (peer dependency)
- ACP SDK compatible IDE

## License

MIT
