# Phase 2 — Agents (Orchestrator + 4 Specialized Agents)

**Objective:** Implement the orchestrator and 4 specialized agents (Architect, Coder, Tester, Reviewer) with intra-process communication and sequential coordination.

**Dependencies:** Phase 1 completed (LLM, Memory, and Indexer functional)

---

## Task 2.1 — Common agent base (`packages/core/src/agents/`) `[M]`

### 2.1.1 — Define base `Agent` interface
- Create `packages/core/src/agents/types.ts`
- `Agent` interface:
  ```typescript
  interface Agent {
    name: AgentName;
    execute(context: AgentContext): Promise<AgentResult>;
  }
  ```
- `AgentContext`:
  - `sessionId: string`
  - `prompt: string` — original user prompt
  - `projectIndex: DetectedProject` — indexer data
  - `previousResults: Map<AgentName, AgentResult>` — results from previous agents
  - `config: DevAgentsConfig`
  - `llm: LlmClient`
  - `memory: MemoryService`
  - `tools: ToolProvider` — access to IDE tools (filesystem, terminal)
- `AgentResult`:
  - `agent: AgentName`
  - `success: boolean`
  - `data: unknown` — specific to each agent (plan, files, tests, review)
  - `messages: string[]` — messages to show to user
- [ ] `Agent` interface is defined and generic for all 4 agents
- [ ] `AgentContext` contains all info an agent needs

### 2.1.2 — Define `ToolProvider` interface
- Create `packages/core/src/tools/types.ts`
- Interface that abstracts IDE tools (filesystem + terminal):
  ```typescript
  interface ToolProvider {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;  // requires confirmation
    listDirectory(path: string): Promise<string[]>;
    runCommand(command: string): Promise<CommandResult>;  // requires confirmation
  }
  ```
- `CommandResult`: `{ exitCode: number; stdout: string; stderr: string }`
- This interface will be implemented by `acp` and `mcp` packages per protocol
- [ ] `ToolProvider` interface is defined
- [ ] It's protocol-agnostic (ACP or MCP)

### 2.1.3 — Create agent prompt system
- Create `packages/core/src/agents/prompts.ts`
- Functions that generate system prompt for each agent:
  - `buildArchitectPrompt(context: AgentContext): string`
  - `buildCoderPrompt(context: AgentContext, plan: ArchitectPlan): string`
  - `buildTesterPrompt(context: AgentContext, filesWritten: string[]): string`
  - `buildReviewerPrompt(context: AgentContext, filesWritten: string[], plan: ArchitectPlan): string`
- Each prompt includes:
  - Agent role description
  - Project information (language, framework, conventions)
  - Specific context (plan, written files, etc.)
  - Output format instructions (structured JSON)
- [ ] Prompts include indexed project info
- [ ] Each prompt guides LLM to produce output in expected format
- [ ] Prompts are language-agnostic relative to user project

### 2.1.4 — Create LLM response parser
- Create `packages/core/src/agents/response-parser.ts`
- Functions to parse LLM response to structured types:
  - `parseArchitectResponse(raw: string): ArchitectPlan`
  - `parseCoderResponse(raw: string): CoderOutput`
  - `parseTesterResponse(raw: string): TesterOutput`
  - `parseReviewerResponse(raw: string): ReviewerOutput`
- Robust JSON handling: find ```json``` blocks in response
- Fallback: retry with correction prompt if JSON is invalid
- [ ] Parses well-formatted responses correctly
- [ ] Extracts JSON from responses with text before/after block
- [ ] Handles parsing errors with retry

---

## Task 2.2 — Orchestrator (`packages/core/src/orchestrator/`) `[XL]`

### 2.2.1 — Implement the `Orchestrator`
- Create `packages/core/src/orchestrator/orchestrator.ts`
- Constructor receives: `config`, `llm`, `memory`, `tools`
- Main method: `run(prompt: string): AsyncIterable<OrchestratorEvent>`
  - Returns streaming events for transport to send to IDE
- Internal flow:
  1. Generate `sessionId` (UUID)
  2. Query `project_index` via `memory`
  3. If no index or not fresh → call `Indexer`
  4. Detect if explicit command (`/coder`, `/architect`, etc.) or free prompt
  5. Decide which agents to activate and in what order
  6. Generate execution plan
  7. Emit `plan` event to show to user
  8. Wait for user confirmation (if `confirmPlan: true`)
  9. Execute agents sequentially, passing results between them
  10. Save session to `session_history`
