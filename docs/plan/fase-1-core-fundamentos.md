# Phase 1 — Core: Fundamentals (LLM + Memory + Indexer)

**Objective:** Implement the three fundamental layers of the core that all agents need: LLM abstraction, SQLite persistence, and repository indexing.

**Dependencies:** Phase 0 completed (monorepo functional, builds OK)

---

## Task 1.1 — LLM Abstraction (`packages/core/src/llm/`) `[L]`

### 1.1.1 — Define the `LlmClient` interface
- Create `packages/core/src/llm/types.ts`
- Define the interface according to the spec (section 7):
  ```typescript
  interface LlmClient {
    complete(prompt: string, options?: CompletionOptions): Promise<string>;
    stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
  }
  ```
- Define `CompletionOptions`:
  - `temperature?: number`
  - `maxTokens?: number`
  - `systemPrompt?: string`
  - `stopSequences?: string[]`
- Define `LlmProvider` type: `"ollama" | "anthropic" | "openai"`
- Import order (STYLE_GUIDE): `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- JSDoc on exported types only
- [ ] The `LlmClient` interface is defined and exported
- [ ] `CompletionOptions` covers common parameters for all 3 providers
- [ ] All exported functions have explicit return types
- [ ] JSDoc on public API types

### 1.1.2 — Implement Ollama provider
- Create `packages/core/src/llm/ollama-client.ts`
- Use the `ollama` SDK to communicate with local Ollama
- Implement `complete()` using `ollama.chat()`
- Implement `stream()` using `ollama.chat({ stream: true })`
- Configurable URL (default: `http://localhost:11434`)
- Configurable model (default: `llama3.1`)
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `complete()` returns text response for a given prompt
- [ ] `stream()` produces iterable text chunks
- [ ] Works against a real local Ollama
- [ ] Throws `LLMProviderNotAvailableError` if Ollama is unavailable
- [ ] All exported functions have explicit return types

### 1.1.3 — Implement Anthropic provider
- Create `packages/core/src/llm/anthropic-client.ts`
- Use `@anthropic-ai/sdk`
- Implement `complete()` using `anthropic.messages.create()`
- Implement `stream()` using `anthropic.messages.stream()`
- API key from `ANTHROPIC_API_KEY`
- Default model: `claude-sonnet-4-5`
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `complete()` returns correct response with valid API key
- [ ] `stream()` produces iterable chunks
- [ ] Throws `LLMConfigurationError` if API key is not configured
- [ ] All exported functions have explicit return types

### 1.1.4 — Implement OpenAI provider
- Create `packages/core/src/llm/openai-client.ts`
- Use `openai` SDK
- Implement `complete()` using `openai.chat.completions.create()`
- Implement `stream()` using `stream: true`
- API key from `OPENAI_API_KEY`
- Default model: `gpt-4o`
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `complete()` returns correct response
- [ ] `stream()` produces iterable chunks
- [ ] Throws `LLMConfigurationError` if API key is not configured
- [ ] All exported functions have explicit return types

### 1.1.5 — Implement factory with auto-detection of provider
- Create `packages/core/src/llm/create-client.ts`
- Detection logic according to spec (section 7):
  1. If explicit config in `agents.config.ts` → use that
  2. If `NODE_ENV=development` → Ollama
  3. If `ANTHROPIC_API_KEY` → Anthropic
  4. If `OPENAI_API_KEY` → OpenAI
  5. None → Error: `"Run npx devagents setup"`
- If `NODE_ENV=development` + `ANTHROPIC_API_KEY`: Ollama wins (unless explicit config)
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Factory correctly detects provider from environment variables
- [ ] Explicit config takes priority over auto-detection
- [ ] Error without provider is clear and actionable
- [ ] All exported functions have explicit return types

