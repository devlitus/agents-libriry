# Phase 3 — Transports (ACP + MCP)

**Objective:** Implement the two transport packages that connect the core with IDEs. ACP for Zed/JetBrains/VS Code (ACP extension) and MCP for Claude Code/Cursor/Copilot.

**Dependencies:** Phase 2 completed (Orchestrator and agents functional)

---

## Task 3.1 — ACP Transport (`packages/acp/`) `[XL]`

### 3.1.1 — Research and document ACP SDK
- Study `@agentclientprotocol/sdk` API
- Document in code comments:
  - How to create `AgentSideConnection`
  - How to register tools
  - How to receive messages from IDE
  - How to send responses/streaming to IDE
  - How to request user confirmations
- [ ] Team understands ACP SDK API
- [ ] Reference examples are documented

### 3.1.2 — Implement main ACP process
- Create `packages/acp/src/index.ts`
- Start process with stdin/stdout JSON-RPC
- Create `AgentSideConnection`
- Instantiate `Orchestrator` from core with dependencies:
  - `LlmClient` (via factory with auto-detection)
  - `MemoryService` (SQLite)
  - `ToolProvider` (ACP implementation)
  - `ConfirmationHandler` (ACP implementation)
- Load user config (`agents.config.ts`)
- Handle clean shutdown signals (`SIGTERM`, `SIGINT`)
- [ ] Process starts without errors with `./node_modules/.bin/devagents-acp`
- [ ] Connects to IDE via JSON-RPC stdin/stdout
- [ ] Closes cleanly with signals

### 3.1.3 — Implement `AcpToolProvider`
- Create `packages/acp/src/tool-provider.ts`
- Implement `ToolProvider` using IDE's ACP tools:
  - `readFile()` → call IDE's filesystem tool via ACP
  - `writeFile()` → call IDE's filesystem tool (with IDE confirmation)
  - `listDirectory()` → call IDE's filesystem tool
  - `runCommand()` → call IDE's terminal tool (with confirmation)
- [ ] `readFile` reads project files via ACP
- [ ] `writeFile` requests user confirmation in IDE before writing
- [ ] `runCommand` requests confirmation before executing
- [ ] `listDirectory` returns file list

### 3.1.4 — Implement `AcpConfirmationHandler`
- Create `packages/acp/src/confirmation-handler.ts`
- Implement `ConfirmationHandler` translating to ACP messages:
  - `confirmPlan()` → send plan as message to IDE, wait for response
  - `confirmFileWrite()` → send diff as message, wait for Y/n/e
  - `confirmCommand()` → send command, wait for Y/n
- Map IDE responses to `UserConfirmation`
- [ ] Confirmations are shown in IDE
- [ ] User responses are received correctly
- [ ] Supports 3 options: yes, no, edit

### 3.1.5 — Implement event streaming to IDE
- Create `packages/acp/src/event-streamer.ts`
- Subscribe to `OrchestratorEvent`s
- Convert each event to ACP message:
  - `indexing_start` → progress message
  - `plan_ready` → message with formatted plan
  - `agent_start` → status message ("Architect working...")
  - `agent_progress` → incremental messages
  - `confirm_file` → confirmation request with diff
  - `session_complete` → final message with summary
- [ ] IDE receives real-time updates
- [ ] Diffs are displayed formatted
- [ ] Progress messages appear during execution

### 3.1.6 — Implement ACP agent registration
- Register agent with name "Dev Team" (or configurable)
- Describe agent capabilities to IDE
- Register available commands (`/architect`, `/coder`, `/tester`, `/reviewer`, `/plan`)
- [ ] IDE detects agent on connection
- [ ] Commands appear as options in IDE

### 3.1.7 — Tests for ACP transport
- Unit tests for `AcpToolProvider` with mocked ACP connection
- Unit tests for `AcpConfirmationHandler`
- Event streaming tests
- Integration test: simulate ACP connection and verify full flow
- [ ] Unit tests pass
- [ ] Integration test simulates full flow

---

## Task 3.2 — MCP Transport (`packages/mcp/`) `[XL]`

### 3.2.1 — Design MCP tools to expose
- Define tools that MCP server exposes to host (Claude Code, Cursor, etc.):
  - `orchestrate` — execute full flow with prompt
  - `architect` — Architect only
  - `coder` — Coder only
  - `tester` — Tester only (optionally with target file)
  - `reviewer` — Reviewer only
  - `plan` — generate plan only, no execution
  - `status` — view project status (language, last prompt, etc.)
- Define tool parameters (inputSchema)
- [ ] MCP tools are designed and documented
- [ ] inputSchemas are clear for host LLM to use correctly

