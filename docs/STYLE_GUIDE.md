# Style Guide — @devagents

Based on Clean Code principles, adapted to our TypeScript monorepo.

---

## 1. Naming

### Variables and functions

Use names that reveal intent. The name should answer: *what is it* and *why does it exist*.

```ts
// Bad
const d = await db.query(q);
const arr = agents.filter(a => a.s === 'ok');

// Good
const queryResult = await db.query(sql);
const readyAgents = agents.filter(agent => agent.status === 'ready');
```

**Functions:** verb + noun. Describe what they do, not how.

```ts
// Bad
function process(input: string) { ... }
function doStuff(agent: Agent) { ... }

// Good
function parseUserPrompt(raw: string): ParsedPrompt { ... }
function dispatchToAgent(agent: Agent, task: Task): Promise<AgentResult> { ... }
```

**Booleans:** prefix with `is`, `has`, `can`, `should`.

```ts
const isIndexed = repo.indexedAt !== null;
const hasMemory = context.entries.length > 0;
const canWrite = userConfirmed && !dryRun;
```

### Types and interfaces

PascalCase. Interfaces without `I` prefix — the type system makes intent clear enough.

```ts
// Bad
interface IAgent { ... }
type agent_result = { ... }

// Good
interface Agent { ... }
type AgentResult = { ... }
```

### Files and directories

`kebab-case` for files. One primary export per file, named to match the file.

```
agents/architect-agent.ts   → exports ArchitectAgent
memory/sqlite-store.ts      → exports SqliteStore
llm/anthropic-provider.ts   → exports AnthropicProvider
```

---

## 2. Functions

### Single responsibility

A function does one thing. If you need "and" to describe it, split it.

```ts
// Bad: does three things
async function runAgent(prompt: string) {
  const indexed = await indexRepo();
  const plan = await architect.plan(prompt, indexed);
  await coder.implement(plan);
}

// Good: each step is its own function
async function runPipeline(prompt: string) {
  const index = await indexRepository();
  const plan = await buildArchitectPlan(prompt, index);
  await implementPlan(plan);
}
```

### Size

Functions should fit on a screen (~20-30 lines max). If it's growing, extract named helpers — the name becomes free documentation.

### Arguments

Maximum 3 parameters. More than that → use an options object.

```ts
// Bad
function createAgent(name: string, model: string, temp: number, maxTokens: number, memory: Memory) { ... }

// Good
interface AgentOptions {
  name: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  memory: Memory;
}
function createAgent(options: AgentOptions): Agent { ... }
```

### Early return

Avoid deep nesting. Validate preconditions first and return early.

```ts
// Bad
async function processTask(task: Task | null) {
  if (task) {
    if (task.status === 'pending') {
      if (task.assignee) {
        await dispatch(task);
      }
    }
  }
}

// Good
async function processTask(task: Task | null) {
  if (!task) return;
  if (task.status !== 'pending') return;
  if (!task.assignee) return;

  await dispatch(task);
}
```

---

## 3. TypeScript

### Strict mode always

All packages extend `tsconfig.base.json` with `strict: true`. Never disable strict checks per file.

### Explicit return types on public API

Functions exported from a module must have explicit return types. Internal helpers may rely on inference.

```ts
// Public API — explicit return type required
export async function indexRepository(root: string): Promise<RepositoryIndex> { ... }

// Internal helper — inference is fine
function buildFileList(entries: Dirent[]) {
  return entries.filter(e => e.isFile()).map(e => e.name);
}
```

### Prefer `type` over `interface` for unions and intersections

```ts
// Unions → type
type LLMProvider = 'anthropic' | 'openai' | 'ollama';
type AgentStatus = 'idle' | 'running' | 'done' | 'error';

// Shapes → interface (supports extension and declaration merging)
interface Agent {
  id: string;
  name: string;
  run(task: Task): Promise<AgentResult>;
}
```

### Avoid `any`. Use `unknown` when the type is genuinely unknown.

```ts
// Bad
function parseResponse(raw: any): AgentResult { ... }

// Good
function parseResponse(raw: unknown): AgentResult {
  if (!isAgentResult(raw)) throw new TypeError('Invalid agent response shape');
  return raw;
}
```

### Use discriminated unions for states

```ts
type AgentResult =
  | { status: 'success'; output: string; tokensUsed: number }
  | { status: 'error'; error: Error; retryable: boolean };

// Exhaustive check — TS will warn if a case is missing
function handleResult(result: AgentResult) {
  switch (result.status) {
    case 'success': return result.output;
    case 'error': throw result.error;
  }
}
```

---

## 4. Async / Error handling

### Always `await` or return the Promise

Never fire-and-forget unless intentional and documented.

```ts
// Bad — error is silently swallowed
agent.run(task);

// Good
await agent.run(task);
```

### Typed errors

Avoid throwing raw strings. Use typed error classes for domain errors.

```ts
// Bad
throw 'LLM timeout';
throw new Error('unknown');

// Good
export class LLMTimeoutError extends Error {
  constructor(public readonly provider: string, public readonly ms: number) {
    super(`LLM provider "${provider}" timed out after ${ms}ms`);
    this.name = 'LLMTimeoutError';
  }
}
```

### Handle errors at the boundary

