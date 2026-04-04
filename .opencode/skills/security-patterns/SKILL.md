---
name: security-patterns
description: Patrones de seguridad específicos para el monorepo @devagents — prompt injection, SQLite seguro, path traversal en el indexer, y trust boundaries ACP/MCP. Carga antes de cualquier auditoría o fix de seguridad.
---

## Contexto de riesgo del proyecto

`@devagents` es un sistema de agentes de IA que ejecuta comandos de shell, lee y escribe ficheros, y pasa input del usuario directamente a LLMs. Su superficie de ataque es distinta a una app web convencional.

Las cuatro áreas de riesgo críticas son:

1. LLM prompt injection
2. Tool execution via ACP/MCP
3. SQLite con better-sqlite3
4. Path traversal en el Indexer

---

## 1. LLM Prompt Injection

**Riesgo:** input del usuario que llega sin sanitizar al prompt del LLM puede manipular su comportamiento — exfiltrar memoria, saltarse instrucciones del sistema, o ejecutar herramientas no autorizadas.

**Patrón inseguro:**
```ts
// ❌ El contenido del fichero se incrusta directamente en el prompt
async function buildPrompt(userPrompt: string, fileContent: string): Promise<string> {
  return `${systemPrompt}\n\nUser: ${userPrompt}\n\nFile: ${fileContent}`;
}
```

**Patrón seguro:**
```ts
// ✅ Separar claramente datos de instrucciones con delimitadores explícitos
async function buildPrompt(userPrompt: string, fileContent: string): Promise<string> {
  return [
    systemPrompt,
    '--- USER REQUEST (untrusted) ---',
    sanitizePromptInput(userPrompt),
    '--- FILE CONTENT (untrusted) ---',
    fileContent,
    '--- END OF UNTRUSTED INPUT ---',
  ].join('\n\n');
}

// Elimina secuencias que intenten romper el contexto del sistema
function sanitizePromptInput(input: string): string {
  return input
    .replace(/---\s*(SYSTEM|INSTRUCTION|END)/gi, '[REDACTED]')
    .slice(0, MAX_USER_INPUT_LENGTH);
}
```

**Qué buscar al auditar:**
- Interpolación directa de `userPrompt` o contenido de ficheros en template strings del prompt
- Ausencia de longitud máxima en el input del usuario antes de enviarlo al LLM
- Instrucciones del sistema que el usuario podría sobreescribir con texto como `\n\nNueva instrucción:`

---

## 2. Tool Execution vía ACP/MCP (ToolRouter)

**Riesgo:** el ToolRouter ejecuta comandos de shell y operaciones de fichero en nombre del LLM. Si el LLM es manipulado (via prompt injection) puede solicitar operaciones destructivas.

**Patrón inseguro:**
```ts
// ❌ Ejecuta cualquier comando que el LLM pida sin validación
class TerminalTool {
  async execute(command: string): Promise<ToolResult> {
    return exec(command);
  }
}
```

**Patrón seguro:**
```ts
// ✅ Allowlist de comandos + argumentos como array (nunca string concatenado)
const ALLOWED_COMMANDS = ['pnpm', 'tsc', 'node', 'git'] as const;
type AllowedCommand = typeof ALLOWED_COMMANDS[number];

class TerminalTool {
  async execute(command: AllowedCommand, args: string[]): Promise<ToolResult> {
    if (!ALLOWED_COMMANDS.includes(command)) {
      throw new UnauthorizedCommandError(command);
    }
    // spawn con array de args — nunca exec(string) para evitar shell injection
    return spawnSafe(command, args);
  }
}

function spawnSafe(cmd: string, args: string[]): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false }); // shell: false es crítico
    // ...
  });
}
```

**Qué buscar al auditar:**
- `exec(command)` donde `command` incluye input del LLM o del usuario
- `spawn(cmd, args, { shell: true })` — permite inyección de shell
- `eval()` en cualquier contexto
- Ausencia de allowlist de comandos permitidos en `TerminalTool`

---

## 3. SQLite con better-sqlite3

