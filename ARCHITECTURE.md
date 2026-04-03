# Architecture

This document explains the technical decisions behind `@devagents`. It is intended for contributors and maintainers. For user-facing documentation, see the README.

---

## Core principle: single process, multiple agents

All agents (Orchestrator, Architect, Coder, Tester, Reviewer) run inside the **same Node.js process**. They communicate through direct TypeScript function calls, not through any network protocol.

This is a deliberate choice. Running agents as separate processes would add startup latency, IPC complexity, and serialization overhead for every inter-agent message. Since the agents work sequentially and share large context objects (file contents, project index, plans), keeping them in the same process makes the system faster and simpler.

ACP and MCP are only used as the **external interface** between the IDE and the process. Once a message arrives from the IDE, it never leaves the process again until the final response is streamed back.

```
IDE
 │
 │  ACP (stdin/stdout JSON-RPC)   or   MCP (stdio)
 │
 ▼
AgentProcess (single Node.js process)
 │
 ├── Orchestrator
 │      ├── calls Architect.execute()
 │      ├── calls Coder.execute()
 │      ├── calls Tester.execute()
 │      └── calls Reviewer.execute()
 │
 └── MemoryService (better-sqlite3, synchronous)
```

---

## Why ACP and MCP coexist

ACP and MCP solve different problems:

**ACP** is designed for autonomous coding agents. It gives the agent native access to the IDE's filesystem, terminal, and streaming. The IDE treats the agent as a first-class AI assistant.

**MCP** is designed for tools and capabilities. The IDE (or another agent like Claude Code) treats your server as a source of callable tools.

For `@devagents`, both are valid:
- When the IDE is Zed, JetBrains, or VS Code with the ACP extension, the user wants the full agent experience — real-time streaming, filesystem access, terminal confirmation dialogs.
- When the IDE is Claude Code or Cursor, those IDEs already have their own agent loop. They call `@devagents` as a set of specialist tools (`orchestrate`, `coder`, `tester`, `reviewer`).

Both protocols use the same `@devagents/core`. The `@devagents/acp` and `@devagents/mcp` packages are thin adapters that translate protocol-specific messages into calls to the orchestrator.

---

## Package responsibilities

### `@devagents/core`

The heart of the system. Contains everything that matters:

```
core/src/
├── orchestrator/
│   ├── Orchestrator.ts     ← entry point for both ACP and MCP
│   ├── Planner.ts          ← decides which agents to activate
│   ├── registry.ts         ← maps agent names to classes
│   └── commands.ts         ← slash command parsing (/coder, /tester…)
│
├── agents/
│   ├── BaseAgent.ts        ← abstract class all agents extend
│   ├── Architect.ts
│   ├── Coder.ts
│   ├── Tester.ts
│   └── Reviewer.ts
│
├── indexer/
│   ├── Indexer.ts          ← walks the repo, detects language/framework
│   ├── languages.ts        ← detection rules per language
│   └── conventions.ts      ← infers naming style, test patterns, etc.
│
├── memory/
│   ├── MemoryService.ts    ← single access point for SQLite
│   ├── schema.ts           ← table definitions and migrations
│   └── types.ts            ← TypeScript types for all stored data
│
├── llm/
│   ├── LlmClient.ts        ← interface
│   ├── factory.ts          ← detects provider from env vars
│   └── providers/
│       ├── AnthropicClient.ts
│       ├── OpenAiClient.ts
│       └── OllamaClient.ts
│
└── tools/
    ├── ToolRouter.ts       ← routes tool calls to ACP or MCP based on active transport
    ├── FilesystemTool.ts
    └── TerminalTool.ts
```

### `@devagents/acp`

Starts `AgentSideConnection` from `@agentclientprotocol/sdk` and feeds messages to the Orchestrator. Streams the orchestrator's output back to the IDE token by token.

```
acp/src/index.ts
  → new AgentSideConnection(process.stdin, process.stdout)
  → conn.onPromptTurn(turn => orchestrator.handle(turn))
  → orchestrator streams output → conn.sendText(chunk)
```

### `@devagents/mcp`

Starts an MCP server and exposes the orchestrator's capabilities as tools. Claude Code and Cursor call these tools directly.

Tools exposed:
- `orchestrate` — run the full agent team with a free-form prompt
- `coder` — run only the Coder
- `tester` — run only the Tester
- `reviewer` — run only the Reviewer
- `plan` — return the plan without executing

### `@devagents/cli`

