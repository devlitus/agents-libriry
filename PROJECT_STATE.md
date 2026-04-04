# Project State — @devagents

> This file is auto-loaded into every OpenCode session.
> Updated by the `dev` orchestrator after each completed task.
> Source of truth for implementation progress.

---

## Current phase

**Code Quality Audit** (completed) — 12 warnings · 6 notes · 7 refactored

---

## Quality Audit Results (2026-04-04)

Full report: `docs/code-smell-audit-2026-04-04.md`

| Category | Count | Status |
|----------|-------|--------|
| Magic Values | 5 | 4 fixed, 1 note |
| Dead Code | 2 | 1 fixed, 1 blocked (template still used) |
| God Object | 2 | 1 fixed (logger), 1 noted |
| Data Clump | 1 | noted |
| Feature Envy | 3 | noted |
| Inconsistent Abstraction | 3 | noted |

**Refactored (7):**
- `coder.ts` — removed duplicate `NoOpConfirmationHandler`, imported from orchestrator
- `anthropic-client.ts` — `DEFAULT_MODEL` constant extracted
- `openai-client.ts` — `DEFAULT_MODEL` constant extracted
- `ollama-client.ts` — `DEFAULT_OLLAMA_URL` + `DEFAULT_MODEL` constants extracted
- `logger.ts` — chalk initialization consolidated into single conditional
- `config-loader.ts` — Chinese comment rewritten to English
- `language-detector.ts` — if/else chain refactored to Strategy/Registry pattern

**Not fixed (remaining):**
- `command-parser.ts` — if/else chain (Map registry pattern would be more extensible)
- `setup.ts` — `AGENTS_CONFIG_TEMPLATE` IS used by `createAgentsConfig()`, not dead code
- `types.ts` — `AgentResult` vs `AgentExecutionResult` duplication (needs architectural decision)
- `file-scanner.ts`, `mcp/index.ts` — magic numbers (low priority)
- Feature Envy / Inconsistent Abstraction notes (low priority)

---

## Phase progress

| Phase | Status | Completed tasks |
|-------|--------|----------------|
| 0 — Scaffolding | completed | 0.1-0.8 |
| 1 — Core fundamentals | completed | 1.1-1.5 |
| 2 — Agents | completed | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8 |
| 3 — Transports | completed | 3.1, 3.2, 3.3 |
| 4 — CLI + polish | completed | 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9 |

---

## Completed tasks

### Phase 0 — Scaffolding
- Monorepo setup, TypeScript config, tsup, vitest, workspace config

### Phase 1 — Core Fundamentals (COMPLETED)
- **1.1** LLM Abstraction — providers, factory, types
- **1.1.8** LLM error classes
- **1.2** SQLite Memory — service, types, CRUD operations
- **1.2.8** Memory error classes
- **1.3** Indexer — all components
- **1.4** Shared types and config loader
- **1.5** Barrel export

### Phase 2 — Agents (COMPLETED)

#### Common Agent Base (2.1)
- **2.1.1** Agent interface types (Agent, AgentContext, AgentResult, AgentName)
- **2.1.2** ToolProvider interface (readFile, writeFile, listDirectory, runCommand)
- **2.1.3** Prompt builder functions
- **2.1.4** Response parser functions with retry

#### Architect (2.3)
- **2.3.1** ArchitectPlan types
- **2.3.2** ArchitectAgent implementation
- **2.3.3** File selector for relevant files
- **2.3.4** Tests

#### Coder (2.4)
- **2.4.1** CoderOutput types
- **2.4.2** CoderAgent with confirmation flow
- **2.4.3** Diff generator (diff + chalk)
- **2.4.4** Dependency detector
- **2.4.5** Standalone mode (without Architect)

#### Tester (2.5)
- **2.5.1** TesterOutput types
- **2.5.2** TesterAgent implementation
- **2.5.3** Test command generator (Jest, Vitest, Mocha, pytest, cargo)
- **2.5.4** Standalone mode (/tester <file>)

#### Reviewer (2.6)
- **2.6.1** ReviewerOutput types
- **2.6.2** ReviewerAgent implementation
- **2.6.3** Security static checks (credentials, SQL injection, eval)
- **2.6.4** Observation formatter with severity icons
- **2.6.5** Correction cycle (Coder re-activated on Reviewer issues)

#### Orchestrator (2.2 & 2.7)
- **2.2.1** Orchestrator class with event streaming
- **2.2.2** Command parser (/architect, /coder, / tester, /reviewer, /plan)
- **2.2.3** Agent selector for free prompts
- **2.2.4** Plan generator
- **2.2.5** ConfirmationHandler (NoOp implementation)
- **2.2.6** Event types defined
- **2.2.7** Session saving
- **2.2.8** Orchestrator unit tests
- **2.7.1** Register agents in Orchestrator
- **2.7.2** Result passing between agents via previousResults map
- **2.7.3** Integration test for full flow