### 1.1.6 — Tests for LLM layer
- Unit tests with **FakeLLMProvider** for each provider (deterministic responses, not mocks)
- Tests for factory with different env var combinations
- Streaming tests (verify multiple chunks are produced)
- Use `FakeLLMProvider` pattern from STYLE_GUIDE:
  ```typescript
  class FakeLLMProvider implements LlmClient {
    constructor(private readonly response: string) {}
    async complete(_prompt: string): Promise<string> {
      return this.response;
    }
    async *stream(_prompt: string): AsyncIterable<string> {
      yield this.response;
    }
  }
  ```
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- [ ] Tests for all 3 providers pass with FakeLLMProvider
- [ ] Factory tests cover all detection scenarios
- [ ] Coverage > 80% in `src/llm/`

### 1.1.7 — Create barrel export `packages/core/src/llm/index.ts`
- Export: `LlmClient`, `CompletionOptions`, `LlmProvider`, `createLlmClient`
- Do not export concrete implementations (only factory and types)
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `import { createLlmClient } from "@devagents/core"` works

### 1.1.8 — Define typed error classes for LLM
- Create `packages/core/src/llm/errors.ts`
- Define error classes that extend `Error`, set `this.name`:
  ```typescript
  export class LLMProviderNotAvailableError extends Error {
    constructor(public readonly provider: string) {
      super(`LLM provider "${provider}" is not available`);
      this.name = 'LLMProviderNotAvailableError';
    }
  }
  export class LLMTimeoutError extends Error {
    constructor(public readonly provider: string, public readonly timeoutMs: number) {
      super(`LLM provider "${provider}" timed out after ${timeoutMs}ms`);
      this.name = 'LLMTimeoutError';
    }
  }
  export class LLMConfigurationError extends Error {
    constructor(public readonly provider: string, public readonly reason: string) {
      super(`LLM provider "${provider}" configuration error: ${reason}`);
      this.name = 'LLMConfigurationError';
    }
  }
  ```
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- Export from `packages/core/src/llm/index.ts`
- [ ] Error classes are defined with proper `this.name`
- [ ] Errors are exported from the barrel

---

## Task 1.2 — SQLite Memory (`packages/core/src/memory/`) `[L]`

### 1.2.1 — Define memory types and interfaces
- Create `packages/core/src/memory/types.ts`
- Define TypeScript interfaces for the 3 tables from spec (section 6.2):
  - `ProjectIndex`: `id`, `language`, `framework`, `testFw`, `fileTree`, `conventions`, `configFiles`, `entryPoints`, `indexedAt`
  - `AgentMemoryEntry`: `id`, `sessionId`, `agent`, `key`, `value`, `createdAt`
  - `SessionHistoryEntry`: `id`, `prompt`, `agentsUsed`, `filesModified`, `commandsRun`, `createdAt`
- Define `MemoryService` interface:
  - `init(): void` — creates tables if they don't exist
  - `getProjectIndex(): ProjectIndex | null`
  - `saveProjectIndex(index: ProjectIndex): void`
  - `getAgentMemory(sessionId: string, key: string): AgentMemoryEntry | null`
  - `setAgentMemory(entry: Omit<AgentMemoryEntry, 'id'>): void`
  - `getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[]`
  - `clearSessionMemory(sessionId: string): void`
  - `getRecentSessions(limit: number): SessionHistoryEntry[]`
  - `saveSession(session: SessionHistoryEntry): void`
  - `pruneOldSessions(keep: number): void`
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- JSDoc on public API types
- [ ] All types are defined and correspond to SQL schema in spec
- [ ] `MemoryService` interface covers all necessary operations
- [ ] `getAgentMemoryBySession` and `clearSessionMemory` are in the interface
- [ ] All exported functions have explicit return types

### 1.2.2 — Implement `SqliteMemoryService`
- Create `packages/core/src/memory/sqlite-memory.ts`
- Use `better-sqlite3` for synchronous SQLite access
- Constructor receives .db file path (default: `.devagents/memory.db`)
- Create `.devagents/` directory if it doesn't exist
- `init()`: execute the 3 `CREATE TABLE IF NOT EXISTS` statements from spec
- Use prepared statements for all queries
- JSON fields (`file_tree`, `conventions`, etc.) are auto-serialized/deserialized
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- Catch only to add context, then re-throw typed errors
- [ ] `init()` creates .db file and 3 tables
- [ ] If file already exists, `init()` doesn't lose data
- [ ] CRUD operations work correctly for all 3 tables
- [ ] All exported functions have explicit return types

