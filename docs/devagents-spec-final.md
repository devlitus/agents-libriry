# Especificación de producto — @devagents v1
## Equipo de agentes de coding con ACP + MCP

**Versión:** 1.0.0
**Estado:** Aprobada — lista para implementar
**Última revisión:** 2026-04-03

---

## 1. Visión general

`@devagents` es un equipo de agentes de IA especializados que se instala en cualquier proyecto como dependencia de desarrollo. El usuario escribe un prompt en su IDE y el equipo lee el repositorio, planifica, genera código y escribe los archivos directamente.

### Principios de diseño

- **Agnóstico al lenguaje** — se adapta a cualquier repositorio y lenguaje
- **Portátil** — vive en el proyecto, no en el IDE. Versión controlada en `package.json`
- **Confiable** — ningún archivo se escribe y ningún comando se ejecuta sin confirmación del usuario
- **Protocolo dual** — ACP para Zed/JetBrains/VS Code, MCP para Claude Code. Misma lógica, dos transportes
- **Memoria persistente** — SQLite en el proyecto. El equipo recuerda el contexto entre sesiones

---

## 2. Alcance v1

### Dentro del alcance

- Equipo de 4 agentes especializados coordinados por un orquestador
- Transporte ACP: Zed, JetBrains, VS Code (extensión ACP)
- Transporte MCP: Claude Code, VS Code Copilot, Cursor
- Memoria persistente con SQLite (3 tablas)
- Indexación del repositorio al inicio, incremental en sesiones siguientes
- LLM: Ollama local (dev) + Anthropic / OpenAI (producción)
- CLI de setup para credenciales y configuración inicial
- Publicación en npm bajo el scope `@devagents`

### Fuera del alcance v1

- Agentes que corren como procesos separados (todos en un mismo proceso)
- Agente de documentación
- Sistema de plugins para agentes de la comunidad
- Registro en el ACP Registry oficial
- UI web propia

---

## 3. Arquitectura general

### 3.1 Estructura del repositorio (monorepo)

```
devagents/
├── packages/
│   ├── core/                  ← @devagents/core  (lógica, nunca se instala directo)
│   │   ├── src/
│   │   │   ├── orchestrator/  ← coordina el flujo entre agentes
│   │   │   ├── agents/        ← Arquitecto, Coder, Tester, Reviewer
│   │   │   ├── indexer/       ← indexa el repositorio del usuario
│   │   │   ├── memory/        ← capa SQLite (better-sqlite3)
│   │   │   ├── llm/           ← abstracción LLM (Ollama / Anthropic / OpenAI)
│   │   │   └── tools/         ← wrappers de herramientas ACP y MCP
│   │   └── package.json
│   │
│   ├── acp/                   ← @devagents/acp
│   │   ├── src/
│   │   │   └── index.ts       ← AgentSideConnection → llama a core
│   │   └── package.json       ← bin: devagents-acp
│   │
│   ├── mcp/                   ← @devagents/mcp
│   │   ├── src/
│   │   │   └── index.ts       ← McpServer → llama a core
│   │   └── package.json       ← bin: devagents-mcp
│   │
│   └── cli/                   ← @devagents/cli
│       ├── src/
│       │   ├── setup.ts       ← wizard interactivo
│       │   └── check.ts       ← verifica LLM y dependencias
│       └── package.json       ← bin: devagents
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .changeset/
```

### 3.2 Cómo lo instala el usuario

```bash
# Instalar los tres paquetes públicos
npm install --save-dev @devagents/acp @devagents/mcp @devagents/cli

# Ejecutar el wizard de configuración
npx devagents setup

# Verificar que todo funciona
npx devagents check
```

Esto crea en el proyecto del usuario:
```
proyecto-del-usuario/
├── agents.config.ts       ← configuración del equipo
├── .env                   ← credenciales (gitignored automáticamente)
└── .devagents/
    └── memory.db          ← SQLite, gitignored automáticamente
```

### 3.3 Un proceso, un equipo