**Riesgo:** `better-sqlite3` es síncrono. Las queries con strings concatenados son vulnerables a SQL injection si reciben input externo.

**Patrón inseguro:**
```ts
// ❌ Concatenación directa — SQLi si agentId viene de input externo
function getMemory(agentId: string): MemoryEntry[] {
  return db.prepare(`SELECT * FROM agent_memory WHERE agent_id = '${agentId}'`).all();
}
```

**Patrón seguro:**
```ts
// ✅ Parámetros nombrados siempre — never string interpolation in SQL
const GET_MEMORY = db.prepare<{ agentId: string }>(
  'SELECT * FROM agent_memory WHERE agent_id = :agentId'
);

function getMemory(agentId: AgentId): MemoryEntry[] {
  return GET_MEMORY.all({ agentId }) as MemoryEntry[];
}
```

**Reglas adicionales para better-sqlite3:**
```ts
// Preparar statements al inicializar, no en cada llamada
class MemoryService {
  private readonly getById = this.db.prepare('SELECT * FROM agent_memory WHERE id = ?');
  private readonly insert = this.db.prepare(
    'INSERT INTO agent_memory (id, content, created_at) VALUES (?, ?, ?)'
  );

  constructor(private readonly db: Database) {
    // WAL mode para mejor rendimiento y consistencia
    this.db.pragma('journal_mode = WAL');
    // Limitar tamaño de la DB para evitar DoS por disco lleno
    this.db.pragma('max_page_count = 262144'); // ~1GB máximo
  }
}
```

**Qué buscar al auditar:**
- Template literals en strings SQL (`` `SELECT ... WHERE id = '${id}'` ``)
- Statements preparados dentro de bucles en lugar de al inicializar
- Ausencia de `journal_mode = WAL`
- Input de agentes o usuarios que llegue directamente a queries sin pasar por un tipo validado

---

## 4. Path Traversal en el Indexer

**Riesgo:** el Indexer lee ficheros del repositorio. Si la ruta viene de input externo (nombre del repo, rutas relativas), un atacante puede leer ficheros fuera del directorio del proyecto.

**Patrón inseguro:**
```ts
// ❌ No valida que la ruta resultante esté dentro del root permitido
async function readSourceFile(root: string, relativePath: string): Promise<string> {
  const fullPath = path.join(root, relativePath);
  return fs.readFile(fullPath, 'utf-8');
}
// Ataque: relativePath = '../../../../etc/passwd'
```

**Patrón seguro:**
```ts
// ✅ Resolver a ruta absoluta y verificar que empiece por el root permitido
async function readSourceFile(root: string, relativePath: string): Promise<string> {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(root, relativePath);

  if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
    throw new PathTraversalError(relativePath, resolvedRoot);
  }

  return fs.readFile(resolvedPath, 'utf-8');
}

export class PathTraversalError extends Error {
  constructor(attempted: string, allowedRoot: string) {
    super(`Path traversal attempt: "${attempted}" escapes root "${allowedRoot}"`);
    this.name = 'PathTraversalError';
  }
}
```

**Qué buscar al auditar:**
- `path.join(root, userInput)` sin verificación posterior con `startsWith`
- `path.resolve` usado pero sin comparar con el root permitido
- `fs.readFile` o `fs.readdir` con rutas que incluyan `..`
- Ausencia de `PathTraversalError` o equivalente en el Indexer

---

## Checklist rápido por módulo

| Módulo | Riesgo principal | Verificar |
|--------|-----------------|-----------|
| `llm/` | Prompt injection | Delimitadores en `buildPrompt`, límite de longitud |
| `tools/` | Command injection | `shell: false` en spawn, allowlist de comandos |
| `memory/` | SQL injection | Parámetros nombrados en todas las queries |
| `indexer/` | Path traversal | `startsWith(resolvedRoot)` en todas las lecturas |
| `orchestrator/` | Escalada de privilegios | Validación de que agentes solo piden herramientas autorizadas |
| `acp/`, `mcp/` | Trust boundary | Input de transporte tratado como untrusted hasta validación |
