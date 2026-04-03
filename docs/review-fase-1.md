# Review: Fase 1 — Core Fundamentals (fase-1-core-fundamentos.md)

**Revisor:** Reviewer Agent  
**Fecha:** 2026-04-03  
**Archivos revisados:**
- `docs/plan/fase-1-core-fundamentos.md`
- `docs/STYLE_GUIDE.md`
- `docs/devagents-spec-final.md`
- `docs/plan/fase-0-scaffolding.md`

---

## Resumen ejecutivo

El plan Fase 1 está **bien estructurado y es mayormente correcto**. Cubre las 3 capas fundamentales: abstracción LLM, memoria SQLite e indexador de repositorio. Las subtareas son coherentes con el spec y la estructura de archivos coincide con la sección 3.1 del spec.

**Hay 3 problemas que deben resolverse antes de aprobar** (véanse debajo).

**Subtasks contados:** 26 (correcto según README.md)

---

## 1. ALIGNMENT CON EL SPEC

### 1.1 LLM Abstraction (Task 1.1)

| Spec sección 7 | Plan 1.1 | Estado |
|---|---|---|
| `LlmClient` con `complete()` y `stream()` | ✓ Task 1.1.1 | ✅ Correcto |
| `CompletionOptions`: temperature, maxTokens, systemPrompt, stopSequences | ✓ Task 1.1.1 | ✅ Correcto |
| `LlmProvider`: "ollama" \| "anthropic" \| "openai" | ✓ Task 1.1.1 | ✅ Correcto |
| Detección: NODE_ENV=development → Ollama, ANTHROPIC_API_KEY → Anthropic, OPENAI_API_KEY → OpenAI | ✓ Task 1.1.5 | ✅ Correcto |
| Si NODE_ENV=development + ANTHROPIC_API_KEY: Ollama gana | ✓ Task 1.1.5 nota | ✅ Correcto |
| Config explícita tiene prioridad | ✓ Task 1.1.5 | ✅ Correcto |

### 1.2 SQLite Memory (Task 1.2)

| Spec sección 6.2 | Plan 1.2 | Estado |
|---|---|---|
| `project_index`: id, language, framework, test_fw, file_tree, conventions, config_files, entry_points, indexed_at | ✓ Task 1.2.1 | ✅ Correcto |
| `agent_memory`: id, session_id, agent, key, value, created_at | ✓ Task 1.2.1 | ✅ Correcto |
| `session_history`: id, prompt, agents_used, files_modified, commands_run, created_at | ✓ Task 1.2.1 | ✅ Correcto |
| `MemoryService` interface con init, getProjectIndex, saveProjectIndex, getAgentMemory, setAgentMemory, getRecentSessions, saveSession, pruneOldSessions | ✓ Task 1.2.1 | ✅ Correcto |
| Lógica de caché incremental (spec 6.3) | ✓ Task 1.3.7 | ✅ Correcto |

### 1.3 Indexer (Task 1.3)

| Spec sección 5.1 | Plan 1.3 | Estado |
|---|---|---|
| Detección de lenguaje por package.json, pyproject.toml, Cargo.toml, go.mod, pom.xml, composer.json | ✓ Task 1.3.3 | ✅ Correcto |
| Detección de framework (Express, React, NestJS, FastAPI, Django, Axum, Gin, Spring, Laravel) | ✓ Task 1.3.3 | ✅ Correcto |
| Test framework: Jest, Vitest, Mocha, pytest, Rust built-in | ✓ Task 1.3.4 | ✅ Correcto |
| Convención de código: namingStyle, importStyle, indentation, semicolons, quotes | ✓ Task 1.3.5 | ✅ Correcto |
| Archivos clave para reindexar: package.json, pyproject.toml, Cargo.toml, go.mod, tsconfig.json + config principal | ✓ Task 1.3.7 | ✅ Correcto |

### 1.4 Shared Types (Task 1.4)