### 3.2.2 — Implement main MCP server
- Create `packages/mcp/src/index.ts`
- Use `@modelcontextprotocol/sdk` to create server
- Transport: stdio
- Instantiate `Orchestrator` from core with dependencies
- Register all tools defined in 3.2.1
- Handle clean shutdown
- [ ] Server starts with `./node_modules/.bin/devagents-mcp`
- [ ] Responds to MCP protocol handshake
- [ ] Tools appear when listed from MCP host

### 3.2.3 — Implement handlers for each MCP tool
- Create `packages/mcp/src/handlers/` with handler per tool:
  - `orchestrate-handler.ts` — receive prompt, execute full flow, return result
  - `architect-handler.ts` — receive prompt, execute Architect only
  - `coder-handler.ts` — receive prompt, execute Coder only
  - `tester-handler.ts` — receive prompt and optional target, execute Tester
  - `reviewer-handler.ts` — execute Reviewer on recent files
  - `plan-handler.ts` — generate plan without executing
  - `status-handler.ts` — return indexed project info
- Each handler:
  1. Parse tool call arguments
  2. Call Orchestrator with appropriate config
  3. Format result as MCP content
- [ ] Each handler processes call and returns formatted result
- [ ] Errors return as `isError: true` with descriptive message

### 3.2.4 — Implement `McpToolProvider`
- Create `packages/mcp/src/tool-provider.ts`
- Implement `ToolProvider` for MCP context:
  - In MCP, server cannot ask host to write files directly
  - Option A: server reads/writes files directly via Node.js `fs`
  - Option B: expose operations as part of result for host to execute
  - Decide based on host capabilities (Claude Code can execute commands)
- For reading: use `fs.readFile` directly (project is local)
- For writing: include write instructions in MCP result
- For terminal: include command to execute in result
- [ ] Read operations work
- [ ] Writes are communicated clearly to host
- [ ] Terminal commands are proposed to host

### 3.2.5 — Implement `McpConfirmationHandler`
- Create `packages/mcp/src/confirmation-handler.ts`
- In MCP context, confirmations are different:
  - Host LLM (Claude Code, Cursor) has its own confirmation system
  - MCP server returns proposed actions as text/data
  - Host decides whether to ask user for confirmation
- Implement confirmations as part of result:
  - Include diffs in result for host to display
  - Include proposed commands for host to confirm
- [ ] Diffs are included in MCP result
- [ ] Commands are proposed in result
- [ ] Host can decide how to confirm with user

### 3.2.6 — Implement MCP result formatting
- Create `packages/mcp/src/result-formatter.ts`
- Convert `AgentResult` and `OrchestratorEvent` to MCP content:
  - Markdown text for explanations and plans
  - Code blocks for diffs
  - Lists for Reviewer observations
  - Final summary with modified files and actions taken
- [ ] Results are readable as markdown text
- [ ] Diffs appear as code blocks
- [ ] Final summary is clear and actionable

### 3.2.7 — Implement MCP Resources (optional but useful)
- Expose MCP resources to give context to host:
  - `project://index` — indexed project information
  - `project://sessions` — recent session history
  - `project://config` — current team configuration
- [ ] Resources list correctly
- [ ] Host can read project indexed info

### 3.2.8 — Tests for MCP transport
- Unit tests for each handler
- Test server with mock MCP client
- Result formatting tests
- Integration test: simulate complete tool call
- [ ] Each handler has unit tests
- [ ] Integration test simulates full flow
- [ ] MCP results are valid per protocol

---

## Task 3.3 — Cross-transport integration tests `[M]`

### 3.3.1 — Test ACP + Core end-to-end
- Simulate IDE sending prompt via ACP
- Verify full flow executes:
  1. Prompt → ACP → Orchestrator → Agents → Result → ACP → IDE
- Verify session is saved to SQLite
- [ ] Full ACP flow works end-to-end
- [ ] Session persists

### 3.3.2 — Test MCP + Core end-to-end
- Simulate MCP host sending `orchestrate` tool call
- Verify full flow executes
- Verify MCP result is valid and readable
- [ ] Full MCP flow works end-to-end
- [ ] Result is valid per MCP protocol

### 3.3.3 — Test ACP ↔ MCP parity
- Same prompt sent via both transports
- Verify core produces equivalent results
- Differences should be format only (ACP streaming vs MCP result)
- [ ] Both transports produce equivalent results for same prompt
- [ ] Differences are delivery format only

---

## Phase 3 Summary

| Task | Complexity | Subtasks |
|------|:----------:|:--------:|
| 3.1 ACP Transport | XL | 7 |
| 3.2 MCP Transport | XL | 8 |
| 3.3 Integration tests | M | 3 |
| **Total** | | **18 subtasks** |
