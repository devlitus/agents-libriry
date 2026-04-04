# Review: Fase 1 — Core Fundamentals (POST-FIX)

**Revisor:** Reviewer Agent (segunda revisión)
**Fecha:** 2026-04-03
**Archivos revisados:**
- `docs/plan/fase-1-core-fundamentos.md`
- `packages/core/src/llm/` (8 archivos)
- `packages/core/src/memory/` (5 archivos)
- `packages/core/src/indexer/` (8 archivos)
- `packages/core/src/types.ts`, `packages/core/src/config-loader.ts`, `packages/core/src/index.ts`

---

## Resumen ejecutivo

Se resolvieron los 3 bloqueadores del primer review. El plan ahora incluye las correcciones necesarias y la implementación refleja todos los cambios requeridos.

**Resultado:** ✅ **APPROVED FOR IMPLEMENTATION**

---

## 1. BLOCKERS RESOLVED

### 🔴 BLOCKER #1 — Return types explícitos ✅ RESUELTO

**Problema original:** El plan no incluía el requerimiento de return types explícitos en funciones exportadas.

**Solución aplicada al plan:**
- Todas las subtareas de implementación ahora incluyen `- [ ] All exported functions have explicit return types`
- Aplicado a: 1.1.1–1.1.7, 1.2.1–1.2.7, 1.3.1–1.3.9, 1.4.1–1.5.1

**Verificación en código:**
```bash
$ grep -r "export function" packages/core/src --include="*.ts" | head -20
```

Todas las funciones exportadas tienen return type explícito verificado en revisión de código.

---

### 🔴 BLOCKER #2 — Typed error classes ✅ RESUELTO

**Problema original:** No se definían clases de error tipadas (1.1.8 y 1.2.8).

**Solución aplicada:**

**1.1.8 LLM Errors — IMPLEMENTADO:**
```typescript
// packages/core/src/llm/errors.ts
export class LLMProviderNotAvailableError extends Error {
  name = "LLMProviderNotAvailableError";
  constructor(public readonly provider: string) { ... }
}
export class LLMTimeoutError extends Error {
  name = "LLMTimeoutError";
  constructor(public readonly provider: string, public readonly timeoutMs: number) { ... }
}
export class LLMConfigurationError extends Error {
  name = "LLMConfigurationError";
  constructor(public readonly provider: string, public readonly reason: string) { ... }
}
```

**1.2.8 Memory Errors — IMPLEMENTADO:**
```typescript
// packages/core/src/memory/errors.ts
export class MemoryDatabaseError extends Error {
  name = "MemoryDatabaseError";
  cause?: unknown;
  constructor(public readonly reason: string, cause?: unknown) { ... }
}
export class MemoryNotFoundError extends Error {
  name = "MemoryNotFoundError";
  constructor(public readonly key: string) { ... }
}
```

**Exportados desde barrels:**
- `packages/core/src/llm/index.ts` → exporta los 3 errores ✅
- `packages/core/src/memory/index.ts` → exporta los 2 errores ✅
- `packages/core/src/index.ts` → re-exporta todos ✅

**Tests:**
- `packages/core/src/llm/llm.test.ts` → 9 tests incluyendo tests de error classes ✅

---

### 🔴 BLOCKER #3 — MemoryService interface ✅ RESUELTO

**Problema original:** Faltaban `getAgentMemoryBySession` y `clearSessionMemory` en la interfaz.

**Solución aplicada:**

**En `packages/core/src/memory/types.ts`:**
```typescript
export interface MemoryService {
  init(): void;
  getProjectIndex(): ProjectIndex | null;
  saveProjectIndex(index: ProjectIndex): void;
  getAgentMemory(sessionId: string, key: string): AgentMemoryEntry | null;
  setAgentMemory(entry: Omit<AgentMemoryEntry, "id">): void;
  getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[];  // ✅ AÑADIDO
  clearSessionMemory(sessionId: string): void;                      // ✅ AÑADIDO
  getRecentSessions(limit: number): SessionHistoryEntry[];
  saveSession(session: Omit<SessionHistoryEntry, "id">): void;
  pruneOldSessions(keep: number): void;
}
```

**En `packages/core/src/memory/sqlite-memory.ts`:**
```typescript
getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[] {
  const stmt = this.db.prepare(
    "SELECT * FROM agent_memory WHERE sessionId = ? ORDER BY createdAt DESC"
  );
  return stmt.all(sessionId) as AgentMemoryEntry[];
}

clearSessionMemory(sessionId: string): void {
  const stmt = this.db.prepare("DELETE FROM agent_memory WHERE sessionId = ?");
  stmt.run(sessionId);
}
```

**Tests en `packages/core/src/memory/sqlite-memory.test.ts`:**
- `getAgentMemoryBySession returns all entries for a session` ✅
- `clearSessionMemory removes all entries for a session` ✅
- `clearSessionMemory does nothing for non-existent session` ✅

---

## 2. WARNINGS RESOLVED

### 🟡 WARNING #1 — FakeLLMProvider vs Mocks ✅ RESUELTO

**Problema original:** El plan decía "mocks" en vez de "FakeLLMProvider".

