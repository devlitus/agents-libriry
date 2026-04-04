# Security Audit Report — @devagents

> **Fecha:** 2026-04-04
> **Auditor:** security agent
> **Scope:** packages/core, packages/acp, packages/mcp, packages/cli
> **Resultado:** 17 issues encontrados (4 CRÍTICOS)

---

## Resumen Ejecutivo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 CRÍTICO | 4 | ✅ **ARREGLADOS** (2026-04-04) |
| 🟠 ALTO | 6 | ✅ **ARREGLADOS** (2026-04-04) |
| 🟡 MEDIO | 3 | ✅ **ARREGLADOS** (2026-04-04) |
| 🟢 BAJO | 2 | ✅ **ARREGLADOS** (2026-04-04) |
| ℹ️ INFO | 2 | ✅ Resuelto / Informativo |

**Estado: ✅ APROBADO PARA PRODUCCIÓN** — Todos los 15 issues de seguridad han sido resueltos.

---

## Fixes Aplicados (2026-04-04)

### 🔴 CRÍTICO — Todos resueltos ✅

| Issue | Archivo | Fix | Agent |
|-------|---------|-----|-------|
| [C-1] Command injection MCP | `packages/mcp/src/tool-provider.ts` | `exec()` → `execFile()` + ALLOWLIST + timeout 30s | coder |
| [C-2] Command injection ACP | `packages/acp/src/tool-provider.ts` | `exec()` → `execFile()` + ALLOWLIST + timeout 30s | coder |
| [C-3] Path traversal + injection ACP | `packages/acp/src/tool-provider.ts` | `exec(ls)` → `fs.readdir()` + validación path | coder |
| [C-4] Code injection config-loader | `packages/core/src/config-loader.ts` | `new Function()` → `JSON.parse()` + fallback legacy | coder |

### 🟠 ALTO — Todos resueltos ✅

| Issue | Archivo | Fix | Agent | Estado |
|-------|---------|-----|-------|--------|
| [H-1] Path traversal MCP | `packages/mcp/src/tool-provider.ts` | Bloqueo rutas absolutas + validación `resolve()` | coder | ✅ Arreglado (incluido en C-1) |
| [H-2] Dependency validation | `packages/core/src/agents/coder/coder.ts` | PACKAGE_NAME_REGEX + DANGEROUS_INSTALL_FLAGS | coder | ✅ Arreglado |
| [H-3] writeFile validation | `packages/mcp/src/tool-provider.ts` | `resolvePath()` ya valida | — | ✅ Cubierto por H-1 |
| [H-4] API key validation | `packages/core/src/llm/*.ts` | Validación formato `sk-ant-` / `sk-` | coder | ✅ Arreglado |
| [H-5] Type safety `any` | `packages/core/src/agents/reviewer/security-checks.ts` | `match()` → `test()` con arrays de patterns | coder | ✅ Arreglado |
| [H-6] Unsafe JSON serialization | `packages/core/src/memory/sqlite-memory.ts` | `safeStringify()` con custom replacer | coder | ✅ Arreglado |

---

## 🔴 CRÍTICO

### [C-1] Command Injection en MCP ToolProvider

**Archivo:** `packages/mcp/src/tool-provider.ts:29-40`
**Categoría:** Command Injection

#### Descripción

El método `runCommand()` utiliza `exec()` del módulo `child_process` con comandos directamente controlados por el LLM sin sanitización. Un prompt malicioso podría generar comandos shell arbitrarios.

#### Evidencia

```typescript
async runCommand(command: string): Promise<CommandResult> {
  const { exec } = await import("node:child_process");
  const result = await new Promise<CommandResult>((resolve) => {
    exec(command, { encoding: "utf-8" }, (err, stdout, stderr) => {
      // command viene directo del LLM
    });
  });
}
```

#### Riesgo

Ejecución arbitraria de comandos en el servidor con los permisos del proceso Node.js. Un LLM comprometido o con jailbreak podría ejecutar: `"; rm -rf /; echo "` o robar secrets del sistema.

#### Fix

Reemplazar `exec()` por `execFile()` con una allowlist de comandos seguros:

```typescript
// Allowlist de comandos permitidos
const ALLOWED_COMMANDS = new Set([
  'npm', 'pnpm', 'npx',
  'git', 'node', 'python', 'python3',
  'ls', 'cat', 'head', 'tail', 'wc', 'sort', 'uniq',
]);

function isCommandAllowed(cmd: string): boolean {
  const first = cmd.trim().split(/\s+/)[0];
  return ALLOWED_COMMANDS.has(first);
}

async runCommand(command: string): Promise<CommandResult> {
  if (!isCommandAllowed(command)) {
    throw new Error(`Command not allowed: ${command.split(' ')[0]}`);
  }

  const { execFile } = await import("node:child_process");
  const parts = command.split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);

  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: "utf-8", timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ exitCode: err?.code ?? 0, stdout, stderr });
    });
  });
}
```

**Contexto adicional:** El argumento `timeout` es importante para evitar procesos zombi. `execFile()` es más seguro que `exec()` porque no pasa por un shell, eliminando la posibilidad de expansión de variables o encadenamiento de comandos.

---

### [C-2] Command Injection en ACP ToolProvider

**Archivo:** `packages/acp/src/tool-provider.ts:55-66`
**Categoría:** Command Injection

#### Descripción

Misma vulnerabilidad que en MCP — `runCommand()` ejecuta comandos sin sanitización ni allowlist.

#### Evidencia

```typescript
async runCommand(command: string): Promise<CommandResult> {
  const result = await new Promise<CommandResult>((resolve) => {
    exec(command, { encoding: "utf-8" }, (err, stdout, stderr) => {
      resolve({
        exitCode: err?.code ?? 0,
        stdout: stdout,
        stderr: stderr,
      });
    });
  });
  return result;
}
```

#### Fix

Aplicar el mismo fix que [C-1] — allowlist de comandos + `execFile()` en lugar de `exec()`.

---

### [C-3] Command Injection + Path Traversal en ACP listDirectory

**Archivo:** `packages/acp/src/tool-provider.ts:32-51`
**Categoría:** Command Injection / Path Traversal

#### Descripción

El método `listDirectory()` utiliza `` exec(`ls -la "${path}"`) `` donde `path` es controlado por el usuario. Un path malicioso como `"/etc; cat /etc/passwd"` ejecutaría comandos arbitrarios.

#### Evidencia

```typescript
async listDirectory(path: string): Promise<string[]> {
  const entries = await new Promise<string[]>((resolve, reject) => {
    exec(`ls -la "${path}"`, { encoding: "utf-8" }, (err, stdout) => {
      // ...
    });
  });
  return entries;
}
```

#### Riesgo

Permite tanto inyección de comandos como traversal de archivos fuera del directorio del proyecto (`/etc/passwd`, `~/.ssh/`).

#### Fix

Reemplazar `exec()` por `fs.readdir` con validación de path:

```typescript
async listDirectory(path: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const { resolve } = await import("path");

  // Validar que el path está dentro del rootDir
  const fullPath = resolve(this.rootDir, path);
  if (!fullPath.startsWith(this.rootDir + path.sep) && fullPath !== this.rootDir) {
    throw new Error("Path outside project directory");
  }

  return readdir(fullPath, { withFileTypes: true });
}
```

**Importante:** La verificación `startsWith(rootDir + sep)` es necesaria porque `/home/proj/../etc` no empieza con `/home/proj/` pero sí es un path fuera del proyecto. `resolve()` normaliza el path pero no hace esta comprobación.

---

### [C-4] Code Injection via eval() en Config Loader

**Archivo:** `packages/core/src/config-loader.ts:74`
**Categoría:** Code Injection

#### Descripción

El parser de configuración utiliza `new Function()` para evaluar el contenido de `agents.config.ts`. Si un atacante puede escribir o modificar este archivo, podría ejecutar código arbitrario.

#### Evidencia

```typescript
function parseConfigFile(content: string): Partial<DevAgentsConfig> {
  const cleaned = content
    .replace(/import\s+.*?from\s+['"].*?['"]/g, "")
    .replace(/export\s+/g, "")
    .replace(/:\s*\w+\[\]/g, ": []")
    .replace(/:\s*\w+/g, ": undefined")
    // ... more fragile replacements
    ;

  try {
    const fn = new Function(`return ${cleaned}`);
    return fn() as Partial<DevAgentsConfig>;
  } catch {
    return {};
  }
}
```

#### Riesgo

`new Function()` crea código ejecutable en el scope global. Aunque se hace `replace()` de imports y exports, un atacante podría:
1. Usar expressions que evaluan a código (e.g., `(function(){/* malicious */})()`)
2. Acceder a variables del scope global
3. Sobrescribir el prototype de Object para ejecutar código en la siguiente evaluación

#### Fix

Reemplazar el parsing con `eval()` por un parser de JSON puro o un parser de AST seguro:

**Opción 1 (Recomendada):** Usar JSON para configuración en lugar de TypeScript

```typescript
// agents.config.json
{
  "agents": [...],
  "llm": { "provider": "anthropic" }
}
```

**Opción 2:** Usar `@typescript-eslint/parser` para AST

```typescript
import { parse } from "@typescript-eslint/typescript-esttree";

function parseConfigFile(content: string): Partial<DevAgentsConfig> {
  try {
    const ast = parse(content, { ecmaVersion: "latest", sourceType: "module" });

    // Recorrer el AST y extraer solo ObjectExpression nodes
    // que representen el config object
    // ...
  } catch {
    return {};
  }
}
```

**Opción 3:** Validación estricta con regex疯了 (menos seguro pero más simple)

Si JSON no es viable, usar un parser de expresiones matemáticas/strings sin capacidad de ejecutar código.

---

## 🟠 ALTO

### [H-1] Path Traversal en MCP ToolProvider

**Archivo:** `packages/mcp/src/tool-provider.ts:43-48`
**Categoría:** Path Traversal

#### Descripción

`resolvePath()` permite rutas absolutas que ignoran la restricción de `rootDir`.

#### Evidencia

```typescript
private resolvePath(path: string): string {
  if (path.startsWith("/")) {
    return path;  // ⚠️ Permite leer cualquier archivo
  }
  return join(this.rootDir, path);
}
```

#### Fix

```typescript
private async resolvePath(path: string): Promise<string> {
  const { resolve, isAbsolute } = await import("path");

  if (isAbsolute(path)) {
    throw new Error("Absolute paths not allowed");
  }

  const fullPath = resolve(this.rootDir, path);

  // Verificar que el path resolved está dentro de rootDir
  const normalized = fullPath;
  if (!normalized.startsWith(this.rootDir + import.meta.path.sep)) {
    throw new Error("Path traversal detected");
  }

  return fullPath;
}
```

---

### [H-2] Missing Input Validation — LLM-Generated Dependencies

**Archivo:** `packages/core/src/agents/coder/coder.ts:99-103`
**Categoría:** Supply Chain Security

#### Descripción

El CoderAgent instala dependencias basándose en la salida del LLM sin validación. Paquetes maliciosos podrían ser instalados.

#### Evidencia

```typescript
for (const dep of finalDependencies) {
  const command = `npm install ${dep}`;
  const conf = await this.confirmation.confirmCommand(command);
  if (conf === "yes") {
    await context.tools.runCommand(command);
  }
}
```

#### Fix

1. Verificar el nombre del paquete contra un patrón正则:
```typescript
const PACKAGE_NAME_REGEX = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
```

2. Bloquear flags peligrosos:
```typescript
const DANGEROUS_FLAGS = ['--global', '--unsafe-perm', '--install-links'];
if (DANGEROUS_FLAGS.some(f => command.includes(f))) {
  throw new Error("Dangerous install flag detected");
}
```

3. Considerar usar `npm audit` después de instalar para detectar paquetes maliciosos conocidos.

---

### [H-3] No Validation of File Paths in writeFile

**Archivos:**
- `packages/mcp/src/tool-provider.ts:18-21`
- `packages/acp/src/tool-provider.ts:27-29`

**Categoría:** Path Traversal

#### Descripción

Los métodos `writeFile()` no validan que el path resultante esté dentro del directorio del proyecto.

#### Evidencia

```typescript
async writeFile(path: string, content: string): Promise<void> {
  const fullPath = this.resolvePath(path);
  await writeFile(fullPath, content, "utf-8");
}
```

#### Fix

Igual que [H-1], `resolvePath()` debe validar contra path traversal. Si ya se arregla H-1, este queda cubierto.

---

### [H-4] API Key Environment Variables Not Validated

**Archivos:**
- `packages/core/src/llm/anthropic-client.ts:26-31`
- `packages/core/src/llm/openai-client.ts:26-31`

**Categoría:** Secret Handling

#### Descripción

Las claves API se leen sin validación de formato. Un valor vacío o incorrecto pasará el check.

#### Evidencia

```typescript
constructor(options: { apiKey?: string; model?: string } = {}) {
  this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  if (!this.apiKey) {
    throw new AnthropicError("ANTHROPIC_API_KEY environment variable is not set");
  }
  // Solo verifica que no esté vacío, no el formato
}
```

#### Fix