El usuario configura un solo proceso en su IDE. Por dentro, ese proceso contiene el orquestador y todos los agentes:

```
IDE arranca:  ./node_modules/.bin/devagents-acp
                        │
              ┌─────────▼──────────────────────────┐
              │  proceso Node.js                    │
              │                                     │
              │  Orquestador                        │
              │    ├── llama a: Arquitecto          │
              │    ├── llama a: Coder               │
              │    ├── llama a: Tester              │
              │    └── llama a: Reviewer            │
              │                                     │
              │  Todos leen/escriben: SQLite         │
              └─────────────────────────────────────┘
```

Los agentes se comunican por **llamadas TypeScript directas** dentro del mismo proceso. ACP y MCP son únicamente el canal entre el IDE y el proceso, no entre agentes.

### 3.4 Protocolo dual: mismo core, dos transportes

```
                    @devagents/core
                    (orquestador + agentes + memoria)
                         │           │
              ┌──────────┘           └──────────┐
              │                                 │
     @devagents/acp                   @devagents/mcp
     AgentSideConnection              McpServer
     stdin/stdout JSON-RPC            stdio
              │                                 │
     Zed  JetBrains  VS Code          Claude Code  Cursor
                                      VS Code Copilot
```

---

## 4. Flujo de trabajo

### 4.1 Flujo principal

```
1. Usuario escribe prompt en el IDE
2. IDE envía el prompt al proceso @devagents (ACP o MCP)
3. Orquestador lee project_index de SQLite (si existe)
   → Si no existe o está desactualizado: indexa el repositorio
4. Orquestador genera un plan y lo muestra al usuario
5. Usuario aprueba el plan (o lo modifica)
6. Los agentes ejecutan en orden:
   Arquitecto → Coder → Tester → Reviewer
7. Cada agente pide confirmación antes de escribir archivos o ejecutar comandos
8. El orquestador guarda la sesión en SQLite
9. El IDE muestra el resultado final
```

### 4.2 Modos de interacción

**Prompt libre** — el orquestador decide qué agentes activar:
```
"crea un endpoint REST para registrar usuarios con validación de email"
"añade tests a la función parseDate que está en utils/date.ts"
"refactoriza el módulo de autenticación para que use el patrón repositorio"
```

**Comando explícito** — el usuario fuerza un agente concreto:
```
/architect  "diseña la estructura de un módulo de pagos"
/coder      "implementa la clase UserRepository"
/tester     "genera tests para src/services/auth.ts"
/reviewer   "revisa los cambios del último commit"
/plan       "¿cómo implementarías un sistema de caché?"  ← solo planifica, no escribe
```

### 4.3 Confirmaciones requeridas

El usuario debe confirmar explícitamente antes de:

| Acción | Quién la pide | Cómo se muestra |
|--------|--------------|-----------------|
| Escribir un archivo nuevo | Coder | diff completo del archivo nuevo |
| Modificar un archivo existente | Coder | diff de los cambios |
| Ejecutar un comando de terminal | Cualquier agente | comando exacto a ejecutar |

El usuario puede responder: **S** (sí), **n** (no), **e** (editar antes de aplicar).

---

## 5. Agentes del equipo

### 5.1 Orquestador

Punto de entrada único. No genera código. Su trabajo es leer, planificar y coordinar.

**Responsabilidades:**
- Recibir el prompt del IDE (ACP o MCP)
- Consultar SQLite para ver si el proyecto ya está indexado
- Indexar el repositorio si es la primera sesión o hay cambios
- Detectar lenguaje, framework y convenciones del proyecto
- Decidir qué agentes activar y en qué orden según el prompt
- Detectar el agente correcto si el usuario usa un comando explícito (`/coder`, etc.)
- Mostrar el plan al usuario y esperar aprobación
- Pasar el contexto y resultados entre agentes en secuencia
- Guardar la sesión en `session_history`
- Hacer streaming del progreso al IDE en tiempo real

**Detección de lenguaje y framework:**