Catch errors where you can do something meaningful with them. Let them propagate otherwise.

```ts
// Bad — catching just to re-throw identically adds no value
async function callLLM(prompt: string) {
  try {
    return await provider.complete(prompt);
  } catch (err) {
    throw err; // pointless
  }
}

// Good — catch only to add context or transform
async function callLLM(prompt: string) {
  try {
    return await provider.complete(prompt);
  } catch (err) {
    throw new LLMCallError('Failed to complete prompt', { cause: err });
  }
}
```

---

## 5. Modules and structure

### One concept per file

Each file exports one primary thing (a class, a function family, a type set). Barrel files (`index.ts`) re-export only — no logic inside them.

```ts
// packages/core/src/agents/index.ts — only re-exports
export { ArchitectAgent } from './architect-agent.js';
export { CoderAgent } from './coder-agent.js';
export { TesterAgent } from './tester-agent.js';
export { ReviewerAgent } from './reviewer-agent.js';
```

### Import order

1. Node built-ins
2. External packages
3. Internal packages (`@devagents/*`)
4. Relative imports

```ts
import { readFile } from 'node:fs/promises';
import { Database } from 'better-sqlite3';
import { LLMProvider } from '@devagents/core';
import { buildPrompt } from './prompt-builder.js';
```

Always use `.js` extension in relative imports (NodeNext module resolution requirement).

### No circular dependencies

`acp`, `mcp`, `cli` → depend on `core`. `core` depends on nothing internal.

```
cli ──▶ core
acp ──▶ core
mcp ──▶ core
core ──▶ (external libs only)
```

If you find yourself wanting `core` to import from `acp` or `mcp`, that logic belongs in `core`.

---

## 6. Comments

### Comment the *why*, not the *what*

Code already says what it does. Comments explain decisions that aren't obvious from the code.

```ts
// Bad — describes what the code already shows
// Loop through agents and filter by status
const active = agents.filter(a => a.status === 'running');

// Good — explains a non-obvious decision
// We filter before dispatching because the orchestrator may receive stale agent
// references from the SQLite cache if the process restarted mid-session.
const active = agents.filter(a => a.status === 'running');
```

### No commented-out code

Delete dead code. Git history preserves it if needed.

### JSDoc only on public API

Add JSDoc to exported functions and types. Skip it for internal helpers.

```ts
/**
 * Indexes the user's repository and returns a structured snapshot
 * of file paths, symbols, and dependencies.
 *
 * Incremental: on subsequent calls, only changed files are re-indexed.
 */
export async function indexRepository(root: string): Promise<RepositoryIndex> { ... }
```

---

## 7. Tests

### Test behavior, not implementation

Tests describe what the system does from the outside, not how it does it internally.

```ts
// Bad — tests internal structure
it('calls buildPrompt before calling provider.complete', async () => { ... });

// Good — tests observable outcome
it('returns structured plan when given a valid feature prompt', async () => {
  const result = await architect.plan('add login with OAuth');
  expect(result.steps).toHaveLength(greaterThan(0));
  expect(result.estimatedComplexity).toBeDefined();
});
```

### Test file location and naming

Co-locate tests with the source:

```
agents/architect-agent.ts
agents/architect-agent.test.ts
```

### Naming: `it('should...')` or `it('verb...')`

```ts
it('throws LLMTimeoutError when provider exceeds timeout threshold')
it('returns empty index when repository has no source files')
it('resumes from last checkpoint when memory entry exists')
```

### No real LLM calls in unit tests

Use a `FakeLLMProvider` that returns deterministic responses. Integration tests (tagged `*.integration.test.ts`) may call real providers.

```ts
class FakeLLMProvider implements LLMProvider {
  constructor(private readonly response: string) {}
  async complete(_prompt: string): Promise<LLMResponse> {
    return { text: this.response, tokensUsed: 0 };
  }
}
```

---

## 8. Git conventions

### Commit messages

`<type>(<scope>): <imperative verb> <what>`

```
feat(core): add incremental indexer for changed files
fix(llm): handle Anthropic rate limit with exponential backoff
refactor(orchestrator): extract task queue into separate class
test(memory): add integration tests for SQLite store
chore(deps): update better-sqlite3 to 9.6.0
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

### Branch naming

`<type>/<short-description>`

```
feat/architect-agent
fix/llm-timeout-handling
refactor/memory-store
```

### PRs

- One concern per PR.
- Title follows the same format as commit messages.
- Always reference the phase task it closes (e.g., `Closes task 2.3`).

---

## 9. Quick reference

| Rule | Do | Don't |
|------|-----|-------|
| Names | `readyAgents`, `parseUserPrompt` | `arr`, `doStuff`, `process` |
| Functions | Single responsibility, ≤ 30 lines | Mix IO + logic in one function |
| Args | ≤ 3 or options object | 4+ positional params |
| Types | Explicit on public API, discriminated unions | `any`, raw `object` |
| Errors | Typed error classes, catch at boundary | Throw strings, catch-and-rethrow |
| Imports | `.js` extension, grouped by origin | Circular deps, mixed concerns |
| Comments | Why, not what. JSDoc on exports only | Commented-out code |
| Tests | Behavior-focused, fake providers | Implementation details, real LLM calls |