### 1.2.3 — Implement `project_index` logic
- `getProjectIndex()`: reads the row (only 1 row, overwritten)
- `saveProjectIndex()`: `INSERT OR REPLACE` with JSON serialization
- `isIndexFresh(keyFiles: string[])`: compares `indexed_at` with `mtime` of key files
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `saveProjectIndex` followed by `getProjectIndex` returns same data
- [ ] `isIndexFresh` returns `false` if any key file changed after `indexed_at`
- [ ] All exported functions have explicit return types

### 1.2.4 — Implement `agent_memory` logic
- `setAgentMemory()`: insert with `session_id`, `agent`, `key`, `value` (JSON)
- `getAgentMemory()`: select by `session_id` + `key`
- `getAgentMemoryBySession(sessionId)`: all entries for a session
- `clearSessionMemory(sessionId)`: delete entries for a session
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Memory write and read works per agent and session
- [ ] Value is stored as JSON string and parsed when reading
- [ ] All exported functions have explicit return types

### 1.2.5 — Implement `session_history` logic
- `saveSession()`: insert with generated UUID
- `getRecentSessions(limit)`: select ordered by `created_at DESC`, limit N
- `pruneOldSessions(keep)`: delete sessions beyond the limit
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Sessions are saved with correct timestamp
- [ ] `pruneOldSessions(5)` leaves exactly the 5 most recent
- [ ] JSON fields deserialize correctly
- [ ] All exported functions have explicit return types

### 1.2.6 — Tests for memory layer
- Use `:memory:` or tmpdir SQLite database for tests
- CRUD tests for each table
- `isIndexFresh` tests with temporary files
- Session pruning tests
- Tests for JSON serialization/deserialization
- Import order in test files: same as implementation
- [ ] All tests pass
- [ ] Coverage > 85% in `src/memory/`

### 1.2.7 — Barrel export `packages/core/src/memory/index.ts`
- Export: types, `SqliteMemoryService`, `MemoryService` interface
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `import { SqliteMemoryService } from "@devagents/core"` works

### 1.2.8 — Define typed error classes for Memory
- Create `packages/core/src/memory/errors.ts`
- Define error classes that extend `Error`, set `this.name`:
  ```typescript
  export class MemoryDatabaseError extends Error {
    constructor(public readonly reason: string) {
      super(`Memory database error: ${reason}`);
      this.name = 'MemoryDatabaseError';
    }
  }
  export class MemoryNotFoundError extends Error {
    constructor(public readonly key: string) {
      super(`Memory entry not found: ${key}`);
      this.name = 'MemoryNotFoundError';
    }
  }
  ```
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- Export from `packages/core/src/memory/index.ts`
- [ ] Error classes are defined with proper `this.name`
- [ ] Errors are exported from the barrel

---

## Task 1.3 — Repository Indexer (`packages/core/src/indexer/`) `[L]`

### 1.3.1 — Define indexer types
- Create `packages/core/src/indexer/types.ts`
- `IndexerConfig`:
  - `rootDir: string` — user project root
  - `ignore: string[]` — extra patterns to ignore (from `agents.config.ts`)
  - `alwaysRead: string[]` — mandatory context files (always read even if ignored)
- `DetectedProject`:
  - `language: string`
  - `framework: string | null`
  - `testFramework: string | null`
  - `conventions: ProjectConventions`
  - `fileTree: FileTreeNode[]`
  - `configFiles: string[]`
  - `entryPoints: string[]`
- `ProjectConventions`:
  - `namingStyle: "camelCase" | "snake_case" | "PascalCase" | "kebab-case"`
  - `testFilePattern: string`
  - `testDirectory: string`
  - `importStyle: "named" | "default" | "mixed"`
