# @devagents/core

The core package for the @devagents coding agent team. Provides the orchestration engine, specialized agents, and fundamental services.

## Overview

@devagents is a coding agent team that installs in any project as a dev dependency. The team coordinates specialized agents to read repos, plan, generate code, and write files—with user confirmation for every write.

## Architecture

The core package follows a single-process, multi-agent architecture:

```
User prompt → Orchestrator → Architect → Coder → Tester → Reviewer
                     ↓
              SQLite memory (structured cache)
```

### Core Components

- **Orchestrator** — Coordinates agent flow, parses commands, manages session state
- **Agents** — Architect, Coder, Tester, Reviewer (each with specialized responsibilities)
- **Indexer** — Project indexing for relevant file discovery
- **Memory** — SQLite-backed persistent storage for project context and session history
- **LLM** — Provider-agnostic LLM abstraction (Anthropic, OpenAI, Ollama)

## Key Exports

```typescript
// Orchestrator and agents
export { Orchestrator } from './orchestrator/index.js'
export { ArchitectAgent } from './agents/architect/architect.js'
export { CoderAgent } from './agents/coder/coder.js'
export { TesterAgent } from './agents/tester/tester.js'
export { ReviewerAgent } from './agents/reviewer/reviewer.js'

// Services
export { MemoryService } from './memory/index.js'
export { Indexer } from './indexer/index.js'
export { LlmClient, LlmProvider } from './llm/index.js'
```

## Installation

This package is typically not installed directly by end users. Instead, install one of the transport packages:

```bash
# For Zed, JetBrains, or VS Code
pnpm add -D @devagents/acp

# For Claude Code, Cursor, or Copilot
pnpm add -D @devagents/mcp
```

If you need the core package as a peer dependency:

```bash
pnpm add -D @devagents/core
```

## Requirements

- Node.js ≥ 20
- TypeScript 6.x
- SQLite (via better-sqlite3)

## License

MIT

---

See the [main README](../../README.md) for full documentation.