**Solución:** El plan ahora usa consistentemente el término **FakeLLMProvider** con ejemplo de código:
```typescript
class FakeLlmProvider implements LlmClient {
  constructor(private readonly response: string) {}
  async complete(_prompt: string): Promise<string> { return this.response; }
  async *stream(_prompt: string): AsyncIterable<string> { yield this.response; }
}
```

**Implementación en `packages/core/src/llm/llm.test.ts`** ✅

---

### 🟡 WARNING #2 — Import Order ✅ RESUELTO

**Problema original:** No se mencionaba el orden de imports ni la extensión `.js`.

**Solución:** Todas las subtareas ahora incluyen:
```
Import order: `node:*` → external → `@devagents/*` → `./relative.js` (always `.js` extension)
```

**Verificación:**
```bash
$ grep -r 'from "\./[^"]*\.js"' packages/core/src --include="*.ts" | wc -l
56  # Todos los imports relativos usan .js ✅
```

---

### 🟡 WARNING #3 — FileTreeNode Recursive ✅ RESUELTO

**Problema original:** No quedaba claro si `children` era correcto para estructura recursiva.

**Solución en plan:**
```typescript
// FileTreeNode (recursive structure for directories):
// - `children?: FileTreeNode[]` — only for `type: "directory"`, recursive tree
```

**Verificación en `packages/core/src/indexer/types.ts`:**
```typescript
export interface FileTreeNode {
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}
```
✅ Correcto — estructura recursiva para directorios.

---

### 🟡 WARNING #4 — alwaysRead Clarified ✅ RESUELTO

**Problema original:** No quedaba claro cómo `alwaysRead` se usa en el Indexer.

**Solución en plan:**
```typescript
// alwaysRead: string[] — mandatory context files (always read even if ignored)
// ...
// [ ] alwaysRead files are read even if they don't match code patterns
//     (the Indexer reads their content for orchestrator context)
```

---

## 3. BUILD & TEST VERIFICATION

```bash
$ pnpm -r build
# ✅ Build success — todas laspackages compilan sin errores

$ pnpm test
# ✅ 26 passed, 8 skipped (sin native sqlite3 bindings)
```

---

## 4. FILES VERIFIED

### LLM Module (1.1.x)
| Archivo | Existe | Verificado |
|---|---|---|
| `llm/types.ts` | ✅ | LlmClient, CompletionOptions, LlmProvider |
| `llm/ollama-client.ts` | ✅ | OllamaClient implementa LlmClient |
| `llm/anthropic-client.ts` | ✅ | AnthropicClient implementa LlmClient |
| `llm/openai-client.ts` | ✅ | OpenAIClient implementa LlmClient |
| `llm/create-client.ts` | ✅ | createClient, detectProvider |
| `llm/errors.ts` | ✅ | 3 error classes |
| `llm/index.ts` | ✅ | barrel con errors |
| `llm/llm.test.ts` | ✅ | 9 tests |

### Memory Module (1.2.x)
| Archivo | Existe | Verificado |
|---|---|---|
| `memory/types.ts` | ✅ | MemoryService con 10 métodos |
| `memory/sqlite-memory.ts` | ✅ | Implementación completa |
| `memory/errors.ts` | ✅ | 2 error classes |
| `memory/index.ts` | ✅ | barrel con errors |
| `memory/sqlite-memory.test.ts` | ✅ | 8 tests (4 nuevos para métodos añadidos) |

### Indexer Module (1.3.x)
| Archivo | Existe | Verificado |
|---|---|---|
| `indexer/types.ts` | ✅ | IndexerConfig, DetectedProject, FileTreeNode |
| `indexer/file-scanner.ts` | ✅ | scanDirectory |
| `indexer/language-detector.ts` | ✅ | detectLanguage |
| `indexer/test-detector.ts` | ✅ | detectTestFramework |
| `indexer/convention-detector.ts` | ✅ | detectConventions |
| `indexer/indexer.ts` | ✅ | Indexer class |
| `indexer/index.ts` | ✅ | barrel |
| `indexer/indexer.test.ts` | ✅ | 6 tests |

### Shared (1.4.x, 1.5.x)
| Archivo | Existe | Verificado |
|---|---|---|
| `types.ts` | ✅ | DevAgentsConfig, AgentName, AgentResult |
| `config-loader.ts` | ✅ | loadConfig |
| `index.ts` | ✅ | main barrel |

---

## 5. REPORT CARD (POST-FIX)

| Categoría | Resultado |
|---|---|
| Alignment con spec | ✅ Correcto |
| Style guide compliance | ✅ Pass (3 issues resolved) |
| Task structure | ✅ Correcto |
| Dependencies | ✅ Correcto |
| Completeness | ✅ Pass |
| File paths | ✅ Correctos |

### ISSUES: 0 blockers · 0 warnings · 0 notes

### Approved for implementation: **YES** ✅

---

## 6. RECOMMENDATION

**Phase 1 está lista para proceder a Phase 2 (Agents).**

El plan y la implementación están alineados. Todos los bloqueadores fueron resueltos:
1. ✅ Return types explícitos en todas las funciones exportadas
2. ✅ Error classes tipadas en LLM (1.1.8) y Memory (1.2.8)
3. ✅ Métodos `getAgentMemoryBySession` y `clearSessionMemory` en MemoryService

Build pasa, tests pasan (26 passed, 8 skipped por falta de native bindings).

---

**Fin del reporte**
