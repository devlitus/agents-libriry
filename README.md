# @devagents

**A coding agent team you install in your project.**

`@devagents` is a team of specialized AI agents that works directly inside your repository. Write a prompt in your IDE — the team reads your codebase, plans, generates code, and writes files. No cloud dependency on a specific IDE. No lock-in. Just a pnpm package.

```bash
pnpm add -D @devagents/acp @devagents/mcp @devagents/cli
pnpm exec devagents setup
```

---

## Why @devagents?

Most AI coding tools are tied to a specific IDE and treat your project as input to a single general-purpose model. `@devagents` works differently:

| | Cursor / Claude Code | @devagents |
|---|---|---|
| Installation | Global, tied to the IDE | pnpm in the project, committed to `package.json` |
| Team | One general model | Specialized agents coordinated by an orchestrator |
| Language support | Primarily JS/TS | Any language — the team adapts |
| Configuration | Per IDE, per machine | Per project, in the repository |
| Versioning | IDE decides | Your project decides |
| Client support | One IDE | Zed, JetBrains, VS Code, Claude Code, Cursor |

---

## How it works

You write a prompt. The orchestrator reads your repository, builds a plan, and coordinates four specialized agents:

```
Your prompt
     ↓
Orchestrator  →  indexes your repo, builds a plan, asks for approval
     ↓
Architect     →  understands your codebase, decides what to create/modify
     ↓
Coder         →  writes the code, shows diffs, waits for confirmation
     ↓
Tester        →  generates tests matching your test framework
     ↓
Reviewer      →  checks consistency, security, and style
```

**Nothing is written without your confirmation.** Every file write and every terminal command requires explicit approval.

---

## Installation

```bash
# Install all packages
pnpm add -D @devagents/acp @devagents/mcp @devagents/cli

# Run the setup wizard
pnpm exec devagents setup

# Verify everything works
pnpm exec devagents check
```

The setup wizard creates:

```
your-project/
├── agents.config.ts     ← team configuration
├── .env                 ← credentials (auto-added to .gitignore)
└── .devagents/
    └── memory.db        ← SQLite memory (auto-added to .gitignore)
```

---

## IDE configuration

### Zed

Add to `.zed/settings.json` in your project:

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

### JetBrains

Go to **AI Assistant → Settings → External Agents → Add**:
- **Name:** `Dev Team`
- **Command:** `./node_modules/.bin/devagents-acp`

### VS Code — via ACP

Requires the [ACP Client extension](https://github.com/formulahendry/vscode-acp). Add to `.vscode/settings.json`:

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

### VS Code — via MCP / Copilot

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

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "devagents": {
      "command": "./node_modules/.bin/devagents-mcp"
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
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
```

---

## Usage

### Free-form prompts

Just describe what you want. The orchestrator decides which agents to activate:

```
"create a REST endpoint to register users with email validation"
"add tests to the parseDate function in utils/date.ts"
"refactor the auth module to use the repository pattern"
"add rate limiting to all public API routes"
```

### Explicit agent commands

Force a specific agent when you know exactly what you need:

```
/architect  "design the structure for a payments module"
/coder      "implement the UserRepository class"
/tester     "generate tests for src/services/auth.ts"
/reviewer   "review the last generated code"
/plan       "how would you implement a caching layer?"
```

`/plan` only produces a plan — it never writes files.

---

## LLM configuration

### Development — Ollama (local, free)

```env
# .env
NODE_ENV=development
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

[Install Ollama](https://ollama.com) and pull a model:
```bash
ollama pull llama3.1
```

### Production — Anthropic

```env
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

### Production — OpenAI

```env
# .env
OPENAI_API_KEY=sk-...
```

`@devagents` picks the provider automatically based on which variable is set. If both are set, Anthropic takes priority. Override with `agents.config.ts` if needed.

---

## `agents.config.ts` reference

```typescript
import type { DevAgentsConfig } from "@devagents/core";

const config: DevAgentsConfig = {
  llm: {
    // Optional — auto-detected from env vars if omitted
    provider: "anthropic",        // "anthropic" | "openai" | "ollama"
    model: "claude-sonnet-4-5",   // specific model (optional)
  },

  team: {
    autoTest:    true,   // run Tester automatically after Coder   (default: true)
    autoReview:  true,   // run Reviewer at the end of every flow  (default: true)
    confirmPlan: true,   // show the plan before executing         (default: true)
  },

  indexer: {
    // Additional paths to ignore (node_modules, .git, dist are always ignored)
    ignore: ["legacy/", "*.generated.ts"],

    // Files the orchestrator always reads for project context
    alwaysRead: ["ARCHITECTURE.md", "CONTRIBUTING.md"],
  },

  memory: {
    path: ".devagents/memory.db",   // SQLite file path
    keepSessionHistory: 20,          // number of past sessions to retain
  }
};

export default config;
```

---

## How the team adapts to your project

The orchestrator detects your project's language and framework at the start of the first session and caches the result in SQLite. Subsequent sessions start in milliseconds.

**Supported out of the box:**

| Detected file | Language | Example frameworks |
|---|---|---|
| `package.json` | TypeScript / JavaScript | Express, React, Next.js, NestJS |
| `pyproject.toml` / `requirements.txt` | Python | FastAPI, Django, Flask |
| `Cargo.toml` | Rust | Axum, Actix |
| `go.mod` | Go | Gin, Echo |
| `pom.xml` / `build.gradle` | Java / Kotlin | Spring |
| `composer.json` | PHP | Laravel |
| Anything else | Generic | works with any text-based codebase |

**Test frameworks auto-detected:**

| Package / file | Framework used |
|---|---|
| `jest` in `package.json` | Jest |
| `vitest` in `package.json` | Vitest |
| `mocha` in `package.json` | Mocha |
| `pytest` in requirements | pytest |
| `#[cfg(test)]` in `.rs` files | Rust built-in |

---

## Memory between sessions

`@devagents` remembers your project. The SQLite database at `.devagents/memory.db` stores:

- **Project index** — language, framework, directory structure, conventions. Built once, updated only when your config files change.
- **Agent memory** — what the Architect planned, what the Coder wrote, what the Reviewer found. Shared between agents in a session.
- **Session history** — what the team did in previous sessions. The orchestrator uses the last 20 sessions for context.

The memory database is gitignored by default. If you want the team to share context across a team of developers, you can commit `.devagents/memory.db` by removing it from `.gitignore`.

---

## Packages

| Package | Description | Installed automatically |
|---|---|---|
| `@devagents/core` | Orchestrator, agents, indexer, memory | Yes (peer dep) |
| `@devagents/acp` | ACP transport — Zed, JetBrains, VS Code | No — install if using ACP clients |
| `@devagents/mcp` | MCP transport — Claude Code, Cursor, Copilot | No — install if using MCP clients |
| `@devagents/cli` | `devagents setup` and `devagents check` | No — install for setup |

You can install only what you need:

```bash
# ACP clients only (Zed, JetBrains, VS Code)
pnpm add -D @devagents/acp @devagents/cli

# MCP clients only (Claude Code, Cursor)
pnpm add -D @devagents/mcp @devagents/cli

# Both
pnpm add -D @devagents/acp @devagents/mcp @devagents/cli
```

---

## Requirements

- Node.js ≥ 20
- An IDE with ACP or MCP support (see IDE configuration above)
- An LLM: [Ollama](https://ollama.com) locally or an API key from Anthropic / OpenAI

---

## License

MIT
