---
name: style-guide
description: Full @devagents coding style rules. Load this before writing or reviewing any TypeScript file.
---

## Naming

- Variables/functions: intent-revealing. `readyAgents`, not `arr`. `parseUserPrompt`, not `process`.
- Functions: verb+noun describing *what*, not *how*. `dispatchToAgent`, `buildArchitectPlan`.
- Booleans: `is`, `has`, `can`, `should` prefix always. `isIndexed`, `hasMemory`, `canWrite`.
- Types/interfaces: PascalCase, no `I` prefix. `Agent`, not `IAgent`.
- Files: `kebab-case`. One primary export per file, name matches filename.

## Functions

- Single responsibility. If you need "and" to describe it, split it.
- Max ~30 lines. Extract named helpers when growing.
- Max 3 positional parameters. Use an options object for more.
- Early return: guard conditions at top, happy path at bottom.

## TypeScript

- `strict: true` always. Never suppress strict checks.
- Explicit return types on every exported function/method.
- `interface` for extensible shapes. `type` for unions and aliases.
- Never `any`. Use `unknown` + type guard when type is genuinely unknown.
- Discriminated unions for state:
  `{ status: 'success'; output: string } | { status: 'error'; error: Error; retryable: boolean }`

## Async and errors

- Always `await` or `return` a Promise. No fire-and-forget.
- Typed error classes only — extend `Error`, set `this.name`, typed constructor args.
- Catch only to add context or transform. Let errors propagate otherwise.

## Modules

- One primary export per file. Barrel `index.ts` re-exports only — no logic.
- Import order: `node:*` → external packages → `@devagents/*` → `./relative.js`
- Relative imports always use `.js` extension (NodeNext resolution).
- No circular deps: `core` must not import from `acp`, `mcp`, or `cli`.

## Comments

- Comment *why*, not *what*. Code shows what; comments explain non-obvious decisions.
- No commented-out code. Delete dead code.
- JSDoc on every exported symbol. Skip for internal helpers.
