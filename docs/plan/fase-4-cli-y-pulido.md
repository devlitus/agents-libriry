# Phase 4 — CLI, IDE Integration, and Polish

**Objective:** Implement the setup/check CLI, configure integrations with each IDE, and polish the complete user experience.

**Dependencies:** Phase 3 completed (ACP and MCP transports functional)

---

## Task 4.1 — CLI: `devagents setup` command (`packages/cli/`) `[L]`

### 4.1.1 — Implement interactive wizard with @clack/prompts
- Create `packages/cli/src/setup.ts`
- Implement wizard flow per spec (section 10):
  1. Ask environment: Development (Ollama) or Production (API key)
  2. If Development:
     - Ask Ollama URL (default: `http://localhost:11434`)
     - Ask model (default: `llama3.1`)
  3. If Production:
     - Ask provider: Anthropic or OpenAI
     - Request API key (password input)
  4. Ask: Enable Tester automatically? (default: Yes)
  5. Ask: Enable Reviewer automatically? (default: Yes)
- Use `@clack/prompts` for nice terminal UI (`intro`, `outro`, `select`, `text`, `confirm`)
- [ ] Wizard runs with `npx devagents setup`
- [ ] Asks questions in correct order
- [ ] Defaults are reasonable and accept Enter

### 4.1.2 — Generate `.env` file
- Create `.env` in user project directory
- Content per wizard answers:
  - Development: `NODE_ENV=development`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
  - Production Anthropic: `ANTHROPIC_API_KEY`
  - Production OpenAI: `OPENAI_API_KEY`
- If `.env` exists: ask to overwrite or merge
- [ ] `.env` created with correct variables
- [ ] Doesn't overwrite without asking if exists

### 4.1.3 — Generate `agents.config.ts` file
- Create `agents.config.ts` in user project root
- Content based on answers:
  - `llm.provider` per chosen provider
  - `team.autoTest` and `team.autoReview` per answers
  - Rest with defaults
- Include correct `import type`
- If exists: ask to overwrite
- [ ] `agents.config.ts` created with correct structure
- [ ] File is valid importable TypeScript
- [ ] Doesn't overwrite without asking