- `FileTreeNode` (recursive structure for directories):
  - `path: string`
  - `type: "file" | "directory"`
  - `children?: FileTreeNode[]` — only for `type: "directory"`, recursive tree
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- JSDoc on public API types
- [ ] All types are defined and cover the spec
- [ ] FileTreeNode correctly represents recursive directory structure
- [ ] All exported functions have explicit return types

### 1.3.2 — Implement file tree scanner
- Create `packages/core/src/indexer/file-scanner.ts`
- Recursively traverse project directory
- Default ignores: `node_modules`, `.git`, `dist`, `build`, `.devagents`, `coverage`, `__pycache__`, `.venv`, `target` (Rust)
- Add patterns from user config `ignore`
- Respect `.gitignore` if it exists
- Produce `FileTreeNode[]` tree (recursive: directories have `children`, files don't)
- Limit depth to 10 levels
- Limit files to 5000 (for large repos)
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Generates correct tree for real project
- [ ] Ignores `node_modules` and custom patterns
- [ ] Doesn't crash on large repos (> 1000 files)
- [ ] All exported functions have explicit return types

### 1.3.3 — Implement language and framework detection
- Create `packages/core/src/indexer/language-detector.ts`
- Implement detection table from spec (section 5.1):
  - `package.json` → TS/JS → detect framework from dependencies (express, react, next, nestjs...)
  - `pyproject.toml` / `requirements.txt` → Python → detect framework (fastapi, django, flask...)
  - `Cargo.toml` → Rust → detect framework (axum, actix...)
  - `go.mod` → Go → detect framework (gin, echo...)
  - `pom.xml` / `build.gradle` → Java/Kotlin → Spring...
  - `composer.json` → PHP → Laravel...
- If multiple languages, choose main by file count
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Correctly detects TypeScript in project with `package.json` and `tsconfig.json`
- [ ] Correctly detects Python in project with `pyproject.toml`
- [ ] Correctly detects Rust in project with `Cargo.toml`
- [ ] Correctly detects Go in project with `go.mod`
- [ ] Detects correct framework by reading dependencies
- [ ] All exported functions have explicit return types

### 1.3.4 — Implement test framework detection
- Create `packages/core/src/indexer/test-detector.ts`
- Implement table from spec (section 5.4):
  - `jest` in `package.json` → Jest
  - `vitest` in `package.json` → Vitest
  - `mocha` in `package.json` → Mocha
  - `pytest` in requirements / pyproject → pytest
  - `#[cfg(test)]` in `.rs` → Rust built-in
  - None → generic
- Detect test naming pattern (e.g.: `*.test.ts`, `test_*.py`)
- Detect test directory (e.g.: `__tests__/`, `tests/`, colocated with file)
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Detects Jest when in `package.json`
- [ ] Detects Vitest when in `package.json`
- [ ] Detects pytest in Python projects
- [ ] Infers naming pattern by reading existing tests
- [ ] All exported functions have explicit return types

### 1.3.5 — Implement code convention detection
- Create `packages/core/src/indexer/convention-detector.ts`
- Read up to 10 code files from project (as spec says)
- Analyze:
  - Naming style: camelCase, snake_case, PascalCase, kebab-case (file names + variables)
  - Import style: named (`import { x }`) vs default (`import x`) vs mixed
  - Indentation: tabs vs spaces, size
  - Semicolons: yes/no (for JS/TS)
  - Quotes: single/double (for JS/TS)
- Return `ProjectConventions` with most frequent patterns
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Detects camelCase in standard TypeScript project
- [ ] Detects snake_case in Python project
- [ ] Detects predominant import style
- [ ] Doesn't crash if fewer than 10 code files
- [ ] All exported functions have explicit return types

### 1.3.6 — Implement main `Indexer`
- Create `packages/core/src/indexer/indexer.ts`
- Orchestrates previous components:
  1. Run `file-scanner` to get tree
  2. Run `language-detector` to detect language and framework
  3. Run `test-detector` to detect test framework
  4. Run `convention-detector` to detect conventions
  5. Combine everything into `DetectedProject`
- Read `alwaysRead` files from config (these are **always** read, even if ignored by patterns)
- Identify project entry points
- Identify relevant configuration files
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `index()` returns complete `DetectedProject`
- [ ] `alwaysRead` files are read even if they don't match code patterns (the Indexer reads their content for orchestrator context)
- [ ] All exported functions have explicit return types

### 1.3.7 — Implement incremental indexing
- Cache logic according to spec (section 6.3):
  - If no `project_index` in SQLite → full index
  - If `project_index` exists → compare `indexed_at` with key files mtime
  - If changes → reindex only modified, update SQLite
  - If no changes → return cached index
- Key files: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `tsconfig.json`, and main config for each framework
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] First indexing saves to SQLite correctly
- [ ] Second indexing uses cache if nothing changed (< 500ms for 500 files)
- [ ] If key file changed, reindexing updates SQLite
- [ ] Timestamp updates after reindexing
- [ ] All exported functions have explicit return types