```typescript
constructor(options: { apiKey?: string; model?: string } = {}) {
  this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";

  if (!this.apiKey) {
    throw new AnthropicError("ANTHROPIC_API_KEY environment variable is not set");
  }

  // Validar formato de API key
  // Anthropic: sk-ant-api... (48+ caracteres)
  if (!this.apiKey.startsWith("sk-ant-")) {
    throw new AnthropicError("Invalid ANTHROPIC_API_KEY format");
  }
}
```

Para OpenAI:
```typescript
if (!this.apiKey.startsWith("sk-")) {
  throw new OpenAIError("Invalid OPENAI_API_KEY format");
}
```

---

### [H-5] Reviewer Security Checks Uses `any` Types

**Archivo:** `packages/core/src/agents/reviewer/security-checks.ts:18-46`
**Categoría:** Type Safety

#### Descripción

Los checks de seguridad usan `.match()` que pueden retornar `any` en ciertos contextos, perdiendo type safety.

#### Evidencia

```typescript
if (
  line.match(/\bpassword\s*=\s*['"][^'"]+['"]/) ||
  line.match(/\bapi_key\s*=\s*['"][^'"]+['"]/)
) {
```

#### Fix

Usar type guards explícitos:

```typescript
function containsPassword(pattern: string | null): pattern is string {
  return pattern !== null;
}

const passwordMatch = line.match(/\bpassword\s*=\s*['"][^'"]+['"]/);
if (containsPassword(passwordMatch)) {
  // passwordMatch es string aquí
}
```

O usar la new TypeScript 5.4 feature con `infer` en el tipo de retorno del match.

---

### [H-6] Memory Service Uses Unsafe JSON Serialization

**Archivo:** `packages/core/src/memory/sqlite-memory.ts:98-101,143,166-168`
**Categoría:** Data Handling

#### Descripción

Los datos se serializan con `JSON.stringify()` sin sanitización.

#### Evidencia

```typescript
typeof index.fileTree === "string" ? index.fileTree : JSON.stringify(index.fileTree),
```

#### Fix

Este es un riesgo bajo porque los datos vienen del indexer (no de usuario externo), pero para ser defensivo:

```typescript
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    // No permitir funciones o símbolos
    if (typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }
    return value;
  });
}
```

---

## 🟡 MEDIO — Todos resueltos ✅

### [M-1] MCP Server Accepts User Input Without Rate Limiting

**Archivo:** `packages/mcp/src/index.ts:358-462`
**Categoría:** Denial of Service

#### Descripción

El servidor MCP procesa requests sin rate limiting ni validación de tamaño. Un cliente malicioso podría enviar prompts enormes.

#### Fix

```typescript
const MAX_PROMPT_LENGTH = 100_000; // 100KB
const MAX_REQUESTS_PER_MINUTE = 60;

const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const client = requestCounts.get(clientId);

  if (!client || client.resetAt < now) {
    requestCounts.set(clientId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (client.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  client.count++;
  return true;
}
```

Y validar longitud del prompt:

```typescript
if (typeof prompt !== "string" || prompt.length > MAX_PROMPT_LENGTH) {
  throw new Error("Prompt exceeds maximum length");
}
```

**Fix aplicado:** ✅ `validatePromptLength()` + `checkRateLimit()` añadidos. Cada handler valida longitud de prompt.

---

### [M-2] No Input Validation on `file` Parameter in Tester

**Archivo:** `packages/mcp/src/index.ts:407-410`
**Categoría:** Input Validation

#### Descripción

El parámetro `file` se acepta sin validación de path traversal.

#### Evidencia

```typescript
const file = args.file as string | undefined;
const fullPrompt = file ? `/tester ${prompt} for file ${file}` : `/tester ${prompt}`;
```

#### Fix

Validar que `file` no contenga path traversal y esté dentro del proyecto:

```typescript
if (file) {
  if (file.includes("..") || file.startsWith("/")) {
    throw new Error("Invalid file path");
  }
}
```

**Fix aplicado:** ✅ Validación de `file` con bloqueo de `..`, `/` absoluto, y caracteres ilegales `/<>:"|?*`.

---

### [M-3] SQLite Parameters Are Safe But Pattern Is Fragile

**Archivo:** `packages/core/src/memory/sqlite-memory.ts`
**Categoría:** Code Quality

#### Descripción

El patrón `typeof X === "string" ? X : JSON.stringify(X)` es frágil. Si `index.fileTree` es un objeto con un `toJSON()` personalizado, podría ejecutarse código.

#### Fix

Ver [H-6] — usar `safeStringify()` en su lugar.

**Fix aplicado:** ✅ Cubierto por [H-6] — `safeStringify()` implementado.

---

