---
name: style-guide
description: Full @devagents coding style rules — covers SOLID principles, design patterns, Clean Code, and TypeScript conventions. Load this before writing or reviewing any TypeScript file.
---

## SOLID principles

These are **non-negotiable** guidelines. Every module must respect them.

### S — Single Responsibility (SRP)
- Each class, module, and function has **one reason to change**.
- If you need "and" to describe what it does, split it.
- One primary export per file. The filename describes that single responsibility.

### O — Open/Closed (OCP)
- Open for extension, closed for modification.
- Adding a new LLM provider, agent type, or tool must not require editing existing classes.
- Prefer: strategy maps (`Map<string, Handler>`), discriminated unions with exhaustive switch, or dependency injection over `if/else` chains.

### L — Liskov Substitution (LSP)
- Every implementation of an interface must honour the full contract.
- No empty method stubs. No extra exceptions not declared in the base type.
- If a subtype cannot fulfil the contract, the abstraction is wrong — fix the interface.

### I — Interface Segregation (ISP)
- Interfaces must be small, cohesive, and role-specific.
- If a consumer uses only 2 of 6 methods, the interface is too wide — split it.
- Prefer `Readable`, `Writable`, `Closable` over a single `Stream` with all three.

### D — Dependency Inversion (DIP)
- High-level modules depend on abstractions, not concrete implementations.
- Dependencies are received as constructor/factory parameters — never instantiated internally with `new ConcreteService()`.
- This enables testing with stubs and swapping implementations (e.g. LLM providers).

---

## Design patterns — when to apply

Use a pattern **only when the problem demands it**. Never force a pattern for its own sake.

| Pattern | Apply when… | This project example |
|---------|-------------|---------------------|
| **Factory Method** | Object creation varies by type at runtime | `createLlmClient(provider)` returns Anthropic/OpenAI/Ollama |
| **Strategy** | Multiple interchangeable algorithms behind one interface | LLM providers, tool routers |
| **Adapter** | External API shape doesn't match internal interface | Wrapping `better-sqlite3` behind `MemoryStore` |
| **Facade** | Subsystem has too many entry points for the consumer | `Orchestrator` as a simplified front for the agent pipeline |
| **Template Method** | Fixed algorithm with variable steps | `BaseAgent.run()` with overridable `buildPrompt()` / `parseOutput()` |
| **Chain of Responsibility** | Pipeline of handlers, each decides to process or delegate | Tool routing, middleware |
| **Builder** | Constructor with 4+ optional params or step-by-step construction | Complex config or prompt assembly |
| **Observer** | 1-to-N notification of state changes | Event streaming (ACP/MCP transports) |
| **Decorator** | Cross-cutting behaviour (logging, caching, retry) without modifying the original | Wrapping `LlmClient` with retry logic |

**TypeScript-idiomatic alternatives:**
- **Discriminated union + exhaustive switch** instead of class hierarchies for finite states.
- **Module-level const** instead of Singleton class (Node module system guarantees single instance).
- **Options object** instead of Builder when there's no step-by-step construction.

---

## Naming

- Variables/functions: intent-revealing. `readyAgents`, not `arr`. `parseUserPrompt`, not `process`.
- Functions: verb+noun describing *what*, not *how*. `dispatchToAgent`, `buildArchitectPlan`.
- Booleans: `is`, `has`, `can`, `should` prefix always. `isIndexed`, `hasMemory`, `canWrite`.
- Types/interfaces: PascalCase, no `I` prefix. `Agent`, not `IAgent`.
- Constants: `SCREAMING_SNAKE_CASE` for module-level values. `MAX_RETRIES`, `DEFAULT_TIMEOUT_MS`.
- Files: `kebab-case`. One primary export per file, name matches filename.
- No ambiguous abbreviations: `ctx` is fine, `usrMgr` is not.

## Functions

- Single responsibility (SRP at function level). One thing, well.
- Max ~30 lines. Extract named helpers when growing.
- Max 3 positional parameters. Use an options object for 4+.
- Early return: guard conditions at top, happy path at bottom.
- No hidden side effects — the name must reflect everything the function does.
- No boolean flag parameters (`render(true)`) — split into two named functions.

## TypeScript

- `strict: true` always. Never suppress strict checks.
- Explicit return types on every exported function/method.
- `interface` for extensible shapes. `type` for unions and aliases.
- Never `any`. Use `unknown` + type guard when type is genuinely unknown.
- Discriminated unions for state:
  `{ status: 'success'; output: string } | { status: 'error'; error: Error; retryable: boolean }`
- `Result<T, E>` pattern for expected, recoverable errors — not exceptions.
- `@ts-ignore` only with a documented reason in a comment on the same line.

## Async and errors

- Always `await` or `return` a Promise. No fire-and-forget.
- Typed error classes only — extend `Error`, set `this.name`, typed constructor args with `readonly`.
- Catch only to add context or transform. Let errors propagate otherwise.
- Never empty `catch` blocks or catch-and-`console.log`-only.
- `Result<T, E>` for expected domain errors; exceptions for programming bugs.

## Modules

- One primary export per file. Barrel `index.ts` re-exports only — no logic.
- Import order: `node:*` → external packages → `@devagents/*` → `./relative.js`
- Relative imports always use `.js` extension (NodeNext resolution).
- No circular deps: `core` must not import from `acp`, `mcp`, or `cli`.
- No default exports — always named exports.

## Comments

- Comment *why*, not *what*. Code shows what; comments explain non-obvious decisions.
- No commented-out code. Delete dead code — git keeps history.
- JSDoc on every exported symbol. Skip for internal helpers.
- TODOs must reference a ticket or issue number.

## DRY and abstraction

- If the same 3+ line block appears in 2+ places, extract a named helper.
- **Rule of Three**: only abstract when there are 3+ repetitions. Slight duplication beats premature abstraction.
- No magic values inline — extract to named constants (`SCREAMING_SNAKE_CASE`) at module level.

## Testing conventions

- Test files live alongside source: `foo.ts` → `foo.test.ts`.
- Test names describe behaviour, not implementation: `"returns error when provider is unreachable"`.
- Unit tests never call real LLMs or databases — use stubs/mocks.
- Integration tests use `.integration.test.ts` suffix.
- No `it.skip` or `xit` without a comment explaining why.
- Assert on **observable behaviour**, not internal call order.

## Cross-references

For deeper coverage, load these companion skills:
- `typescript-patterns` — code examples for typed errors, discriminated unions, type guards, options objects.
- `code-smells` — design-level smells (God Object, Primitive Obsession, Data Clump, Feature Envy, etc.).
