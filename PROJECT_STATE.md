# Project State — @devagents

> This file is auto-loaded into every OpenCode session.
> Updated by the `dev` orchestrator after each completed task.
> Source of truth for current implementation progress.

---

## Current phase

**Phase 1 — Core Fundamentals** (in progress)

---

## Phase progress

| Phase | Status | Completed tasks |
|-------|--------|-----------------|
| 0 — Scaffolding | completed | 0.1-0.8 |
| 1 — Core fundamentals | in progress | 1.1, 1.2, 1.3, 1.4, 1.5 (partial) |
| 2 — Agents | not started | — |
| 3 — Transports | not started | — |
| 4 — CLI + polish | not started | — |

---

## Completed tasks

- **1.1** LLM Abstraction — providers (ollama, anthropic, openai), factory, types
  Files: `packages/core/src/llm/types.ts`, `packages/core/src/llm/ollama-client.ts`, `packages/core/src/llm/anthropic-client.ts`, `packages/core/src/llm/openai-client.ts`, `packages/core/src/llm/create-client.ts`, `packages/core/src/llm/index.ts`
- **1.1.8** LLM error classes
  Files: `packages/core/src/llm/errors.ts`
- **1.2** SQLite Memory — service, types, CRUD operations
  Files: `packages/core/src/memory/types.ts`, `packages/core/src/memory/sqlite-memory.ts`, `packages/core/src/memory/index.ts`
- **1.2.8** Memory error classes
  Files: `packages/core/src/memory/errors.ts`
- **1.3** Indexer — file-scanner, language-detector, test-detector, convention-detector, main indexer
  Files: `packages/core/src/indexer/types.ts`, `packages/core/src/indexer/file-scanner.ts`, `packages/core/src/indexer/language-detector.ts`, `packages/core/src/indexer/test-detector.ts`, `packages/core/src/indexer/convention-detector.ts`, `packages/core/src/indexer/indexer.ts`, `packages/core/src/indexer/index.ts`
- **1.4** Shared types and config loader
  Files: `packages/core/src/types.ts`, `packages/core/src/config-loader.ts`
- **1.5** Barrel export
  Files: `packages/core/src/index.ts`

---

## In progress

_Gaps identified vs. plan:_
- MemoryService missing `getAgentMemoryBySession` and `clearSessionMemory` — **FIXED** but tests skipped (no native sqlite3 bindings)
- Missing dedicated tests for each LLM provider with FakeLLMProvider — **FIXED**
- Test coverage not measured (>80% LLM, >85% Memory, >80% Indexer)

---

## Files written so far

- `packages/core/src/llm/types.ts` — LlmClient, CompletionOptions, LlmProvider
- `packages/core/src/llm/ollama-client.ts` — OllamaClient
- `packages/core/src/llm/anthropic-client.ts` — AnthropicClient
- `packages/core/src/llm/openai-client.ts` — OpenAIClient
- `packages/core/src/llm/create-client.ts` — createClient, detectProvider
- `packages/core/src/llm/errors.ts` — LLMProviderNotAvailableError, LLMTimeoutError, LLMConfigurationError
- `packages/core/src/llm/index.ts` — barrel export
- `packages/core/src/llm/llm.test.ts` — FakeLLMProvider and error tests
- `packages/core/src/llm/create-client.test.ts` — factory tests
- `packages/core/src/memory/types.ts` — MemoryService, ProjectIndex, AgentMemoryEntry, SessionHistoryEntry
- `packages/core/src/memory/sqlite-memory.ts` — SqliteMemoryService
- `packages/core/src/memory/errors.ts` — MemoryDatabaseError, MemoryNotFoundError
- `packages/core/src/memory/index.ts` — barrel export
- `packages/core/src/memory/sqlite-memory.test.ts` — memory CRUD tests
- `packages/core/src/indexer/types.ts` — IndexerConfig, DetectedProject, FileTreeNode, ProjectConventions
- `packages/core/src/indexer/file-scanner.ts` — scanDirectory
- `packages/core/src/indexer/language-detector.ts` — detectLanguage
- `packages/core/src/indexer/test-detector.ts` — detectTestFramework
- `packages/core/src/indexer/convention-detector.ts` — detectConventions
- `packages/core/src/indexer/indexer.ts` — Indexer class
- `packages/core/src/indexer/index.ts` — barrel export
- `packages/core/src/indexer/indexer.test.ts` — indexer integration tests
- `packages/core/src/types.ts` — DevAgentsConfig, AgentName, AgentResult, UserConfirmation
- `packages/core/src/config-loader.ts` — loadConfig
- `packages/core/src/index.ts` — main barrel export

---

## Last session summary

Fixed gaps in Phase 1 implementation:
- Added `packages/core/src/llm/errors.ts` with LLMProviderNotAvailableError, LLMTimeoutError, LLMConfigurationError
- Added `packages/core/src/memory/errors.ts` with MemoryDatabaseError, MemoryNotFoundError
- Added `getAgentMemoryBySession` and `clearSessionMemory` to MemoryService interface and SqliteMemoryService implementation
- Updated barrel exports to include new error classes
- Created `llm.test.ts` with FakeLLMProvider tests and error class tests
- Added tests for new MemoryService methods

Build passes (pnpm -r build). Tests pass (26 passed, 8 skipped due to no native sqlite3 bindings).

---

## Known blockers

_None._