- [ ] Orchestrator coordinates full flow: index → plan → execute → save
- [ ] Emits streaming events at each step

### 2.2.2 — Implement explicit command detection
- Create `packages/core/src/orchestrator/command-parser.ts`
- Parse user prompt to detect commands:
  - `/architect <prompt>` → Architect only
  - `/coder <prompt>` → Coder only
  - `/tester <prompt>` or `/tester <file>` → Tester only
  - `/reviewer` → Reviewer only
  - `/plan <prompt>` → plan only, no execution
  - No prefix → free prompt → full flow
- Extract prompt without command
- [ ] Correctly detects all 5 commands from spec
- [ ] Free prompt (no `/`) activates full flow
- [ ] `/plan` only generates plan without executing

### 2.2.3 — Implement agent selector for free prompt
- Create `packages/core/src/orchestrator/agent-selector.ts`
- Use LLM to decide which agents to activate based on prompt:
  - "create an endpoint" → Architect + Coder + (Tester if `autoTest`) + (Reviewer if `autoReview`)
  - "add tests to X" → Tester only
  - "refactor X" → Coder + (Reviewer if `autoReview`)
  - "review the code" → Reviewer only
  - "design structure of X" → Architect only
- Alternative: classify with simple heuristics + LLM as fallback
- [ ] Selects correct agent sequence for typical prompts
- [ ] Respects `autoTest` and `autoReview` from config

### 2.2.4 — Implement plan generation and display
- Create `packages/core/src/orchestrator/plan-generator.ts`
- Generate plan according to spec format (section 4.1):
  ```
  Execution plan — "<prompt summary>"
  Detected language: TypeScript (Express)
  Context files read: ...
  1. Architect → decides structure...
  2. Coder → implements...
  ...
  Continue? [Y/n/edit]
  ```
- Include: language, framework, context files, agent sequence
- [ ] Plan shows correct project information
- [ ] Plan lists agents that will be activated
- [ ] Format is readable and matches spec

### 2.2.5 — Implement confirmation system
- Create `packages/core/src/orchestrator/confirmation.ts`
- `ConfirmationHandler` interface:
  ```typescript
  interface ConfirmationHandler {
    confirmPlan(plan: ExecutionPlan): Promise<UserConfirmation>;
    confirmFileWrite(path: string, diff: string, isNew: boolean): Promise<UserConfirmation>;
    confirmCommand(command: string): Promise<UserConfirmation>;
  }
  ```
- Transports (ACP/MCP) implement this interface to communicate with IDE
- If user chooses "edit" on file: receive edited content
- [ ] Interface covers 3 confirmations from spec (plan, file, command)
- [ ] Supports 3 responses: yes, no, edit

### 2.2.6 — Implement streaming event system
- Create `packages/core/src/orchestrator/events.ts`
- Event types:
  - `indexing_start`, `indexing_complete`
  - `plan_ready` (with plan to display)
  - `plan_confirmed` / `plan_rejected`
  - `agent_start(agentName)`, `agent_progress(message)`, `agent_complete(result)`
  - `confirm_file(path, diff)`, `confirm_command(cmd)`
  - `session_complete`
  - `error(message)`
- Orchestrator emits these events; transport converts to protocol format
- [ ] All event types are defined
- [ ] Full flow emits events in correct order
- [ ] Progress events enable real-time streaming

### 2.2.7 — Implement session saving
- On flow end (success or error):
  - Save to `session_history`: prompt, agents used, files modified, commands executed
  - Respect `keepSessionHistory` from config (prune)
- [ ] Session is saved with all fields
- [ ] Old sessions are deleted per config

### 2.2.8 — Tests for orchestrator
- Mock LLM, memory, and tools
- Test full flow with free prompt
- Test each explicit command
- Test that plan is shown before executing
- Test that plan rejection cancels execution
- Test session saving
- [ ] Tests cover full flow and explicit commands
- [ ] Tests verify agent execution order
- [ ] Coverage > 75% in `src/orchestrator/`

---

