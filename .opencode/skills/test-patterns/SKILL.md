---
name: test-patterns
description: Vitest patterns for the @devagents monorepo: fake providers, AAA structure, naming, and coverage rules. Load before writing any test file.
---

## Framework

Vitest: import `describe`, `it`, `expect`, `vi` from `'vitest'`.
Co-locate tests: `foo.ts` → `foo.test.ts`. Integration: `foo.integration.test.ts`.

## Test naming

`it('verb + observable outcome + condition')`:
```ts
it('throws LLMTimeoutError when provider exceeds timeout threshold')
it('returns empty index when repository has no source files')
it('resumes from last checkpoint when memory entry exists')
it('dispatches only ready agents when queue has mixed statuses')
```

## AAA structure (mandatory)

```ts
it('returns error result when provider times out', async () => {
  // Arrange
  const provider = new SlowFakeLLMProvider({ delayMs: 9999 });
  const agent = new CoderAgent({ provider, timeoutMs: 100 });

  // Act
  const result = await agent.run({ task: 'implement auth' });

  // Assert
  expect(result.status).toBe('error');
  expect(result.error).toBeInstanceOf(LLMTimeoutError);
});
```

## Fake providers (never real LLM or DB in unit tests)

```ts
class FakeLLMProvider implements LLMProvider {
  constructor(private readonly response: string) {}
  async complete(_prompt: string): Promise<LLMResponse> {
    return { text: this.response, tokensUsed: 0 };
  }
}

class FakeSqliteStore implements MemoryStore {
  private readonly entries: MemoryEntry[] = [];
  async save(entry: MemoryEntry): Promise<void> { this.entries.push(entry); }
  async find(_query: string): Promise<MemoryEntry[]> { return this.entries; }
  async clear(): Promise<void> { this.entries.length = 0; }
}

class FakeIndexer implements Indexer {
  constructor(private readonly index: RepositoryIndex) {}
  async build(_root: string): Promise<RepositoryIndex> { return this.index; }
}
```

Name fakes clearly. Define them at the top of the test file or in a `test/fixtures.ts`.

## Coverage rules

For every exported function/class, cover:
1. Happy path — valid input → expected output
2. Empty / null / undefined inputs
3. Error paths — typed errors are thrown, not swallowed
4. Boundary values where applicable

## What to never do

- Assert on internal call order (spy on private methods)
- Call real LLM providers or DB in unit tests
- Use `it.skip` or `xit` without a comment explaining the blocker
- Use `any` in test files
- Import from internal paths — only from the module's public API
