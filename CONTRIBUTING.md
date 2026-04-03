# Contributing to @devagents

Thank you for your interest in contributing. This document explains how the project is structured, how to run it locally, and how to submit changes.

---

## Project structure

`@devagents` is a pnpm monorepo with four packages:

```
devagents/
├── packages/
│   ├── core/      ← @devagents/core — all logic (agents, orchestrator, memory, LLM, indexer)
│   ├── acp/       ← @devagents/acp  — ACP transport layer
│   ├── mcp/       ← @devagents/mcp  — MCP transport layer
│   └── cli/       ← @devagents/cli  — setup and check commands
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

All business logic lives in `core`. The `acp` and `mcp` packages are thin transport wrappers — they receive messages from the IDE and delegate to the orchestrator in `core`. The `cli` package handles the setup wizard and health checks.

---

## Local development setup

### Prerequisites

- Node.js ≥ 20
- pnpm 9.x (`npm install -g pnpm` or see [pnpm installation docs](https://pnpm.io/installation))
- [Ollama](https://ollama.com) (recommended for local testing)

### Install and build

```bash
# Clone the repository
git clone https://github.com/your-org/devagents
cd devagents

# Install all dependencies across all packages
pnpm install

# Build all packages
pnpm build

# Watch mode (rebuilds on change)
pnpm dev
```

### Run tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @devagents/core test

# Watch mode
pnpm --filter @devagents/core test --watch
```

### Test against a real IDE

After building, link the packages locally and point your IDE at the local binaries:

```bash
# In the devagents repo root
pnpm link --global

# In your test project
pnpm link --global @devagents/acp @devagents/mcp @devagents/cli
```

Then configure your IDE to use `./node_modules/.bin/devagents-acp` as usual.

---

## Key concepts before contributing

### How agents communicate

All agents run inside the same Node.js process. They communicate via direct TypeScript function calls — not via ACP or MCP. Those protocols are only used between the IDE and the agent process.

```
IDE  ──ACP/MCP──►  Orchestrator  ──TypeScript──►  Architect
                                 ──TypeScript──►  Coder
                                 ──TypeScript──►  Tester
                                 ──TypeScript──►  Reviewer
```

### How the memory layer works

SQLite is accessed through `packages/core/src/memory/MemoryService.ts`. All database access goes through this service — agents never query SQLite directly. The service exposes typed methods:

```typescript
memoryService.getProjectIndex(): ProjectIndex | null
memoryService.saveProjectIndex(index: ProjectIndex): void
memoryService.setAgentMemory(sessionId, agent, key, value): void
memoryService.getAgentMemory(sessionId, agent, key): unknown
memoryService.saveSession(session: Session): void
memoryService.getRecentSessions(limit: number): Session[]
```

### How tools work

Agents never access the filesystem directly. They call tools via `packages/core/src/tools/`. Each tool is a typed wrapper that delegates to the appropriate ACP or MCP call depending on which transport is active.

This means the core is transport-agnostic — the same `Coder` class works regardless of whether the IDE is using ACP or MCP.

---

## Making changes

### Adding a new agent

1. Create `packages/core/src/agents/my-agent.ts` extending `BaseAgent`
2. Implement `execute(context: AgentContext): Promise<AgentResult>`
3. Register the agent in `packages/core/src/orchestrator/registry.ts`
4. Add the slash command to `packages/core/src/orchestrator/commands.ts`
5. Add tests in `packages/core/src/agents/my-agent.test.ts`

### Adding a new LLM provider

1. Implement `LlmClient` interface in `packages/core/src/llm/providers/`
2. Add detection logic in `packages/core/src/llm/factory.ts`
3. Add the provider's SDK to `packages/core/package.json`
4. Document the required env variable in `README.md`

### Adding a new language to the indexer

The indexer in `packages/core/src/indexer/` uses a list of detection rules. Add a new entry to `packages/core/src/indexer/languages.ts`:

```typescript
{
  language: "ruby",
  detectionFiles: ["Gemfile", "Rakefile"],
  testFrameworks: [
    { name: "rspec", indicator: "spec/" },
    { name: "minitest", indicator: "test/" },
  ]
}
```

No other changes needed — the orchestrator picks up new languages automatically.

---

## Versioning and releasing

This project uses [Changesets](https://github.com/changesets/changesets) for versioning. Each package versions independently.

### When you make a change

```bash
# Create a changeset describing your change
pnpm changeset

# Follow the prompts: select affected packages, bump type (patch/minor/major), describe the change
```

Commit the generated `.changeset/*.md` file along with your code changes.

### Cutting a release (maintainers only)

```bash
# Apply all pending changesets to package.json files
pnpm changeset version

# Review the changelog, then publish
pnpm publish -r
```

---

## Code style

- TypeScript strict mode (`"strict": true` in `tsconfig.base.json`)
- ESLint + Prettier (run `pnpm lint` before committing)
- No `any` types — use `unknown` and narrow
- All public interfaces and classes must have JSDoc comments
- Tests live alongside source files (`*.test.ts`)

---

## Pull request guidelines

- Keep PRs focused — one concern per PR
- Add tests for every new behavior
- Update `ARCHITECTURE.md` if you change a core design decision
- Run `pnpm build && pnpm test && pnpm lint` before opening a PR
- Add a changeset (`pnpm changeset`) unless the change is docs-only

---

## Reporting bugs

Open an issue with:
- The IDE and version you're using
- The `devagents check` output
- The prompt that caused the issue
- Whether it happens with Ollama, Anthropic, or OpenAI

---

## Questions

Open a GitHub Discussion if you have questions about the architecture, want to propose a new agent, or want to discuss a feature before implementing it.