Two commands:
- `devagents setup` — wizard using `@clack/prompts` that creates `.env`, `agents.config.ts`, and updates `.gitignore`
- `devagents check` — validates LLM connectivity, binary presence, SQLite access, and config validity

---

## How the orchestrator decides which agents to activate

The `Planner` class in `core/orchestrator/Planner.ts` classifies the prompt into one of these intents:

| Intent | Agents activated |
|---|---|
| `create` — building something new | Architect → Coder → Tester → Reviewer |
| `modify` — changing existing code | Coder → Reviewer |
| `test` — writing tests | Tester |
| `review` — reviewing existing code | Reviewer |
| `plan` — exploring ideas | Orchestrator only (no writes) |
| `explain` — understanding code | Orchestrator only (no writes) |
| `fix` — fixing a bug | Coder → Tester → Reviewer |

Slash commands bypass the Planner and route directly to the named agent.

The Planner uses a small LLM call to classify the intent. This call uses a short, focused prompt and the cheapest available model to minimize latency.

---

## Memory design

SQLite is accessed synchronously via `better-sqlite3`. This is intentional — the memory layer is used as a fast local cache, not a concurrent database. Synchronous access keeps the code straightforward and eliminates async complexity for what is essentially a file-based key-value store.

The three tables serve distinct purposes:

**`project_index`** — the repository map. Built once per project, updated incrementally when config files change. The orchestrator checks the `mtime` of key files (`package.json`, `tsconfig.json`, etc.) against `indexed_at` on startup. If nothing has changed, indexing is skipped entirely.

**`agent_memory`** — the inter-agent blackboard. Agents write their outputs here and read other agents' outputs. Scoped by `session_id` so different sessions don't interfere. The orchestrator creates a new UUID for each session and passes it to every agent.

**`session_history`** — the team's log. The orchestrator writes a summary after every session. The Planner reads the last 20 sessions on startup to understand what has been done recently in the project. This helps the team avoid repeating work and stay consistent with past decisions.

---

## Tool access: why agents never touch the filesystem directly

Every file read and write, every terminal command, goes through `ToolRouter` in `core/tools/`. This is non-negotiable.

Reasons:
1. **Confirmation gate** — `filesystem.writeFile` and `terminal.run` must always ask the user before executing. If agents wrote files directly, this gate would be bypassed.
2. **Transport independence** — the same `Coder` code works whether the active transport is ACP or MCP. `ToolRouter` handles the translation.
3. **Testability** — in tests, `ToolRouter` is replaced with a mock that records what the agent tried to write without touching the real filesystem.

---

## LLM abstraction

All agents call `llm.complete()` or `llm.stream()` from the `LlmClient` interface. The concrete provider is resolved once at startup by `factory.ts` and injected into the orchestrator, which passes it to every agent.

Agents do not know which LLM they are talking to. This is intentional — it makes it trivial to add new providers and allows users to switch between Ollama locally and Anthropic in CI without touching agent code.

Each agent has its own system prompt that specializes its behavior. The system prompts live in `core/agents/*.prompt.ts` (separate from the agent logic) so they can be updated without touching the agent implementation.

---

## Streaming

The Orchestrator uses an `EventEmitter`-based approach to stream progress to the IDE as it works:

```typescript
orchestrator.on("progress", (event: ProgressEvent) => {
  // ACP transport sends this as a streaming text chunk
  // MCP transport buffers and sends at the end (MCP doesn't support streaming natively)
});
```

Progress events include:
- `agent:start` — which agent is now active
- `agent:thinking` — LLM streaming token
- `tool:request` — a tool call is about to be made (triggers the confirmation UI)
- `tool:result` — tool call completed
- `agent:done` — agent finished

---

## Error handling philosophy

Agents use a `Result<T, E>` type (not exceptions) for expected errors:

```typescript
type Result<T, E = AgentError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Exceptions are only used for truly unexpected failures (programming errors, process crashes). This makes the orchestrator's control flow explicit and predictable — it can handle a `Coder` failure gracefully (e.g., skip Tester, run Reviewer anyway) without relying on try/catch chains.

---

## What this architecture does not do (and why)

**No agent-to-agent networking.** Agents coordinate through direct function calls and shared SQLite memory. Adding a network layer between agents would add latency and complexity with no benefit for a single-process system.

**No persistent LLM context window across sessions.** Each session starts fresh with a clean context window. The SQLite memory provides structured project knowledge that is more reliable and cheaper than trying to maintain a long running context.

**No plugin system (v1).** Allowing external agents to register at runtime would require an API contract, versioning, sandboxing, and error isolation. These are v2 concerns. In v1, all agents are internal and ship with the package.