### 1.3.8 — Tests for indexer
- Create temp directory with fake project structure for each test
- Language detection tests with different project types
- Test framework detection tests
- Convention tests
- Full indexing tests
- Incremental indexing tests (cache)
- Ignore patterns tests
- Use **Fake** implementations for detectors (not mocks — deterministic fake responses)
- Import order in test files: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- [ ] All tests pass
- [ ] Coverage > 80% in `src/indexer/`

### 1.3.9 — Barrel export `packages/core/src/indexer/index.ts`
- Export: types, `Indexer`
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `import { Indexer } from "@devagents/core"` works
- [ ] All exported functions have explicit return types

---

## Task 1.4 — Define shared core types `[S]`

### 1.4.1 — Create `packages/core/src/types.ts`
- `DevAgentsConfig` (section 9.1 of spec):
  ```typescript
  interface DevAgentsConfig {
    llm?: { provider?: LlmProvider; model?: string };
    team?: { autoTest?: boolean; autoReview?: boolean; confirmPlan?: boolean };
    indexer?: { ignore?: string[]; alwaysRead?: string[] };
    memory?: { path?: string; keepSessionHistory?: number };
  }
  ```
- `AgentName`: `"orchestrator" | "architect" | "coder" | "tester" | "reviewer"`
- `AgentResult`: generic type for agent result (use discriminated union for specific results)
- `UserConfirmation`: `"yes" | "no" | "edit"`
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- JSDoc on public API types
- [ ] All shared types are defined
- [ ] Importable from `@devagents/core`
- [ ] All exported functions have explicit return types

### 1.4.2 — Create configuration loader
- Create `packages/core/src/config-loader.ts`
- Search for `agents.config.ts` in user project directory
- If doesn't exist, use defaults
- Merge with defaults (each field optional)
- Load `.env` with `dotenv` or read `process.env` directly
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] Reads and parses `agents.config.ts` correctly
- [ ] Works with defaults if no config
- [ ] Environment variables are read correctly
- [ ] All exported functions have explicit return types

---

## Task 1.5 — Update main barrel export `[S]`

### 1.5.1 — Update `packages/core/src/index.ts`
- Re-export everything from `llm/`, `memory/`, `indexer/`
- Re-export types from `types.ts`
- Re-export `loadConfig` from `config-loader.ts`
- Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
- All exported functions have explicit return types
- [ ] `import { createLlmClient, SqliteMemoryService, Indexer, DevAgentsConfig } from "@devagents/core"` works
- [ ] `pnpm -r build` passes without errors
- [ ] All re-exports have explicit return types

---

## Phase 1 Summary

| Task | Complexity | Subtasks |
|------|:----------:|:--------:|
| 1.1 LLM Abstraction | L | 8 (added 1.1.8 error classes) |
| 1.2 SQLite Memory | L | 8 (added 1.2.8 error classes) |
| 1.3 Indexer | L | 9 |
| 1.4 Shared types | S | 2 |
| 1.5 Barrel export | S | 1 |
| **Total** | | **28 subtasks** |