| Spec sección 9.1 | Plan 1.4 | Estado |
|---|---|---|
| `DevAgentsConfig` con llm, team, indexer, memory | ✓ Task 1.4.1 | ✅ Correcto |
| `AgentName`: "orchestrator" \| "architect" \| "coder" \| "tester" \| "reviewer" | ✓ Task 1.4.1 | ✅ Correcto |

---

## 2. STYLE GUIDE COMPLIANCE

### 2.1 Naming Conventions

| Regla | Hallazgo | Estado |
|---|---|---|
| Archivos kebab-case | `packages/core/src/llm/types.ts` — correcto | ✅ |
| Interfaces sin prefijo I | `LlmClient`, `MemoryService` — correcto | ✅ |
| Funciones verb+noun | Los nombres de funciones son descriptivos en las subtareas | ✅ |
| Boolean prefixes is/has/can | No aplica directamente al plan de tareas | ✅ |

### 2.2 TypeScript Rules

| Regla | Hallazgo | Estado |
|---|---|---|
| strict: true | Heredado de fase-0 (tsconfig.base.json) | ✅ |
| No any | El plan no menciona `any` — implícitamente correcto | ✅ |
| Return types explícitos en API pública | No está listado como requerimiento en las subtareas | ⚠️ FALTA |
| type para uniones, interface para shapes | Usa `type` para LlmProvider, `interface` para LlmClient — correcto | ✅ |

**⚠️ ISSUE #1:** El plan no incluye explicitmente el requerimiento de que todas las funciones exportadas deben tener return type explícito. Añadir en cada subtarea de implementación algo como:
```
- [ ] Todas las funciones exportadas tienen return type explícito
```

### 2.3 Error Handling

| Regla | Hallazgo | Estado |
|---|---|---|
| Typed error classes (extienden Error, set this.name) | El plan dice "Throws clear error if..." pero no especifica clases de error | ⚠️ FALTA |
| Catch solo para añadir contexto | El plan no lo menciona | ⚠️ FALTA |

**⚠️ ISSUE #2:** Falta definir los error classes. Debería haber una subtarea adicional en 1.1 para definir errores como:
```typescript
export class LLMProviderNotAvailableError extends Error {
  constructor(public readonly provider: string) {
    super(`LLM provider "${provider}" is not available`);
    this.name = 'LLMProviderNotAvailableError';
  }
}
```

### 2.4 Import Order