| Archivo encontrado | Lenguaje | Framework posible |
|---|---|---|
| `package.json` | TypeScript / JavaScript | Express, React, Next.js, NestJS… |
| `pyproject.toml` / `requirements.txt` | Python | FastAPI, Django, Flask… |
| `Cargo.toml` | Rust | Axum, Actix… |
| `go.mod` | Go | Gin, Echo… |
| `pom.xml` / `build.gradle` | Java / Kotlin | Spring… |
| `composer.json` | PHP | Laravel… |
| Ninguno conocido | Genérico | trabaja con cualquier texto/código |

Además lee hasta 10 archivos de código del directorio activo para inferir convenciones de nombres, estilo de imports, patrones usados.

**Plan que muestra al usuario:**
```
Plan de ejecución — "crear endpoint POST /users"
─────────────────────────────────────────────────
Lenguaje detectado: TypeScript (Express)
Archivos de contexto leídos: src/routes/index.ts, src/models/user.ts

1. Arquitecto  → decide estructura y archivos a crear/modificar
2. Coder       → implementa el endpoint y la validación
3. Tester      → genera tests con Jest (detectado en package.json)
4. Reviewer    → revisa consistencia con el codebase

¿Continuar? [S/n/editar]
```

---

### 5.2 Arquitecto

Entiende la estructura existente y decide cómo encaja el código nuevo.

**Activación automática cuando:** el prompt implica crear algo nuevo (módulo, endpoint, clase, feature completa).
**Activación manual:** `/architect`

**Lo que hace:**
1. Lee la estructura de directorios del repositorio (desde SQLite si ya está indexado)
2. Lee los archivos más relevantes para el prompt
3. Identifica patrones existentes: nombres, organización, convenciones
4. Decide qué archivos crear y qué archivos modificar
5. Produce un `ArchitectPlan` que el Orquestador pasa al Coder

**Output (`ArchitectPlan`):**
```typescript
interface ArchitectPlan {
  filesToCreate: {
    path: string;
    description: string;
    template?: string;     // fragmento de referencia del codebase
  }[];
  filesToModify: {
    path: string;
    currentContent: string;
    change: string;
  }[];
  conventions: {
    namingStyle: "camelCase" | "snake_case" | "PascalCase" | "kebab-case";
    testFilePattern: string;   // ej: "*.test.ts" | "test_*.py"
    testDirectory: string;     // ej: "__tests__/" | "tests/" | junto al archivo
    importStyle: "named" | "default" | "mixed";
  };
  notes: string[];             // observaciones para el Coder
}
```

**Guarda en SQLite** (`agent_memory`):
- `key: "last_architect_plan"` — el plan generado para que el Reviewer lo consulte

---

### 5.3 Coder

Escribe o modifica el código en los archivos del repositorio del usuario.

**Activación automática cuando:** siempre que haya código que generar.
**Activación manual:** `/coder`

**Lo que hace:**
1. Recibe el `ArchitectPlan` del Orquestador (o interpreta el prompt directamente si se activa solo)
2. Lee el contenido actual de cada archivo a modificar
3. Genera el código respetando el estilo y convenciones del proyecto
4. Por cada archivo: muestra el diff y espera confirmación del usuario
5. Escribe los archivos confirmados via las herramientas del IDE
6. Si detecta un import de dependencia no instalada: propone instalarla (con confirmación)

**Confirmación por archivo:**
```
─────────────────────────────────────────────────
  Archivo: src/routes/users.ts  [NUEVO]
─────────────────────────────────────────────────
+ import { Router } from 'express'
+ import { z } from 'zod'
+ import { validateBody } from '../middleware/validate'
+ import { UserService } from '../services/user'
+
+ const router = Router()
+
+ router.post('/', validateBody(createUserSchema), async (req, res) => {
+   const user = await UserService.create(req.body)
+   res.status(201).json(user)
+ })
+
+ export default router
─────────────────────────────────────────────────
¿Escribir este archivo? [S/n/editar]
```