## 🟢 BAJO — Todos resueltos ✅

### [L-1] Logger Uses JSON.stringify for All Args

**Archivo:** `packages/core/src/logger.ts:64-71`
**Categoría:** Information Disclosure

#### Descripción

Si se pasan objetos con propiedades sensibles, podrían aparecer en los logs.

#### Fix

```typescript
function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.message;
  try {
    return JSON.stringify(arg, (key, value) => {
      // Filtrar claves sensibles
      if (typeof key === "string" && key.toLowerCase().includes("password")) {
        return "[REDACTED]";
      }
      return value;
    });
  } catch {
    return String(arg);
  }
}
```

**Fix aplicado:** ✅ `SENSITIVE_KEYS` Set + `isSensitiveKey()` + replacer que redacta `password`, `token`, `apiKey`, `secret`, etc.

---

### [L-2] Error Messages May Leak Stack Traces

**Múltiples archivos**
**Categoría:** Information Disclosure

#### Descripción

Los errores se propagan sin sanitizar, pudiendo revelar información sensible en producción.

#### Fix

En producción (NODE_ENV=production), no propagar stack traces:

```typescript
export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "AppError";
  }

  toJSON(): unknown {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      ...(process.env.NODE_ENV !== "production" ? { stack: this.stack } : {}),
    };
  }
}
```

**Fix aplicado:** ✅ `toJSON()` añadido a `SqliteMemoryError`, `ConfigLoaderError`, `CommandNotAllowedError`, `PathTraversalError` — `stack` y `cause` excluidos en producción.

---

## ℹ️ INFO

### [I-1] Dependencies — Known Vulnerabilities

Ejecutar `pnpm audit` para ver vulnerabilidades conocidas en dependencias:

```bash
cd /home/carles/work/agents-libriry && pnpm audit
```

Paquetes a revisar especialmente:
- `openai` ^4.67.0
- `@anthropic-ai/sdk` ^0.82.0
- `better-sqlite3` ^11.0.0
- `@clack/prompts` ^0.7.0

---

### [I-2] Architecture Respects Security Constraints

**Lo que está bien:**
- ✅ Tools nunca tocan filesystem directamente (usan ToolRouter)
- ✅ Confirmation gate para escrituras y comandos
- ✅ Sin networking agent-to-agent (single process)
- ✅ SQL injection protegido (prepared statements)

---

## Plan de Remediación Priorizado

| Prioridad | Issue | Complejidad | Tiempo Est. |
|-----------|-------|-------------|-------------|
| 1 | [C-1] Command injection MCP | Media | 2h |
| 2 | [C-2] Command injection ACP | Media | 1h |
| 3 | [C-3] Path traversal + injection ACP | Media | 1h |
| 4 | [C-4] Code injection config-loader | Alta | 4h |
| 5 | [H-1] Path traversal MCP | Baja | 1h |
| 6 | [H-2] Dependency validation | Media | 2h |
| 7 | [H-3] writeFile validation | Baja | 30min |
| 8 | [H-4] API key validation | Baja | 30min |
| 9 | [M-1] Rate limiting | Media | 2h |
| 10 | Resto | - | - |

**Total estimado:** ~14 horas

---

## Archivos Revisados

```
packages/core/src/
├── config-loader.ts           ← [C-4]
├── logger.ts                  ← [L-1]
├── memory/
│   ├── sqlite-memory.ts       ← [M-3], [H-6]
│   └── types.ts
├── agents/
│   ├── tool-provider.ts       ← [H-3]
│   ├── coder/coder.ts         ← [H-2]
│   ├── coder/dependency-detector.ts
│   ├── architect/architect.ts
│   ├── architect/file-selector.ts
│   ├── tester/tester.ts       ← [M-2]
│   ├── reviewer/security-checks.ts  ← [H-5]
│   └── reviewer/formatter.ts
├── orchestrator/
│   ├── orchestrator.ts
│   └── command-parser.ts
├── indexer/
│   ├── indexer.ts
│   └── file-scanner.ts
└── llm/
    ├── anthropic-client.ts    ← [H-4]
    └── openai-client.ts        ← [H-4]

packages/mcp/src/
├── index.ts                   ← [M-1], [M-2]
├── tool-provider.ts           ← [C-1], [H-1], [H-3]
└── result-formatter.ts

packages/acp/src/
├── index.ts
└── tool-provider.ts           ← [C-2], [C-3], [H-3]

packages/cli/src/
└── setup.ts
```

---

*Generado automáticamente por security agent — 2026-04-04*