## Task 2.3 — Architect Agent (`packages/core/src/agents/architect/`) `[L]`

### 2.3.1 — Define Architect types
- Create `packages/core/src/agents/architect/types.ts`
- `ArchitectPlan` per spec (section 5.2):
  ```typescript
  interface ArchitectPlan {
    filesToCreate: { path: string; description: string; template?: string }[];
    filesToModify: { path: string; currentContent: string; change: string }[];
    conventions: ProjectConventions;
    notes: string[];
  }
  ```
- [ ] `ArchitectPlan` type matches spec

### 2.3.2 — Implement `ArchitectAgent`
- Create `packages/core/src/agents/architect/architect.ts`
- Implements `Agent` interface
- `execute(context)`:
  1. Read directory structure from index
  2. Read most relevant files for prompt (uses heuristics + LLM)
  3. Identify existing patterns
  4. Call LLM with Architect prompt (from `prompts.ts`)
  5. Parse response to `ArchitectPlan`
  6. Save `last_architect_plan` to `agent_memory`
  7. Return plan as `AgentResult`
- [ ] Produces `ArchitectPlan` with files to create and modify
- [ ] Reads relevant project files to inform decision
- [ ] Saves plan to `agent_memory`

### 2.3.3 — Implement relevant file selection
- Create `packages/core/src/agents/architect/file-selector.ts`
- Given prompt and file tree, select most relevant:
  - Search by name (if prompt mentions specific files)
  - Search by type (if prompt mentions "endpoint" → search in routes)
  - Use LLM as fallback to choose relevant files from tree
- Limit to 20 files max to avoid context overload
- [ ] Selects files relevant to prompt
- [ ] Doesn't select more than 20 files
- [ ] Works with name and type search

### 2.3.4 — Tests for Architect
- Mock LLM with predefined responses
- Test with prompt to create new endpoint
- Test with prompt to modify existing code
- Test that it saves plan to memory
- [ ] Tests cover file creation and modification
- [ ] Generated plan has correct structure

---

## Task 2.4 — Coder Agent (`packages/core/src/agents/coder/`) `[XL]`

### 2.4.1 — Define Coder types
- Create `packages/core/src/agents/coder/types.ts`
- `CoderOutput`:
  ```typescript
  interface CoderOutput {
    filesWritten: { path: string; content: string; isNew: boolean }[];
    dependenciesInstalled: string[];
    messages: string[];
  }
  ```
- [ ] Types cover Coder output

### 2.4.2 — Implement `CoderAgent`
- Create `packages/core/src/agents/coder/coder.ts`
- Implements `Agent` interface
- `execute(context)`:
  1. Get `ArchitectPlan` from `previousResults` (or interpret prompt directly if activated alone)
  2. For each file to create/modify:
     a. Read current content if exists (via `tools.readFile`)
     b. Generate code with LLM respecting conventions
     c. Generate diff
     d. Request user confirmation (via `ConfirmationHandler`)
     e. If confirmed: write (via `tools.writeFile`)
     f. If edited: apply user changes and write
     g. If rejected: skip this file
  3. Detect imports of non-installed dependencies
  4. If new dependencies: propose `npm install X` (with confirmation)
  5. Save `files_written` to `agent_memory`
- [ ] Generates code for each file from Architect plan
- [ ] Requests confirmation before each write
- [ ] Handles 3 responses (yes/no/edit)
- [ ] Detects and proposes installing new dependencies

### 2.4.3 — Implement diff generation
- Create `packages/core/src/agents/coder/diff-generator.ts`
- Use `diff` library to generate readable diffs
- For new files: show everything as `+` (addition)
- For modified files: show only changed lines with context
- Color with `chalk`: green for additions, red for deletions
- Format similar to spec (section 5.3)
- [ ] Generates correct diff for new files
- [ ] Generates correct diff for modifications
- [ ] Output is readable with colors

### 2.4.4 — Implement dependency detection
- Create `packages/core/src/agents/coder/dependency-detector.ts`
- Analyze imports in generated code
- Compare with `package.json` / `requirements.txt` / `Cargo.toml`
- If import is from non-installed package: add to list
- Don't include local file imports (e.g.: `./utils`)
- [ ] Detects `zod` import if not in `package.json`
- [ ] Doesn't report local file imports as missing dependencies
- [ ] Works for npm (JS/TS) and pip (Python)