**Guarda en SQLite** (`agent_memory`):
- `key: "files_written"` — lista de archivos escritos en esta sesión

**Herramientas del IDE que usa:**
- `filesystem.readFile` — leer archivos (sin confirmación)
- `filesystem.writeFile` — escribir (requiere confirmación del usuario)
- `filesystem.listDirectory` — explorar estructura (sin confirmación)
- `terminal.run` — instalar dependencias si faltan (requiere confirmación)

---

### 5.4 Tester

Genera tests para el código creado o modificado por el Coder.

**Activación automática cuando:** el Coder escribe código nuevo (`autoTest: true` en config).
**Activación manual:** `/tester` o `/tester <archivo>`

**Detección del framework de testing:**

| Detectado en | Framework |
|---|---|
| `jest` en `package.json` | Jest |
| `vitest` en `package.json` | Vitest |
| `mocha` en `package.json` | Mocha |
| `pytest` en `requirements.txt` / `pyproject.toml` | pytest |
| `#[cfg(test)]` en archivos `.rs` | Rust built-in |
| Ninguno detectado | estructura estándar genérica, sin imports de framework |

**Lo que hace:**
1. Lee los archivos que el Coder acaba de escribir (desde `agent_memory`)
2. Lee tests existentes del proyecto para entender el patrón usado
3. Genera los tests respetando el patrón de nombres y ubicación del proyecto
4. Muestra el diff y espera confirmación antes de escribir
5. Propone ejecutar los tests tras escribirlos (con confirmación)

**Ejecución de tests (con confirmación):**
```
Tests generados en: src/routes/users.test.ts

¿Ejecutar los tests ahora?
Comando: npm test -- --testPathPattern=users.test.ts
[S/n]
```

---

### 5.5 Reviewer

Revisa el código generado. No modifica archivos — produce observaciones.

**Activación automática cuando:** al final del flujo completo (`autoReview: true` en config).
**Activación manual:** `/reviewer`

**Qué revisa:**
- Consistencia con el estilo del codebase existente
- Casos no cubiertos o bugs evidentes
- Imports faltantes o incorrectos
- Problemas de seguridad básicos: credenciales hardcodeadas, SQL sin sanitizar, inputs sin validar

**Output:**
```
Revisión completada — 2 observaciones
─────────────────────────────────────────────────
⚠  src/routes/users.ts línea 23
   El bloque catch expone el stack trace completo en la respuesta.
   Sugerencia: devolver solo message, no el objeto error completo.

💡  src/routes/users.ts línea 31
   El proyecto usa un helper centralizado para manejo de errores
   (ver src/utils/errorHandler.ts). Considera aplicarlo aquí también.
─────────────────────────────────────────────────
¿Quieres que el Coder aplique las correcciones? [S/n]
```

Si el usuario dice S, el Orquestador activa el Coder nuevamente con las observaciones como contexto.

---

## 6. Memoria SQLite

### 6.1 Ubicación

```
proyecto-del-usuario/
└── .devagents/
    └── memory.db     ← gitignored automáticamente por el CLI de setup
```

### 6.2 Esquema

```sql
-- Índice del repositorio del usuario
-- Se crea en la primera sesión, se actualiza si hay cambios en el repo
CREATE TABLE project_index (
  id          INTEGER PRIMARY KEY,
  language    TEXT NOT NULL,
  framework   TEXT,
  test_fw     TEXT,
  file_tree   TEXT NOT NULL,   -- JSON: árbol de directorios
  conventions TEXT NOT NULL,   -- JSON: namingStyle, importStyle, testPattern…
  config_files TEXT,           -- JSON: ["tsconfig.json", ".eslintrc", …]
  entry_points TEXT,           -- JSON: ["src/index.ts", "main.py", …]
  indexed_at  INTEGER NOT NULL  -- UNIX timestamp
);

-- Conocimiento compartido entre agentes dentro y entre sesiones
-- Cada agente escribe sus resultados aquí para que los siguientes los lean
CREATE TABLE agent_memory (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  agent      TEXT NOT NULL,    -- "architect" | "coder" | "tester" | "reviewer"
  key        TEXT NOT NULL,    -- "last_architect_plan" | "files_written" | …
  value      TEXT NOT NULL,    -- JSON
  created_at INTEGER NOT NULL  -- UNIX timestamp
);

-- Historial de sesiones: qué hizo el equipo en el pasado
CREATE TABLE session_history (
  id             TEXT PRIMARY KEY,  -- UUID
  prompt         TEXT NOT NULL,
  agents_used    TEXT NOT NULL,     -- JSON: ["architect", "coder", "tester"]
  files_modified TEXT NOT NULL,     -- JSON: lista de rutas
  commands_run   TEXT,              -- JSON: lista de comandos ejecutados
  created_at     INTEGER NOT NULL   -- UNIX timestamp
);
```

