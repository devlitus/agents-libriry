---
name: project-context
description: Reads the @devagents spec and implementation plan to understand project scope, architecture, and current phase. Load before planning or making architectural decisions.
---

## What to read

Load these files to understand the full project context before making any architectural decision:

1. `docs/devagents-spec-final.md` — product spec: vision, scope, architecture, agent contracts, data models
2. `docs/plan/README.md` — phase summary and dependency diagram
3. `docs/plan/fase-0-scaffolding.md` — monorepo setup, TypeScript config, tooling
4. `docs/plan/fase-1-core-fundamentos.md` — LLM abstraction, SQLite memory, indexer
5. `docs/plan/fase-2-agentes.md` — Orchestrator, Architect, Coder, Tester, Reviewer agents
6. `docs/plan/fase-3-transportes.md` — ACP and MCP transports
7. `docs/plan/fase-4-cli-y-pulido.md` — CLI, error handling, docs, publication
8. `docs/STYLE_GUIDE.md` — coding conventions for this project

## Key architectural constraints (from spec)

- **Monorepo**: `packages/core`, `packages/acp`, `packages/mcp`, `packages/cli`
- **Dependency rule**: `acp`, `mcp`, `cli` → import from `core`. `core` → external libs only.
- **TypeScript**: ES2022, NodeNext modules, strict mode, composite builds
- **LLM**: Ollama (dev) + Anthropic/OpenAI (prod) behind a common `LLMProvider` interface
- **Memory**: SQLite via `better-sqlite3`, 3 tables: `context`, `decisions`, `files`
- **Transports**: ACP (Zed/JetBrains/VS Code) + MCP (Claude Code/Cursor) — same core logic, two adapters
- **Phase sequence**: Phase 0 → 1 → 2 → 3 → 4 (strictly sequential between phases)

## Before planning any module

1. Read the relevant phase file to understand what's already specified
2. Check which tasks are marked complete (checked checkboxes)
3. Verify your plan doesn't introduce circular dependencies
4. Confirm the file paths match section 3.1 of the spec