### 4.1.4 — Create `.devagents/` directory and configure `.gitignore`
- Create `.devagents/` if doesn't exist
- Add to project `.gitignore` (create if doesn't exist):
  - `.env`
  - `.devagents/`
- Don't duplicate entries if already in `.gitignore`
- [ ] `.devagents/` is created
- [ ] `.env` and `.devagents/` are in `.gitignore`
- [ ] No duplicate entries

### 4.1.5 — Show final setup summary
- At end, show:
  ```
  ✓  .env created
  ✓  agents.config.ts created
  ✓  .env added to .gitignore
  ✓  .devagents/ added to .gitignore
  ```
- If something failed: show as `✗` with error
- Suggest next step: `npx devagents check`
- [ ] Summary shows correct status for each action
- [ ] Suggests running `devagents check`

### 4.1.6 — Tests for setup command
- Test full flow with mocked answers (simulated stdin)
- Test files are created correctly
- Test `.gitignore` is modified correctly
- Test doesn't overwrite existing files without confirmation
- [ ] Tests cover full flow
- [ ] Tests verify file creation

---

## Task 4.2 — CLI: `devagents check` command `[M]`

### 4.2.1 — Implement checks
- Create `packages/cli/src/check.ts`
- Checks to perform (spec section 10):
  1. **LLM**: connect to configured provider and measure latency
     - Ollama: `GET http://localhost:11434/api/tags` (verify responds)
     - Anthropic: minimal API call (or just verify key format)
     - OpenAI: minimal API call (or verify key format)
  2. **ACP binary**: verify `devagents-acp` exists in `node_modules/.bin/`
  3. **MCP binary**: verify `devagents-mcp` exists in `node_modules/.bin/`
  4. **SQLite**: verify `.devagents/memory.db` is accessible (create if doesn't exist)
  5. **agents.config.ts**: verify exists and is parseable
- [ ] Each check shows ✓ or ✗ with details
- [ ] If any fails, show instructions to fix

### 4.2.2 — Implement formatted output
- Use `@clack/prompts` to show result:
  ```
  ◆  @devagents check
  ◇  LLM (Ollama llama3.1)    ✓  responds in 340ms
  ◇  ACP binary               ✓  devagents-acp found
  ◇  MCP binary               ✓  devagents-mcp found
  ◇  SQLite                   ✓  .devagents/memory.db accessible
  ◇  agents.config.ts         ✓  valid
  ◆  All set
  ```
- If errors: exit code 1
- If all OK: exit code 0
- [ ] Output is readable and formatted
- [ ] Exit code reflects result

### 4.2.3 — Tests for check command
- Test with everything configured correctly (all ✓)
- Test with LLM unavailable (✗ on LLM, rest ✓)
- Test without `agents.config.ts` (✗ on config)
- Test without binaries installed
- [ ] Tests cover all success and failure scenarios

---

## Task 4.3 — CLI: entry point and command routing `[S]`

### 4.3.1 — Implement main entry point
- Update `packages/cli/src/index.ts`
- Parse `process.argv` to detect subcommand:
  - `devagents setup` → run setup
  - `devagents check` → run checks
  - `devagents --help` → show help
  - `devagents --version` → show version
  - No argument → show help
- [ ] `npx devagents setup` executes wizard
- [ ] `npx devagents check` executes checks
- [ ] `npx devagents --help` shows available options
- [ ] `npx devagents --version` shows package version

---

## Task 4.4 — IDE Configuration `[M]`

### 4.4.1 — Document and test Zed integration
- Verify `.zed/settings.json` config (spec section 11) works:
  ```json
  {
    "agent": {
      "agents": [{
        "name": "Dev Team",
        "command": "./node_modules/.bin/devagents-acp"
      }]
    }
  }
  ```
- Optionally create CLI task to generate config: `npx devagents init-ide zed`
- [ ] Agent appears in Zed when configured
- [ ] Process starts correctly from Zed

### 4.4.2 — Document and test JetBrains integration
- Verify config: AI Assistant → Settings → External Agents → Add
- Optionally generate clear instructions with `npx devagents init-ide jetbrains`
- [ ] Agent works in JetBrains with manual configuration
- [ ] Instructions are clear

### 4.4.3 — Document and test VS Code (ACP) integration
- Verify ACP extension works with `.vscode/settings.json` config
- Optionally: `npx devagents init-ide vscode-acp` generates config
- [ ] Agent appears in VS Code with ACP extension
- [ ] Communication works correctly

### 4.4.4 — Document and test VS Code (MCP/Copilot) integration
- Verify `.vscode/mcp.json` config (spec section 11)
- Optionally: `npx devagents init-ide vscode-mcp` generates config
- [ ] MCP tools appear in VS Code Copilot
- [ ] Flow works with Copilot as host

### 4.4.5 — Document and test Claude Code integration
- Verify `.claude/settings.json` config (spec section 11)
- Optionally: `npx devagents init-ide claude-code` generates config
- [ ] MCP tools are detected by Claude Code
- [ ] Full flow works from Claude Code

---

## Task 4.5 — Error Handling and Edge Cases `[M]`

### 4.5.1 — LLM errors
- If LLM doesn't respond: retry with exponential backoff (max 3 attempts)
- If API key invalid: clear error with instructions
- If Ollama not running: error with "Start Ollama with `ollama serve`"
- If model doesn't exist in Ollama: error with "Download model with `ollama pull <model>`"
- If rate limit exceeded: wait and retry
- [ ] LLM errors are handled with retries
- [ ] Error messages are actionable

### 4.5.2 — Filesystem errors
- If no write permissions: clear error
- If file to read doesn't exist: error without crash
- If SQLite can't write: error with permission suggestion
- [ ] No filesystem error causes process crash
- [ ] Messages suggest how to fix

### 4.5.3 — LLM response parsing errors
- If LLM returns invalid JSON: retry with correction prompt
- If LLM returns empty response: retry
- Max 2 parse retries before failing
- [ ] Parse errors handled with retries
- [ ] After 2 retries, fails with descriptive message

### 4.5.4 — Timeout and cancellation
- Configurable timeout per LLM operation (default: 60s)
- If user cancels (Ctrl+C): clean process shutdown
- Save partial session state if cancelled mid-flow
- [ ] Process closes cleanly with Ctrl+C
- [ ] LLM timeout works

---

## Task 4.6 — Logging and Observability `[S]`

### 4.6.1 — Implement structured logging
- Create `packages/core/src/logger.ts`
- Levels: `debug`, `info`, `warn`, `error`
- Level configurable via `LOG_LEVEL` env var (default: `info`)
- Output to stderr (don't contaminate stdout used by ACP/MCP)
- Format: `[timestamp] [level] [module] message`
- In development: colored. In production: JSON lines
- [ ] Logs go to stderr, not stdout
- [ ] Level is configurable
- [ ] Each module has context in logs

### 4.6.2 — Add logging to critical components
- Orchestrator: log each flow step
- Agents: log start, LLM call, result
- Memory: log SQLite operations
- Transports: log incoming/outgoing messages
- [ ] Full flow is traceable by logs
- [ ] Errors are logged with sufficient context

---

## Task 4.7 — Minimal Documentation `[M]`

### 4.7.1 — Monorepo README.md
- Project description
- Quick start (install + setup + check)
- IDE config summary (with links)
- Available commands (`/architect`, `/coder`, `/tester`, `/reviewer`, `/plan`)
- Tech stack
- [ ] README lets someone start from zero

### 4.7.2 — README.md for each package
- `@devagents/core`: what it contains, not installed directly
- `@devagents/acp`: how to configure in Zed/JetBrains/VS Code
- `@devagents/mcp`: how to configure in Claude Code/Cursor/Copilot
- `@devagents/cli`: available commands and options
- [ ] Each package has npm README

### 4.7.3 — Initial CHANGELOG.md file
- Generate with changesets: `pnpm changeset version`
- Version 0.1.0 for all packages
- [ ] Each package has CHANGELOG

---

## Task 4.8 — Prepare npm publication `[M]`

### 4.8.1 — Verify package.json fields for publication
- Each package must have:
  - `name` with `@devagents/` scope
  - `version`: `0.1.0`
  - `description`
  - `keywords`
  - `license`: `MIT`
  - `repository`
  - `main`, `module`, `types`, `exports`
  - `files`: include only `dist/` and necessary files
- [ ] All fields present in all 4 packages
- [ ] `files` doesn't include source or tests

### 4.8.2 — Verify binaries work post-install
- Simulate `npm install` in clean project
- Verify `devagents-acp`, `devagents-mcp`, `devagents` are executable
- Verify shebangs are correct
- Verify execute permissions
- [ ] All 3 binaries executable after `npm install`
- [ ] Shebangs point to `#!/usr/bin/env node`

### 4.8.3 — Dry run of publication
- `pnpm -r publish --dry-run`
- Verify unnecessary files not included
- Verify each package size
- [ ] Dry run passes without errors
- [ ] Each package size reasonable (< 1MB each)

---

## Task 4.9 — Final Acceptance Tests `[L]`

### 4.9.1 — Test: setup + check on TypeScript project
- Create minimal TypeScript project (Express)
- Run `npx devagents setup` with dev options
- Run `npx devagents check`
- Verify all passes
- [ ] Setup and check work on real TypeScript project

### 4.9.2 — Test: full ACP flow with free prompt
- Send prompt "create POST /users endpoint with email validation"
- Verify: Architect generates plan → Coder generates code → Tester generates tests → Reviewer reviews
- Verify confirmations are requested
- [ ] Full flow works end-to-end via ACP

### 4.9.3 — Test: full MCP flow with free prompt
- Same prompt via MCP
- Verify result is equivalent to ACP
- [ ] Full flow works via MCP
- [ ] Result is equivalent

### 4.9.4 — Test: explicit commands
- `/coder "implement UserRepository class"` → Coder only
- `/tester "src/services/auth.ts"` → Tester only
- `/reviewer` → Reviewer only
- `/plan "caching system"` → plan only
- [ ] Each command activates only corresponding agent
- [ ] `/plan` doesn't write files

### 4.9.5 — Test: language detection in Python
- Create minimal Python project (FastAPI)
- Run full flow
- Verify detects Python, FastAPI, pytest
- [ ] Python project indexed correctly
- [ ] Generated tests use pytest

### 4.9.6 — Test: sessions and memory
- Execute one prompt
- Verify session saved to SQLite
- Execute second prompt
- Verify second session uses cached index
- Verify old sessions deleted per config
- [ ] Memory persists between sessions
- [ ] Cache index is reused

### 4.9.7 — Test: Reviewer detects security issues
- Generate code with hardcoded credential
- Run Reviewer
- Verify detects issue
- [ ] Reviewer detects hardcoded credentials
- [ ] Observation includes fix suggestion

---

## Phase 4 Summary

| Task | Complexity | Subtasks |
|------|:----------:|:--------:|
| 4.1 CLI setup | L | 6 |
| 4.2 CLI check | M | 3 |
| 4.3 CLI entry point | S | 1 |
| 4.4 IDE configs | M | 5 |
| 4.5 Errors and edge cases | M | 4 |
| 4.6 Logging | S | 2 |
| 4.7 Documentation | M | 3 |
| 4.8 npm publication | M | 3 |
| 4.9 Acceptance tests | L | 7 |
| **Total** | | **34 subtasks** |
