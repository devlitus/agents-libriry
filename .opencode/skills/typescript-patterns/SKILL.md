---
name: typescript-patterns
description: TypeScript patterns for the @devagents monorepo: typed errors, discriminated unions, type guards, options objects. Load before implementing any TypeScript module.
---

## Typed error classes

```ts
export class LLMTimeoutError extends Error {
  constructor(
    public readonly provider: string,
    public readonly ms: number,
  ) {
    super(`LLM provider "${provider}" timed out after ${ms}ms`);
    this.name = 'LLMTimeoutError';
  }
}

export class RepositoryNotFoundError extends Error {
  constructor(public readonly root: string) {
    super(`Repository root not found: ${root}`);
    this.name = 'RepositoryNotFoundError';
  }
}
```

Rules: extend `Error`, set `this.name`, typed constructor args, `readonly` properties.

## Discriminated unions for state

```ts
type AgentResult =
  | { status: 'success'; output: string; tokensUsed: number }
  | { status: 'error'; error: Error; retryable: boolean };

// Exhaustive switch — TS warns if a case is missing
function handleResult(result: AgentResult): string {
  switch (result.status) {
    case 'success': return result.output;
    case 'error': throw result.error;
  }
}
```

Use `status` or `kind` as the discriminant. Never boolean flags for state.

## Type guards for `unknown`

```ts
function isAgentResult(value: unknown): value is AgentResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value.status === 'success' || value.status === 'error')
  );
}

function parseAgentResult(raw: unknown): AgentResult {
  if (!isAgentResult(raw)) throw new TypeError('Invalid AgentResult shape');
  return raw;
}
```

Never use `any` — parse `unknown` with a type guard at the boundary.

## Options objects (when >3 params)

```ts
interface AgentOptions {
  name: string;
  model: string;
  temperature?: number;    // optional with default
  maxTokens?: number;
  memory: MemoryStore;
}

export function createAgent(options: AgentOptions): Agent {
  const { name, model, temperature = 0.2, maxTokens = 4096, memory } = options;
  // ...
}
```

## Barrel exports (index.ts — re-exports only)

```ts
// packages/core/src/agents/index.ts
export { ArchitectAgent } from './architect-agent.js';
export { CoderAgent } from './coder-agent.js';
export type { AgentResult, AgentOptions } from './types.js';
```

No logic in barrel files. No default exports.

## Import order

```ts
import { readFile } from 'node:fs/promises';       // 1. node built-ins
import { Database } from 'better-sqlite3';          // 2. external packages
import { LLMProvider } from '@devagents/core';      // 3. internal packages
import { buildPrompt } from './prompt-builder.js';  // 4. relative (.js always)
```