### 2.4.5 — Implement standalone mode (without Architect)
- If Coder activated directly (via `/coder`), without Architect plan:
  1. Read user prompt
  2. Use LLM to determine files to create/modify
  3. Generate internal mini-plan
  4. Continue with normal generation flow
- [ ] `/coder "implement class X"` works without going through Architect
- [ ] Coder decides files to create/modify by itself

### 2.4.6 — Tests for Coder
- Mock LLM, tools, and confirmations
- Test new file creation with "yes" confirmation
- Test modification with "yes" confirmation
- Test "no" confirmation (file not written)
- Test dependency detection
- Test standalone mode
- [ ] Tests cover 3 confirmation types
- [ ] Tests verify `files_written` is saved to memory

---

## Task 2.5 — Tester Agent (`packages/core/src/agents/tester/`) `[L]`

### 2.5.1 — Define Tester types
- Create `packages/core/src/agents/tester/types.ts`
- `TesterOutput`:
  ```typescript
  interface TesterOutput {
    testFilesWritten: { path: string; content: string }[];
    testCommand: string;
    testResult?: { passed: boolean; output: string };
    messages: string[];
  }
  ```
- [ ] Types cover Tester output

### 2.5.2 — Implement `TesterAgent`
- Create `packages/core/src/agents/tester/tester.ts`
- Implements `Agent` interface
- `execute(context)`:
  1. Get `files_written` from Coder (from `previousResults` or `agent_memory`)
  2. Read existing tests from project to understand pattern
  3. Detect test framework (from `projectIndex`)
  4. Generate tests with LLM respecting pattern and location
  5. Show diff and request confirmation
  6. Write confirmed tests
  7. Propose running tests (with command confirmation)
  8. If user confirms: execute and report result
  9. Save `test_files` to `agent_memory`
- [ ] Generates tests for files written by Coder
- [ ] Uses correct test framework
- [ ] Respects project's test naming pattern
- [ ] Proposes and runs tests (with confirmation)

### 2.5.3 — Implement test command generation
- Create `packages/core/src/agents/tester/test-command.ts`
- Generate correct command per framework:
  - Jest: `npm test -- --testPathPattern=<file>`
  - Vitest: `npx vitest run <file>`
  - Mocha: `npx mocha <file>`
  - pytest: `pytest <file>`
  - Rust: `cargo test <module>`
- [ ] Generates correct command for each supported framework
- [ ] Command points to specific test file, not all

### 2.5.4 — Implement standalone mode (direct via `/tester`)
- If activated with `/tester <file>`:
  1. Read specified file
  2. Generate tests for that file
  3. Continue with normal flow
- If activated with `/tester` no argument:
  1. Ask which file to test or test recently modified
- [ ] `/tester src/utils/date.ts` generates tests for that file
- [ ] `/tester` with no argument has reasonable behavior

### 2.5.5 — Tests for Tester
- Mock LLM, tools, confirmations
- Test generating tests for TypeScript file with Jest
- Test generating tests for Python with pytest
- Test that it respects existing naming pattern
- Test execution (mock terminal)
- [ ] Tests cover Jest and pytest at minimum
- [ ] Tests verify naming pattern

---

## Task 2.6 — Reviewer Agent (`packages/core/src/agents/reviewer/`) `[L]`

### 2.6.1 — Define Reviewer types
- Create `packages/core/src/agents/reviewer/types.ts`
- `ReviewerOutput`:
  ```typescript
  interface ReviewerOutput {
    observations: ReviewObservation[];
    overallAssessment: "pass" | "warnings" | "issues";
    messages: string[];
  }
  interface ReviewObservation {
    severity: "error" | "warning" | "suggestion";
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
  }
  ```
- [ ] Types cover Reviewer output

### 2.6.2 — Implement `ReviewerAgent`
- Create `packages/core/src/agents/reviewer/reviewer.ts`
- Implements `Agent` interface
- `execute(context)`:
  1. Get `files_written` and `last_architect_plan` from `previousResults` / `agent_memory`
  2. Read current content of written files
  3. Read some codebase files to compare style
  4. Call LLM with review prompt
  5. Parse observations
  6. Show observations to user (spec format, section 5.5)
  7. If observations exist: ask if Coder should apply fixes
  8. Save `review_notes` to `agent_memory`