### 6.3 Lógica de caché del índice

Al iniciar una sesión el Orquestador comprueba si `project_index` existe y si está fresco:

```
¿Existe project_index?
  No  → indexar completo → guardar en SQLite
  Sí  → comparar indexed_at con mtime de archivos clave
          Sin cambios → usar índice existente (sesión rápida)
          Con cambios → reindexar solo archivos modificados → actualizar SQLite
```

Los archivos clave que determinan si hay que reindexar son: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `tsconfig.json`, y el archivo de configuración principal de cada framework detectado.

### 6.4 Qué lee y escribe cada agente

| Agente | Lee | Escribe |
|--------|-----|---------|
| Orquestador | `project_index`, `session_history` (últimas 5) | `session_history` |
| Arquitecto | `project_index` | `agent_memory.last_architect_plan` |
| Coder | `agent_memory.last_architect_plan` | `agent_memory.files_written` |
| Tester | `agent_memory.files_written` | `agent_memory.test_files` |
| Reviewer | `agent_memory.files_written`, `agent_memory.last_architect_plan` | `agent_memory.review_notes` |

---

## 7. Abstracción LLM

Todos los agentes usan la misma interfaz `LlmClient` del core. El proveedor se detecta automáticamente:

```typescript
interface LlmClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
}
```

**Lógica de detección del proveedor:**

```
NODE_ENV=development  →  Ollama  (http://localhost:11434)
ANTHROPIC_API_KEY     →  Anthropic Claude
OPENAI_API_KEY        →  OpenAI GPT
Ninguno               →  Error: "Ejecuta npx devagents setup"
```

Si hay `NODE_ENV=development` pero también `ANTHROPIC_API_KEY`, gana Ollama. Para usar un proveedor cloud en desarrollo, el usuario puede especificarlo explícitamente en `agents.config.ts`.

---

## 8. Herramientas del IDE

Los agentes nunca acceden al filesystem directamente. Siempre lo hacen a través del protocolo activo (ACP o MCP). Esto garantiza que el IDE mantiene el control de qué se lee y qué se escribe.

| Herramienta | Descripción | Confirmación usuario |
|---|---|---|
| `filesystem.readFile` | Leer un archivo | No |
| `filesystem.writeFile` | Escribir o crear un archivo | **Siempre** |
| `filesystem.listDirectory` | Listar un directorio | No |
| `terminal.run` | Ejecutar un comando en la terminal del proyecto | **Siempre** |

**Comandos de terminal permitidos** (solo relacionados con el proyecto):

| Caso de uso | Ejemplos |
|---|---|
| Instalar dependencia nueva detectada | `npm install zod`, `pip install pydantic` |
| Ejecutar tests | `npm test`, `pytest`, `cargo test` |
| Compilar / type-check | `npm run build`, `tsc --noEmit` |
| Linter / formatter | `npm run lint`, `ruff check .` |

---

## 9. Configuración del usuario

### 9.1 `agents.config.ts`

