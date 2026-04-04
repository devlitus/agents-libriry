# Code Smell Audit — @devagents Monorepo

**Date:** 2026-04-04
**Files Analyzed:** 68
**WARNING Findings:** 12
**NOTE Findings:** 6

---

## Summary by Category

| Category | WARNING | NOTE |
|----------|---------|------|
| Magic Values | 5 | 0 |
| God Object | 2 | 0 |
| Dead Code | 2 | 0 |
| Data Clump | 1 | 0 |
| Feature Envy | 0 | 3 |
| Inconsistent Abstraction Level | 0 | 3 |

---

## WARNING Findings

### WARNING · packages/core/src/llm/anthropic-client.ts:27 — Magic Values

**Location:** `packages/core/src/llm/anthropic-client.ts:27`
**What:** Default model `claude-sonnet-4-5` is hardcoded as a string literal.
**Suggestion:** Extract to a named constant: `const DEFAULT_MODEL = "claude-sonnet-4-5"` at module level.

---

### WARNING · packages/core/src/llm/openai-client.ts:27 — Magic Values

**Location:** `packages/core/src/llm/openai-client.ts:27`
**What:** Default model `gpt-4o` is hardcoded as a string literal.
**Suggestion:** Extract to a named constant: `const DEFAULT_MODEL = "gpt-4o"` at module level.

---

### WARNING · packages/core/src/llm/ollama-client.ts:20-21 — Magic Values

**Location:** `packages/core/src/llm/ollama-client.ts:20-21`
**What:** Default URL `http://localhost:11434` and model `llama3.1` are hardcoded.
**Suggestion:** Extract to named constants `DEFAULT_OLLAMA_URL` and `DEFAULT_MODEL`.

---

### WARNING · packages/core/src/indexer/file-scanner.ts:5-18 — Magic Values

**Location:** `packages/core/src/indexer/file-scanner.ts:5-18`
**What:** `DEFAULT_IGNORES` array contains 13 hardcoded directory names. The same patterns appear in `.opencode/agents/.gitkeep`.
**Suggestion:** Consider extracting to a shared constants file if these patterns need to stay in sync, or document why these specific directories are always ignored.

---

### WARNING · packages/mcp/src/index.ts:25-28 — Magic Values

**Location:** `packages/mcp/src/index.ts:25-28`
**What:** `MAX_PROMPT_LENGTH = 100_000` and `MAX_REQUESTS_PER_MINUTE = 60` are magic numbers without explanation.
**Suggestion:** Add inline comments explaining why these values were chosen, e.g., `// 100KB max prompt length to prevent memory issues`.

---

### WARNING · packages/core/src/orchestrator/command-parser.ts:9-33 — God Object

**Location:** `packages/core/src/orchestrator/command-parser.ts:9-33`
**What:** `parseCommand` function uses a sequential if/else chain (9 branches) to parse different command types. Adding a new command requires modifying this function.
**Suggestion:** Consider a Map-based registry pattern: `const COMMAND_PATTERNS = [[/^\/architect /, 'architect'], ...]` to make it extensible without modification.

---

### WARNING · packages/core/src/indexer/language-detector.ts:181-198 — God Object

**Location:** `packages/core/src/indexer/language-detector.ts:181-198`
**What:** `CONFIG_FILE_PATTERNS` is a large array (18 entries) used for file detection. The `detectLanguage` function then has a long if/else chain (lines 92-175) to handle each config file type.
**Suggestion:** Consider splitting `detectLanguage` into per-file-type handlers registered in a map, similar to the Strategy pattern.

---

### WARNING · packages/core/src/agents/coder/coder.ts:10-15 — Dead Code

**Location:** `packages/core/src/agents/coder/coder.ts:10-15`
**What:** `NoOpConfirmationHandler` class is defined inside `coder.ts` but a proper `NoOpConfirmationHandler` already exists in `packages/core/src/orchestrator/confirmation.ts`.
**Suggestion:** Remove the duplicate class and import from `../../orchestrator/confirmation.js`.

---

### WARNING · packages/cli/src/setup.ts:34-55 — Dead Code

**Location:** `packages/cli/src/setup.ts:34-55`
**What:** `AGENTS_CONFIG_TEMPLATE` references a TypeScript config format (`import type { DevAgentsConfig }`) but the codebase uses JSON config (`agents.config.json` per `config-loader.ts:70-71`). This template appears unused.
**Suggestion:** Remove the unused template or verify if TypeScript config support was intentionally deprecated.

---

### WARNING · packages/core/src/types.ts:7-11 — Data Clump

**Location:** `packages/core/src/types.ts:7-11`
**What:** `AgentResult` interface has `ok: boolean`, `value?: unknown`, `error?: string` — a pattern that duplicates `AgentExecutionResult` in `agents/types.ts` (which has `success: boolean`, `data: unknown`, `messages: string[]`).
**Suggestion:** Consolidate into a single Result type across the codebase, or clearly document why two similar patterns exist.

---

### WARNING · packages/core/src/logger.ts:108-131 — God Object

**Location:** `packages/core/src/logger.ts:108-131`
**What:** The `chalk` object is defined twice — first as a no-op stub (lines 108-114), then conditionally replaced with ANSI color implementations (lines 116-131). This duplication could cause confusion.
**Suggestion:** Consolidate into a single initialization: `const chalk = process.env.NODE_ENV !== "production" ? createChalk() : createNoOpChalk()`.

