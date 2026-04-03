---
name: code-smells
description: TypeScript code smell patterns for static review. Load this alongside style-guide when reviewing implementation files. Covers design-level issues not caught by style rules.
---

## Scope

These are design-level smells detectable without running the code.
Classify all findings as **WARNING** or **NOTE** only — smells are tech debt, not bugs.
Never block a merge solely on a smell finding.

---

## WARNING-level smells

### God Object
A class or module that accumulates too many unrelated responsibilities.

Signals:
- Class with more than 5 public methods spanning unrelated concerns
- File exports more than one primary concept (e.g. exports both a service and its config type and a factory)
- Constructor receives more than 5 injected dependencies

Report as:
```
WARNING · path:line — God Object: `UserService` handles auth, email, and profile persistence.
  Suggestion: extract `EmailNotifier` and `ProfileRepository` as separate classes.
```

---

### Primitive Obsession
Using primitive types (`string`, `number`) where a branded type or value object would prevent bugs.

Signals:
- IDs passed as plain `string` — e.g. `userId: string` instead of `UserId` branded type
- Monetary values as `number` instead of a typed wrapper
- Status represented as a raw `string` instead of a union or enum

Report as:
```
WARNING · path:line — Primitive Obsession: `agentId` is plain `string`.
  Suggestion: `type AgentId = string & { readonly _brand: 'AgentId' }` to prevent accidental mixing with other IDs.
```

---

### Data Clump
Three or more parameters that always travel together — they belong in a named object.

Signals:
- Same group of 3+ params repeated across 2+ function signatures
- Caller always constructs the same inline object literal at every call site

Report as:
```
WARNING · path:line — Data Clump: `host`, `port`, `tls` always passed together.
  Suggestion: extract into `interface ConnectionOptions { host: string; port: number; tls: boolean }`.
```

---

### Magic Values
Hardcoded numbers or strings with no named constant explaining their meaning.

Signals:
- Numeric literal that is not `0`, `1`, or `-1` used inline (e.g. `timeout > 30000`)
- String literal repeated in 2+ places that represents a domain concept

Report as:
```
WARNING · path:line — Magic number `30000` (ms timeout) used inline.
  Suggestion: `const DEFAULT_TIMEOUT_MS = 30_000` at module level.
```

---

### Dead Code
Exported symbols that are never imported anywhere in the monorepo.

Signals:
- Exported function, class, or type with no import site found by a quick grep
- Commented-out block of 5+ lines left in production code

Report as:
```
WARNING · path:line — Dead export: `buildLegacyPrompt` is exported but never imported.
  Suggestion: remove or mark `@internal` if intentionally unexposed.
```

---

## NOTE-level smells

### Feature Envy
A method that accesses fields or calls methods of another object more than its own.

Signals:
- Method body references `other.x`, `other.y`, `other.z` but only `this.id`
- Method would read more naturally as a method on the other class

Report as:
```
NOTE · path:line — Feature Envy: `formatAgentOutput` accesses 4 fields of `AgentResult` but only 1 of `Formatter`.
  Consider: move this method to `AgentResult` or a dedicated formatter class.
```

---

### Inconsistent Abstraction Level
A function mixes high-level orchestration with low-level detail in the same body.

Signals:
- Function calls both `runPipeline()` (high-level) and `fs.readFileSync(path, 'utf8')` (low-level) in the same body
- Comments needed to explain each "section" of a single function

Report as:
```
NOTE · path:line — Mixed abstraction levels in `execute`: orchestration logic mixed with raw file I/O.
  Suggestion: extract low-level steps into named helpers to keep `execute` at one level.
```

---

## What NOT to flag

- Single-method classes that are intentional value objects or command objects
- Branded types already in use — do not suggest adding more
- Smells already covered by style-guide (function length, nesting depth, param count)
- Any finding that requires understanding business logic to assess