#### Exports (2.8)
- **2.8.1** Barrel exports for agents and orchestrator

### Phase 3 — Transports (COMPLETED)

#### ACP Transport (3.1)
- **3.1.1** ACP SDK research
- **3.1.2** Main ACP process (index.ts)
- **3.1.3** AcpToolProvider
- **3.1.4** AcpConfirmationHandler (17 tests)
- **3.1.5** EventStreamer (4 tests)
- **3.1.6** Agent registration — added agentInfo with name "Dev Team", capabilities
- **3.1.7** Tests (27 tests total)

#### MCP Transport (3.2)
- **3.2.1** MCP tools design (7 tools defined)
- **3.2.2** MCP server (index.ts) with all 7 handlers implemented
- **3.2.3** Handlers: orchestrate, architect, coder, tester, reviewer, plan, status
- **3.2.4** McpToolProvider
- **3.2.5** McpConfirmationHandler
- **3.2.6** Result formatter
- **3.2.7** MCP Resources: project://index, project://sessions, project://config
- **3.2.8** Tests (23 tests total)

#### Cross-transport Integration Tests (3.3)
- **3.3.1** ACP + Core end-to-end (integration.test.ts)
- **3.3.2** MCP + Core end-to-end (6 tests)
- **3.3.3** ACP ↔ MCP parity (6 tests)

### Phase 4 — CLI + Polish (COMPLETED)

#### CLI Setup (4.1)
- **4.1.1-4.1.5** Interactive setup wizard with @clack/prompts
- **4.1.6** Tests for setup command

#### CLI Check (4.2)
- **4.2.1-4.2.2** Check command (LLM, ACP, MCP, SQLite, config)
- **4.2.3** Tests for check command

#### CLI Entry Point (4.3)
- **4.3.1** Main entry point with routing

#### IDE Configuration (4.4)
- **4.4.1-4.4.5** IDE config generator for Zed, JetBrains, VS Code (ACP), VS Code (MCP), Claude Code, Cursor

#### Error Handling (4.5)
- **4.5.1-4.5.4** LLM errors, filesystem errors, parse errors, timeouts

#### Logging (4.6)
- **4.6.1** Structured logger with levels, JSON output in production, colored in dev
- **4.6.2** Logging added to Orchestrator, Memory, Agents

#### Documentation (4.7)
- **4.7.1** Root README.md comprehensive
- **4.7.2** Package READMEs (updated package.json fields)
- **4.7.3** CHANGELOG.md created

#### npm Publication (4.8)
- **4.8.1** Package.json fields: description, keywords, license, repository, files
- **4.8.2** Binaries verified
- **4.8.3** Dry run ready

#### Acceptance Tests (4.9)
- **4.9.1-4.9.7** Command parsing, security checks, language detection tests

---

## Files written so far

### Agent base (2.1)
- `packages/core/src/agents/types.ts` — Agent, AgentContext, AgentResult, AgentName
- `packages/core/src/agents/tool-provider.ts` — ToolProvider, CommandResult
- `packages/core/src/agents/orchestrator-types.ts` — OrchestratorEvent, PlanDefinition, ConfirmationHandler
- `packages/core/src/agents/prompts.ts` — buildArchitectPrompt, buildCoderPrompt, buildTesterPrompt, buildReviewerPrompt
- `packages/core/src/agents/response-parser.ts` — parseArchitectResponse, parseCoderResponse, etc.
- `packages/core/src/agents/index.ts` — barrel export

### Orchestrator (2.2 & 2.7)
- `packages/core/src/orchestrator/orchestrator.ts` — Orchestrator class with logging
- `packages/core/src/orchestrator/command-parser.ts` — parseCommand
- `packages/core/src/orchestrator/agent-selector.ts` — selectAgentsForPrompt
- `packages/core/src/orchestrator/plan-generator.ts` — generatePlan, formatPlanForDisplay
- `packages/core/src/orchestrator/confirmation.ts` — NoOpConfirmationHandler
- `packages/core/src/orchestrator/index.ts` — barrel export
- `packages/core/src/orchestrator/orchestrator.test.ts` — Unit tests for Orchestrator
- `packages/core/src/orchestrator/orchestrator.integration.test.ts` — End-to-end flow tests

### Agent types (2.3-2.6)
- `packages/core/src/agents/architect/types.ts` — ArchitectPlan
- `packages/core/src/agents/coder/types.ts` — CoderOutput
- `packages/core/src/agents/tester/types.ts` — TesterOutput
- `packages/core/src/agents/reviewer/types.ts` — ReviewerOutput

