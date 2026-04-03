# Project State — @devagents

> This file is auto-loaded into every OpenCode session.
> Updated by the `dev` orchestrator after each completed task.
> Source of truth for current implementation progress.

---

## Current phase

**Phase 2 — Agents** (completed)

---

## Phase progress

| Phase | Status | Completed tasks |
|-------|--------|----------------|
| 0 — Scaffolding | completed | 0.1-0.8 |
| 1 — Core fundamentals | completed | 1.1-1.5 |
| 2 — Agents | completed | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8 |
| 3 — Transports | not started | — |
| 4 — CLI + polish | not started | — |

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
- **2.2.2** Command parser (/architect, /coder, /tester, /reviewer, /plan)
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
- `packages/core/src/orchestrator/orchestrator.ts` — Orchestrator class
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
- `packages/core/src/agents/tester/test-command.ts` — generateTestCommand
- `packages/core/src/agents/reviewer/reviewer.ts` — ReviewerAgent
- `packages/core/src/agents/reviewer/security-checks.ts` — runSecurityChecks
- `packages/core/src/agents/reviewer/formatter.ts` — formatObservation

### Tests
- `packages/core/src/agents/types.test.ts`
- `packages/core/src/agents/tool-provider.test.ts`
- `packages/core/src/agents/orchestrator-types.test.ts`
- `packages/core/src/agents/architect/architect.test.ts`
- `packages/core/src/agents/coder/coder.test.ts`
- `packages/core/src/agents/tester/tester.test.ts`
- `packages/core/src/agents/reviewer/reviewer.test.ts`

### Phase 1 files
- `packages/core/src/llm/` — all LLM provider files
- `packages/core/src/memory/` — all memory files
- `packages/core/src/indexer/` — all indexer files
- `packages/core/src/config-loader.ts`
- `packages/core/src/types.ts`

---

## Last session summary

Phase 2 (Agents) fully completed:
- Implemented all 4 agents: Architect, Coder, Tester, Reviewer
- Integrated agents into Orchestrator with result passing via previousResults map
- Implemented correction cycle: Reviewer → Coder when issues found
- Added diff generation (diff + chalk), dependency detection, security static checks
- Added standalone mode for Coder and Tester agents
- 83 tests passing, build clean across all packages

Bug fix applied:
- Removed `as any` from orchestrator.ts (reviewer correction cycle)
- Now uses proper `ReviewerOutput` and `ReviewObservation` types
- Build and tests pass after fix

---

## Next steps

**Phase 3 — Transports:**
- ACP transport (Zed, JetBrains, VS Code)
- MCP transport (Claude Code, Cursor)
- Protocol adapters

---

## Known blockers

_None._
