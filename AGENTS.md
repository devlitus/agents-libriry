# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-03
**Commit:** no-git
**Branch:** N/A

## OVERVIEW

@devagents is a coding agent team that installs in any project as a dev dependency. The team coordinates specialized agents (Orchestrator, Architect, Coder, Tester, Reviewer) to read repos, plan, generate code, and write files — with user confirmation for every write.
alway responded in Spanish

## STRUCTURE

```
agents-libriry/
├── README.md                 # User-facing docs
├── ARCHITECTURE.md           # Technical decisions
├── CONTRIBUTING.md           # Dev setup + contribution guide
├── docs/
│   ├── devagents-spec-final.md   # Full product specification (Spanish)
│   └── plan/
│       ├── README.md             # Phase overview
│       ├── fase-0-scaffolding.md
│       ├── fase-1-core-fundamentos.md
│       ├── fase-2-agentes.md
│       ├── fase-3-transportes.md
│       └── fase-4-cli-y-pulido.md
```

**CODE NOT YET WRITTEN** — This repo contains only specs and implementation plans. The actual monorepo code will be created in a later phase.

## PLANNED STACK

| Area | Technology |
|------|------------|
| Language | TypeScript 6.x · target ES2022 |
| Runtime | Node.js ≥ 20 |
| Package manager | pnpm 9.x |
| Monorepo | pnpm workspaces |
| Build | tsup |
| Testing | vitest |
| ACP SDK | `@agentclientprotocol/sdk` |
| MCP SDK | `@modelcontextprotocol/sdk` |
| LLM providers | Anthropic, OpenAI, Ollama |
| SQLite | `better-sqlite3` |
| CLI prompts | `@clack/prompts` |

## PLANNED PACKAGES

| Package | Purpose | Status |
|---------|---------|--------|
| `@devagents/core` | Orchestrator, agents, indexer, memory | **NOT YET CREATED** |
| `@devagents/acp` | ACP transport (Zed, JetBrains, VS Code) | **NOT YET CREATED** |
| `@devagents/mcp` | MCP transport (Claude Code, Cursor) | **NOT YET CREATED** |
| `@devagents/cli` | `devagents setup` + `devagents check` | **NOT YET CREATED** |

## PLANNED DIRECTORY STRUCTURE (when code exists)

```
packages/
├── core/src/
│   ├── orchestrator/    # Orchestrator, Planner, registry, commands
│   ├── agents/          # BaseAgent, Architect, Coder, Tester, Reviewer
│   ├── indexer/         # Indexer, languages, conventions
│   ├── memory/          # MemoryService, schema, types
│   ├── llm/             # LlmClient, factory, providers/
│   └── tools/           # ToolRouter, FilesystemTool, TerminalTool
├── acp/src/
├── mcp/src/
└── cli/src/
```

## AGENT FLOW

```
User prompt → Orchestrator → Architect → Coder → Tester → Reviewer
                     ↓
              SQLite memory (project_index, agent_memory, session_history)
```

## CODE STYLE (planned)

- TypeScript strict mode (`"strict": true`)
- No `any` types — use `unknown` and narrow
- All public interfaces/classes must have JSDoc comments
- Tests live alongside source files (`*.test.ts`)
- ESLint + Prettier
- Result<T, E> type for expected errors (not exceptions)

## KEY DECISIONS (from ARCHITECTURE.md)

1. **Single process, multiple agents** — All agents run in same Node.js process, communicate via direct TS calls
2. **Tools never touch filesystem directly** — All file access goes through ToolRouter (ACP/MCP transport)
3. **Transport independence** — Same core works with ACP or MCP depending on IDE
4. **Synchronous SQLite** — better-sqlite3 for simplicity (not concurrent DB)
5. **LLM abstraction** — Provider resolved at startup, agents don't know which LLM they use
6. **Confirmation gate** — Every file write and terminal command requires explicit user approval

## ANTI-PATTERNS (THIS PROJECT)

- NO agent-to-agent networking (single process)
- NO persistent LLM context across sessions (SQLite memory is structured cache)
- NO plugin system in v1
- NO file writes without user confirmation

## COMMANDS

```bash
# Install (future - when code exists)
pnpm add -D @devagents/acp @devagents/mcp @devagents/cli
pnpm exec devagents setup
pnpm exec devagents check

# Development (future)
pnpm install
pnpm build
pnpm dev
pnpm test
pnpm lint
```

## IMPLEMENTATION PHASES

| Phase | Focus | Tasks | Status |
|-------|-------|-------|--------|
| 0 | Scaffolding (monorepo, tooling) | 8 | **PLANNED** |
| 1 | Core fundamentals (LLM, SQLite, Indexer) | 5 | **PLANNED** |
| 2 | Agents (Orchestrator + 4 agents) | 8 | **PLANNED** |
| 3 | Transports (ACP + MCP) | 3 | **PLANNED** |
| 4 | CLI + polish + publish | 9 | **PLANNED** |

## NOTES

- This repo is the **spec and plan source of truth** — the actual code will be implemented later
- Spec is in Spanish (`docs/devagents-spec-final.md`)
- Implementation plans are phase-gated with clear dependencies
- Changesets will be used for versioning once packages exist