---

### WARNING · packages/core/src/config-loader.ts:119 — Magic Values

**Location:** `packages/core/src/config-loader.ts:119`
**What:** Comment contains Chinese text: `/* 优先级: ANTHROPIC_API_KEY > OPENAI_API_KEY > NODE_ENV=development (ollama) */`. Mixed-language comments reduce readability for non-Chinese speakers.
**Suggestion:** Rewrite comment in English: `// Priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > NODE_ENV=development (Ollama)`.

---

## NOTE Findings

### NOTE · packages/core/src/agents/tester/tester.ts:67-97 — Inconsistent Abstraction Level

**Location:** `packages/core/src/agents/tester/tester.ts:67-97`
**What:** `determineFilesToTest` mixes concerns — it handles regex parsing (`/^\/tester\s+(.*)$/`), memory access, and LLM calls all in one function.
**Suggestion:** Extract regex parsing to `parseTesterCommand()` helper and memory lookup logic into separate functions to keep `determineFilesToTest` at a single abstraction level.

---

### NOTE · packages/core/src/orchestrator/orchestrator.ts:53-166 — Inconsistent Abstraction Level

**Location:** `packages/core/src/orchestrator/orchestrator.ts:53-166`
**What:** `run()` async generator mixes high-level orchestration (yielding events) with low-level details like building context objects and session saving.
**Suggestion:** Extract `buildContext()` (lines 68, 168-179) and `saveSession()` (lines 158, 181-193) as clearly-named helpers to keep `run()` focused on orchestration flow.

---

### NOTE · packages/mcp/src/index.ts:183-199 — Feature Envy

**Location:** `packages/mcp/src/index.ts:183-199`
**What:** `runOrchestrator` simply wraps `orchestrator.run()` and collects events — it accesses no fields of the `Orchestrator` class beyond calling its single public method.
**Suggestion:** This function adds no value and could be inlined directly at call sites, or moved to be a method on `Orchestrator` if future middleware is planned.

---

### NOTE · packages/mcp/src/result-formatter.ts:42-62 — Feature Envy

**Location:** `packages/mcp/src/result-formatter.ts:42-62`
**What:** `formatPlanAsText` accesses only fields of `PlanDefinition` argument and formats them. This is pure data transformation that would read more naturally as a method on `PlanDefinition`.
**Suggestion:** Consider making `formatPlanAsText` a method on `PlanDefinition`: `PlanDefinition.formatAsText()`.

---

### NOTE · packages/acp/src/event-streamer.ts:13-80 — Feature Envy

**Location:** `packages/acp/src/event-streamer.ts:13-80`
**What:** `stream()` method accesses multiple fields of each `OrchestratorEvent` variant to format messages. The switch statement could be moved to each event variant's formatter.
**Suggestion:** Consider implementing a `format()` method on each `OrchestratorEvent` variant, or using a Map of formatters keyed by event type.

---

### NOTE · packages/core/src/orchestrator/agent-selector.ts:8-59 — Inconsistent Abstraction Level

**Location:** `packages/core/src/orchestrator/agent-selector.ts:8-59`
**What:** `selectAgentsForPrompt` mixes keyword matching (`lowerPrompt.includes("test")`) with higher-level agent selection logic. The keyword detection could be extracted.
**Suggestion:** Extract keyword detection to a named helper: `containsTestKeywords(prompt)` to clarify intent.

---

## Files Not Analyzed (by the quality agent)

| File | Reason |
|------|--------|
| `packages/core/src/llm/client.ts` | Does not exist (renamed to `create-client.ts`) |
| `packages/core/src/llm/factory.ts` | Does not exist (renamed to `create-client.ts`) |
| `packages/core/src/memory/service.ts` | Does not exist (renamed to `sqlite-memory.ts`) |
| `packages/core/src/memory/schema.ts` | Does not exist (schema inlined in `sqlite-memory.ts`) |
| `packages/core/src/indexer/languages.ts` | Does not exist (language detection in `language-detector.ts`) |
| `packages/core/src/indexer/conventions.ts` | Does not exist (convention detection in `convention-detector.ts`) |

---

## Top 5 Most Severe Findings

1. **packages/core/src/agents/coder/coder.ts:10-15** — Dead Code: Duplicate `NoOpConfirmationHandler` class should be removed and imported from orchestrator module.

2. **packages/core/src/orchestrator/command-parser.ts:9-33** — God Object: Sequential if/else chain for command parsing. A Map-based registry would be more extensible.

3. **packages/core/src/types.ts:7-11** — Data Clump: `AgentResult` duplicates the Result pattern already present in `AgentExecutionResult`.

4. **packages/core/src/logger.ts:108-131** — God Object/Duplication: The `chalk` object is defined twice with different implementations.

5. **packages/core/src/cli/setup.ts:34-55** — Dead Code: `AGENTS_CONFIG_TEMPLATE` appears unused (TypeScript config deprecated in favor of JSON).

---

## Overall Quality Assessment

**HIGH** — The codebase demonstrates solid design principles overall:

- Good separation of concerns across packages (core, acp, mcp, cli)
- Proper use of typed errors
- Appropriate use of discriminated unions for events
- Security considerations well-implemented (path traversal prevention, command allowlists)
- Consistent naming conventions

The warnings flagged are minor technical debt items rather than structural issues. None of the findings are blockers — they represent incremental improvements that could be addressed in a dedicated refactor sprint.