```typescript
import type { DevAgentsConfig } from "@devagents/core";

const config: DevAgentsConfig = {
  llm: {
    // Omitir para detección automática por variables de entorno
    provider: "anthropic",           // "anthropic" | "openai" | "ollama"
    model: "claude-sonnet-4-5",      // modelo específico (opcional)
  },

  team: {
    autoTest:      true,   // Tester se activa automáticamente tras el Coder
    autoReview:    true,   // Reviewer se activa al final del flujo
    confirmPlan:   true,   // Mostrar plan y pedir aprobación antes de ejecutar
  },

  indexer: {
    ignore:     ["legacy/", "*.generated.ts"],  // además de node_modules, .git, dist…
    alwaysRead: ["ARCHITECTURE.md", "CONTRIBUTING.md"],  // contexto siempre cargado
  },

  memory: {
    path: ".devagents/memory.db",    // ruta de la base de datos SQLite
    keepSessionHistory: 20,          // número de sesiones pasadas a conservar
  }
};

export default config;
```

### 9.2 Variables de entorno (`.env`)

```env
# Desarrollo — Ollama local
NODE_ENV=development
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Producción — descomentar el proveedor elegido
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
```

---

## 10. CLI de setup

### `devagents setup` — wizard interactivo

```
◆  @devagents setup
│
◇  ¿Entorno de trabajo?
│  ● Development (Ollama local)
│  ○ Production (API key de proveedor)
│
◇  URL de Ollama   →  http://localhost:11434
◇  Modelo          →  llama3.1
│
◇  ¿Activar Tester automáticamente?   →  Sí
◇  ¿Activar Reviewer automáticamente? →  Sí
│
◆  Listo
   ✓  .env creado
   ✓  agents.config.ts creado
   ✓  .env añadido a .gitignore
   ✓  .devagents/ añadido a .gitignore
```

### `devagents check`

Verifica que todo funciona antes de abrir el IDE:

```
◆  @devagents check
│
◇  LLM (Ollama llama3.1)    ✓  responde en 340ms
◇  ACP binary               ✓  devagents-acp encontrado
◇  MCP binary               ✓  devagents-mcp encontrado
◇  SQLite                   ✓  .devagents/memory.db accesible
◇  agents.config.ts         ✓  válido
│
◆  Todo listo
```

---

## 11. Integración con IDEs

### Zed (`.zed/settings.json` en el proyecto)

```json
{
  "agent": {
    "agents": [
      {
        "name": "Dev Team",
        "command": "./node_modules/.bin/devagents-acp"
      }
    ]
  }
}
```

### JetBrains

AI Assistant → Settings → External Agents → Add
- Name: `Dev Team`
- Command: `./node_modules/.bin/devagents-acp`

### VS Code — vía ACP (`.vscode/settings.json`)