- [ ] Produces observations with severity, file, line, and suggestion
- [ ] Detects style inconsistencies with codebase
- [ ] Detects basic security issues

### 2.6.3 — Implement security checklist
- Create `packages/core/src/agents/reviewer/security-checks.ts`
- Static checks (no LLM) as complement:
  - Search hardcoded credentials: `password =`, `api_key =`, `secret =`
  - Search unsanitized SQL: string concatenation in queries
  - Search `eval()`, `exec()` with dynamic input
  - Search `dangerouslySetInnerHTML` in React
  - Search `innerHTML` with variables
- These checks add to LLM observations
- [ ] Detects `password = "hardcoded"` in code
- [ ] Detects basic SQL injection
- [ ] Detects `eval()` with dynamic input

### 2.6.4 — Implement observation formatting
- Create `packages/core/src/agents/reviewer/formatter.ts`
- Format observations per spec:
  ```
  ⚠  src/routes/users.ts line 23
     Catch block exposes full stack trace.
     Suggestion: return only message.
  ```
- Use icons per severity: `❌` error, `⚠` warning, `💡` suggestion
- [ ] Format matches spec
- [ ] Icons correspond to severity

### 2.6.5 — Implement correction cycle
- If user accepts corrections:
  - Reviewer returns observations as part of `AgentResult`
  - Orchestrator detects pending corrections
  - Orchestrator activates Coder again with observations as context
- [ ] Reviewer → Coder flow works to apply corrections
- [ ] Coder receives observations and generates fixes

### 2.6.6 — Tests for Reviewer
- Mock LLM and memory
- Test review with clean code (no observations)
- Test review with style issues
- Test hardcoded credential detection
- Test SQL injection detection
- Test correction cycle
- [ ] Tests cover 3 severity levels
- [ ] Tests verify security issue detection

---

## Task 2.7 — Integrate all agents in Orchestrator `[M]`

### 2.7.1 — Register agents in Orchestrator
- Create instances of 4 agents in Orchestrator constructor
- Implement agent map: `Map<AgentName, Agent>`
- Full flow: Architect → Coder → Tester (if `autoTest`) → Reviewer (if `autoReview`)
- [ ] All 4 agents are registered and accessible
- [ ] Full flow executes in correct order

### 2.7.2 — Implement result passing between agents
- After each agent, add result to `Map<AgentName, AgentResult>`
- Next agent's context includes previous agents' results
- Coder receives Architect's plan
- Tester receives Coder's files
- Reviewer receives Coder's files and Architect's plan
- [ ] Each agent has access to previous agents' results
- [ ] Full chain works end-to-end

### 2.7.3 — Integration test for full flow
- End-to-end test with mocks: prompt → Architect → Coder → Tester → Reviewer
- Verify data flows correctly between agents
- Verify session is saved at end
- Verify confirmations are requested at correct points
- [ ] Full flow works end-to-end with mocks
- [ ] Results pass correctly between agents
- [ ] Session is saved to SQLite

---

## Task 2.8 — Update core exports `[S]`

### 2.8.1 — Barrel exports for agents and orchestrator
- Export from `packages/core/src/index.ts`:
  - `Orchestrator`
  - Types: `AgentContext`, `AgentResult`, `ArchitectPlan`, `CoderOutput`, `TesterOutput`, `ReviewerOutput`
  - `ToolProvider`, `ConfirmationHandler`
  - Events: `OrchestratorEvent` and subtypes
- [ ] All public types are importable from `@devagents/core`
- [ ] `pnpm -r build` passes without errors

---

## Phase 2 Summary

| Task | Complexity | Subtasks |
|------|:----------:|:--------:|
| 2.1 Common base | M | 4 |
| 2.2 Orchestrator | XL | 8 |
| 2.3 Architect | L | 4 |
| 2.4 Coder | XL | 6 |
| 2.5 Tester | L | 5 |
| 2.6 Reviewer | L | 6 |
| 2.7 Integration | M | 3 |
| 2.8 Exports | S | 1 |
| **Total** | | **37 subtasks** |