| Regla | Hallazgo | Estado |
|---|---|---|
| node:* → external → @devagents/* → ./relative.js | El plan no lo menciona | ⚠️ FALTA |

**⚠️ ISSUE #3:** El plan no incluye el requerimiento de orden de imports ni la extensión `.js` en imports relativos. Añadir en Style Guidelines notes.

### 2.5 JSDoc

| Regla | Hallazgo | Estado |
|---|---|---|
| JSDoc solo en API pública | No está verificado en el plan | ⚠️ FALTA |

---

## 3. DEPENDENCY CORRECTNESS

La estructura de dependencias dentro de Fase 1 es correcta según README.md:

```
1.1 LLM + 1.2 Memory + 1.3 Indexer → en paralelo ✓
1.4 Types → en paralelo con los anteriores ✓
1.5 Barrel export → al final, después de todo ✓
```

Phase 0 (fase-0) debe estar completa antes de Phase 1. El plan indica:
> **Dependencies:** Phase 0 completed (monorepo functional, builds OK)

✅ Correcto.

---

## 4. COMPLETENESS CHECK

### 4.1 LLM Layer — coverage review

| Spec | Implementado | Checkbox |
|---|---|---|
| LlmClient interface | ✓ 1.1.1 | ✓ |
| Ollama provider | ✓ 1.1.2 | ✓ |
| Anthropic provider | ✓ 1.1.3 | ✓ |
| OpenAI provider | ✓ 1.1.4 | ✓ |
| Factory con auto-detección | ✓ 1.1.5 | ✓ |
| Tests | ✓ 1.1.6 | ✓ |
| Barrel export | ✓ 1.1.7 | ✓ |

**Falta:** Los tests (1.1.6) dicen "mock" pero el STYLE_GUIDE especifica usar `FakeLLMProvider` con respuestas determinísticas. El plan debería mencionar fake providers en vez de mocks genéricos.

### 4.2 Memory Layer — coverage review

| Spec | Implementado | Checkbox |
|---|---|---|
| Tipos e interfaces | ✓ 1.2.1 | ✓ |
| SqliteMemoryService | ✓ 1.2.2 | ✓ |
| project_index logic | ✓ 1.2.3 | ✓ |
| agent_memory logic | ✓ 1.2.4 | ✓ |
| session_history logic | ✓ 1.2.5 | ✓ |
| Tests | ✓ 1.2.6 | ✓ |
| Barrel export | ✓ 1.2.7 | ✓ |

✅ Completo.

### 4.3 Indexer Layer — coverage review

| Spec | Implementado | Checkbox |
|---|---|---|
| IndexerConfig, DetectedProject, ProjectConventions, FileTreeNode | ✓ 1.3.1 | ✓ |
| File tree scanner | ✓ 1.3.2 | ✓ |
| Language/framework detection | ✓ 1.3.3 | ✓ |
| Test framework detection | ✓ 1.3.4 | ✓ |
| Code convention detection | ✓ 1.3.5 | ✓ |
| Main Indexer orchestration | ✓ 1.3.6 | ✓ |
| Incremental indexing | ✓ 1.3.7 | ✓ |
| Tests | ✓ 1.3.8 | ✓ |
| Barrel export | ✓ 1.3.9 | ✓ |

✅ Completo.

### 4.4 Missing Methods in MemoryService

El spec sección 6.4 indica qué leen y escriben los agentes:

| Agente | Lee | Escribe |
|---|---|---|
| Orquestador | project_index, session_history (últimas 5) | session_history |
| Arquitecto | project_index | agent_memory.last_architect_plan |
| Coder | agent_memory.last_architect_plan | agent_memory.files_written |
| Tester | agent_memory.files_written | agent_memory.test_files |
| Reviewer | agent_memory.files_written, last_architect_plan | agent_memory.review_notes |

El `MemoryService` en 1.2.1 no incluye:
- `getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[]` — mencionado en 1.2.4
- `clearSessionMemory(sessionId: string): void` — mencionado en 1.2.4
- `test_files` y `review_notes` como keys

**Veredicto:** Los métodos necesarios están en 1.2.4 pero NO en la interfaz de 1.2.1. La interfaz `MemoryService` debería incluir `getAgentMemoryBySession` y `clearSessionMemory` explícitamente.

---

## 5. TEST QUALITY

### 5.1 Fake Providers vs Mocks

STYLE_GUIDE.md sección 7 dice:
> Use a `FakeLLMProvider` that returns deterministic responses.

El plan 1.1.6 dice:
> Unit tests with mocks for each provider

El plan debería decir:
> Unit tests with **FakeLLMProvider** for each provider

### 5.2 Coverage Thresholds

El plan establece:
- LLM: > 80%
- Memory: > 85%
- Indexer: > 80%

✅ Bien. Coincide con STYLE_GUIDE.

---

## 6. FILE PATHS

| Ruta del plan | ¿Existe en spec? | Estado |
|---|---|---|
| `packages/core/src/llm/` | Spec 3.1: core/src/llm/ | ✅ |
| `packages/core/src/memory/` | Spec 3.1: core/src/memory/ | ✅ |
| `packages/core/src/indexer/` | Spec 3.1: core/src/indexer/ | ✅ |
| `packages/core/src/tools/` | Spec 3.1: core/src/tools/ | ✅ (no usado en fase 1) |

Rutas correctas según la estructura del monorepo en spec 3.1.

---

## 7. ISSUES SUMMARY

### 🔴 BLOCKERS (deben resolverse)

| # | Ubicación | Problema | Solución |
|---|---|---|---|
| 1 | Todas las subtareas de implementación | No se pide return type explícito en funciones exportadas | Añadir checkbox: `[ ] Return types explícitos en API pública` |
| 2 | 1.1.x, 1.2.x, 1.3.x | No se definen typed error classes | Crear subtarea 1.1.8 para errores LLM, 1.2.8 para errores Memory |
| 3 | 1.2.1 (MemoryService interface) | Falta `getAgentMemoryBySession` y `clearSessionMemory` en la interfaz | Añadir a la interfaz de 1.2.1 |

### 🟡 WARNINGS (recomendados)

| # | Ubicación | Problema | Sugerencia |
|---|---|---|---|
| 1 | 1.1.6, 1.2.6, 1.3.8 | Dice "mocks" en vez de "FakeLLMProvider" | Usar terminología del STYLE_GUIDE |
| 2 | 1.1.x, 1.2.x, 1.3.x | No se menciona orden de imports (.js extension) | Añadir nota sobre import order |
| 3 | 1.3.1 | Los tipos FileTreeNode children son opcionales, pero la estructura es tree | Verificar que sea recursivo correctamente |
| 4 | 1.3.6 | `alwaysRead` se pasa al Indexer pero no queda claro cómo se usa | Es más un detalle de implementación |

### 🟢 NOTES

| # | Ubicación | Observación |
|---|---|---|
| 1 | 1.3.2 | Límite de 10 niveles de profundidad y 5000 archivos — razonable para large repos |
| 2 | 1.2.2 | Usar `better-sqlite3` con synchronous API — el spec confirma SQLite síncrono |
| 3 | 1.4.1 | `AgentResult` es "generic type" — debería ser más específico o tener discriminante union |

---

## 8. REPORT CARD

| Categoría | Resultado |
|---|---|
| Alignment con spec | ✅ Correcto |
| Style guide compliance | ⚠️ 3 issues |
| Task structure | ✅ Correcto |
| Dependencies | ✅ Correcto |
| Completeness | ⚠️ 1 issue menor |
| File paths | ✅ Correctos |

### ISSUES: 3 blockers · 4 warnings · 3 notes

### Approved for implementation: **NO**

**Razón:** 3 bloqueadores que deben resolverse antes de proceder.

---

## 9. RECOMMENDED FIXES

### Fix para ISSUE #1 (Return types explícitos)

En cada subtarea de implementación (1.1.2, 1.1.3, 1.1.4, 1.2.2, 1.3.2, etc.), añadir:
```
- [ ] Todas las funciones exportadas tienen return type explícito
```

### Fix para ISSUE #2 (Typed error classes)

Crear una subtarea adicional 1.1.8:
```
### 1.1.8 — Definir errores tipados del LLM
- Crear `packages/core/src/llm/errors.ts`
- Definir:
  ```typescript
  export class LLMProviderNotAvailableError extends Error {
    constructor(public readonly provider: string) {
      super(`LLM provider "${provider}" is not available`);
      this.name = 'LLMProviderNotAvailableError';
    }
  }
  export class LLMTimeoutError extends Error { ... }
  export class LLMConfigurationError extends Error { ... }
  ```
- Exportar desde `packages/core/src/llm/index.ts`
- [ ] Errores definidos y exportados
```

Igual para memoria (1.2.8).

### Fix para ISSUE #3 (MemoryService interface)

En 1.2.1, añadir a la interfaz:
```typescript
interface MemoryService {
  // ... métodos existentes ...
  getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[];
  clearSessionMemory(sessionId: string): void;
}
```

---

## 10. PARALLELIZATION VERIFICATION

Según README.md, dentro de Fase 1:
- 1.1 (LLM) + 1.2 (Memory) + 1.3 (Indexer) → en paralelo ✅
- 1.4 (types) → en paralelo con los 3 anteriores ✅
- 1.5 (barrel export) → al final ✅

El plan respeta estas restricciones.

---

**Fin del reporte**