Requiere la extensión [ACP Client para VS Code](https://github.com/formulahendry/vscode-acp):

```json
{
  "acp.agents": [
    {
      "name": "Dev Team",
      "command": "./node_modules/.bin/devagents-acp"
    }
  ]
}
```

### VS Code — vía MCP / Copilot (`.vscode/mcp.json`)

```json
{
  "servers": {
    "devagents": {
      "type": "stdio",
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
```

### Claude Code (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "devagents": {
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
```

---

## 12. Paquetes npm

| Paquete | Descripción | Binario |
|---|---|---|
| `@devagents/core` | Orquestador, agentes, indexer, memoria (peer dep interna) | — |
| `@devagents/acp` | Transporte ACP para Zed, JetBrains, VS Code | `devagents-acp` |
| `@devagents/mcp` | Transporte MCP para Claude Code, Cursor, Copilot | `devagents-mcp` |
| `@devagents/cli` | CLI setup y check | `devagents` |

---

## 13. Stack tecnológico

| Área | Tecnología |
|---|---|
| Lenguaje | TypeScript 5.x · target ES2022 |
| Runtime | Node.js ≥ 20 |
| Gestor de paquetes | pnpm 9.x |
| Monorepo | pnpm workspaces |
| Build | tsup |
| Testing | vitest |
| ACP SDK | `@agentclientprotocol/sdk` |
| MCP SDK | `@modelcontextprotocol/sdk` |
| LLM Anthropic | `@anthropic-ai/sdk` |
| LLM OpenAI | `openai` |
| LLM Ollama | `ollama` |
| SQLite | `better-sqlite3` |
| CLI prompts | `@clack/prompts` |
| Diff visual | `diff` + `chalk` |
| Versionado | Changesets (independiente por paquete) |

---

## 14. Criterios de aceptación v1

### Setup y CLI
- [ ] `npx devagents setup` crea `.env`, `agents.config.ts`, añade ambos a `.gitignore`
- [ ] `npx devagents check` valida LLM, binarios ACP/MCP y acceso a SQLite
- [ ] Los binarios `devagents-acp` y `devagents-mcp` son ejecutables tras `npm install`

### Indexación y memoria
- [ ] Primera sesión: el orquestador indexa el repositorio y guarda en SQLite
- [ ] Segunda sesión: el orquestador usa el índice en caché (< 500ms para repositorios de hasta 500 archivos)
- [ ] El orquestador detecta lenguaje correctamente en proyectos TypeScript, Python, Rust y Go
- [ ] La sesión se guarda en `session_history` al finalizar
- [ ] Los agentes comparten contexto correctamente via `agent_memory`

### Flujo de agentes
- [ ] Prompt libre activa el flujo completo: Arquitecto → Coder → Tester → Reviewer
- [ ] `/coder` activa solo el Coder sin pasar por Arquitecto
- [ ] El plan se muestra antes de cualquier escritura y el usuario puede rechazarlo
- [ ] Ningún archivo se escribe sin confirmación explícita [S/n/editar]
- [ ] Ningún comando de terminal se ejecuta sin confirmación explícita

### Calidad del código generado
- [ ] El Coder genera código consistente con el estilo del proyecto existente
- [ ] El Tester detecta Jest, Vitest, pytest y Rust built-in correctamente
- [ ] El Reviewer detecta credenciales hardcodeadas y SQL sin sanitizar

### Protocolo ACP
- [ ] El proceso ACP arranca correctamente desde Zed con la configuración de sección 11
- [ ] El proceso ACP arranca correctamente desde VS Code (extensión ACP)
- [ ] El streaming de progreso llega al IDE en tiempo real

### Protocolo MCP
- [ ] El servidor MCP responde correctamente a Claude Code
- [ ] Las herramientas MCP (orchestrate, coder, tester, reviewer) son detectadas por Claude Code
- [ ] El servidor MCP funciona en VS Code Copilot con la config de sección 11

---

## 15. Orden de implementación recomendado

```
Fase 1 — Core y memoria
  1. @devagents/core: LlmClient (Ollama + Anthropic + OpenAI)
  2. @devagents/core: MemoryService (SQLite, 3 tablas)
  3. @devagents/core: Indexer (detección de lenguaje y estructura)

Fase 2 — Agentes
  4. @devagents/core: Orchestrator (coordinación y plan)
  5. @devagents/core: Architect agent
  6. @devagents/core: Coder agent
  7. @devagents/core: Tester agent
  8. @devagents/core: Reviewer agent

Fase 3 — Transportes
  9. @devagents/acp: proceso ACP → llama a Orchestrator
  10. @devagents/mcp: servidor MCP → expone herramientas del Orchestrator

Fase 4 — CLI y pulido
  11. @devagents/cli: devagents setup + devagents check
  12. Pruebas de integración con Zed, VS Code y Claude Code
  13. Documentación y publicación en npm
```

---

## 16. Decisiones para v2 (backlog)

- [ ] Agente de documentación (genera README, JSDoc, docstrings)
- [ ] Soporte para PostgreSQL en memoria de agentes (proyectos con DB existente)
- [ ] Sistema de plugins: API pública para que la comunidad añada agentes
- [ ] Registro en el ACP Registry oficial
- [ ] Memoria semántica: búsqueda por similitud en `agent_memory` con embeddings
- [ ] Agente de migración: actualiza dependencias y adapta el código a breaking changes