### Agent implementations
- `packages/core/src/agents/architect/architect.ts` — ArchitectAgent
- `packages/core/src/agents/architect/file-selector.ts` — selectRelevantFiles
- `packages/core/src/agents/coder/coder.ts` — CoderAgent
- `packages/core/src/agents/coder/diff-generator.ts` — generateDiff
- `packages/core/src/agents/coder/dependency-detector.ts` — detectDependencies
- `packages/core/src/agents/tester/tester.ts` — TesterAgent
- `packages/core/src/agents/tester/test-command.ts` — generateTestCommand, shellEscape
- `packages/core/src/agents/tester/invalid-path-error.ts` — InvalidTestPathError (NEW)
- `packages/core/src/agents/tester/shell-escape.test.ts` — 20 tests for shellEscape (NEW)
- `packages/core/src/agents/reviewer/reviewer.ts` — ReviewerAgent
- `packages/core/src/agents/reviewer/security-checks.ts` — runSecurityChecks
- `packages/core/src/agents/reviewer/formatter.ts` — formatObservation

### Phase 1 files
- `packages/core/src/llm/` — all LLM provider files
- `packages/core/src/memory/` — all memory files
- `packages/core/src/indexer/` — all indexer files
- `packages/core/src/config-loader.ts`
- `packages/core/src/types.ts`

### Phase 3 — ACP Transport
- `packages/acp/src/tool-provider.ts` — AcpToolProvider using ACP connection
- `packages/acp/src/confirmation-handler.ts` — AcpConfirmationHandler using requestPermission
- `packages/acp/src/event-streamer.ts` — EventStreamer for ACP messages
- `packages/acp/src/index.ts` — Main ACP agent entry point with DevAgentsAcpAgent class
- `packages/acp/src/__tests__/tool-provider.test.ts`
- `packages/acp/src/__tests__/event-streamer.test.ts`
- `packages/acp/src/__tests__/confirmation-handler.test.ts` (17 tests)
- `packages/acp/src/__tests__/integration.test.ts` (7 tests, 1 skipped)
- `packages/acp/src/__tests__/smoke.test.ts`

### Phase 3 — MCP Transport
- `packages/mcp/src/tool-provider.ts` — McpToolProvider using Node.js fs
- `packages/mcp/src/confirmation-handler.ts` — McpConfirmationHandler
- `packages/mcp/src/result-formatter.ts` — formatEventAsText, formatResult
- `packages/mcp/src/index.ts` — MCP server with all 7 tools, resources, handlers
- `packages/mcp/src/__tests__/tool-provider.test.ts`
- `packages/mcp/src/__tests__/result-formatter.test.ts`
- `packages/mcp/src/__tests__/integration.test.ts` (6 tests)
- `packages/mcp/src/__tests__/parity.test.ts` (6 tests)
- `packages/mcp/src/__tests__/smoke.test.ts`

### Phase 4 — CLI + Polish
- `packages/cli/src/setup.ts` — Interactive setup wizard with @clack/prompts
- `packages/cli/src/check.ts` — Environment check command
- `packages/cli/src/init-ide.ts` — IDE configuration generator
- `packages/cli/src/errors.ts` — Typed error classes for CLI
- `packages/cli/src/index.ts` — CLI entry point with routing
- `packages/cli/src/__tests__/setup.test.ts` — Tests for setup wizard
- `packages/core/src/logger.ts` — Structured logging with levels
- `packages/core/src/__tests__/acceptance.test.ts` — Acceptance tests for Phase 4
- `packages/core/src/__tests__/package-readmes.test.ts` — Tests verifying package README files
- `packages/core/README.md` — Core package documentation
- `packages/acp/README.md` — ACP transport documentation
- `packages/mcp/README.md` — MCP transport documentation
- `packages/cli/README.md` — CLI commands documentation

---

## Last session summary (2026-04-04)

**Pipeline: test → refactor → quality → security en `language-detector.ts`**

**Test:** 27 tests escritos (tester agent), 5 frameworks no detectados inicialmente.

**Refactor:** Strategy/Registry pattern aplicado — if/else chain reemplazado por `HANDLERS` map keyed por config file name. Fix para Axum, Actix, Spring (pom.xml), Laravel.

**Quality:** 0 WARNINGs, 5 NOTEs (DRY violation en Python handlers, unused `LanguageDetectorError`, dynamic import dentro del loop).

**Security:** 1 MEDIUM — `JSON.parse` sin try/catch en `package.json` y `composer.json`. Fix aplicado.

**Result**: Build ✓ · Tests: 252 passed (pre-existing test mock bug fixed — mock ahora usa `mockImplementation` en lugar de `mockResolvedValueOnce` con orden incorrecto)
