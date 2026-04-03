import Database from "better-sqlite3";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import type {
  MemoryService,
  ProjectIndex,
  AgentMemoryEntry,
  SessionHistoryEntry,
} from "./types.js";

export class SqliteMemoryError extends Error {
  name = "SqliteMemoryError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export class SqliteMemoryService implements MemoryService {
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath: string = ".devagents/memory.db") {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_index (
        id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        framework TEXT,
        testFw TEXT,
        fileTree TEXT NOT NULL,
        conventions TEXT NOT NULL,
        configFiles TEXT NOT NULL,
        entryPoints TEXT NOT NULL,
        indexedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_memory (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        agent TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_history (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        agentsUsed TEXT NOT NULL,
        filesModified TEXT NOT NULL,
        commandsRun TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  }

  getProjectIndex(): ProjectIndex | null {
    const stmt = this.db.prepare("SELECT * FROM project_index LIMIT 1");
    const row = stmt.get() as ProjectIndex | undefined;
    if (!row) return null;

    return {
      ...row,
      fileTree: row.fileTree,
      conventions: row.conventions,
      configFiles: row.configFiles,
      entryPoints: row.entryPoints,
    };
  }

  saveProjectIndex(index: ProjectIndex): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO project_index
      (id, language, framework, testFw, fileTree, conventions, configFiles, entryPoints, indexedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      index.id,
      index.language,
      index.framework,
      index.testFw,
      typeof index.fileTree === "string" ? index.fileTree : JSON.stringify(index.fileTree),
      typeof index.conventions === "string" ? index.conventions : JSON.stringify(index.conventions),
      typeof index.configFiles === "string" ? index.configFiles : JSON.stringify(index.configFiles),
      typeof index.entryPoints === "string" ? index.entryPoints : JSON.stringify(index.entryPoints),
      index.indexedAt
    );
  }

  getAgentMemory(sessionId: string, key: string): AgentMemoryEntry | null {
    const stmt = this.db.prepare(
      "SELECT * FROM agent_memory WHERE sessionId = ? AND key = ? LIMIT 1"
    );
    const row = stmt.get(sessionId, key) as AgentMemoryEntry | undefined;
    if (!row) return null;

    return {
      ...row,
      value: row.value,
    };
  }

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

  setAgentMemory(entry: Omit<AgentMemoryEntry, "id">): void {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO agent_memory (id, sessionId, agent, key, value, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.sessionId,
      entry.agent,
      entry.key,
      typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value),
      entry.createdAt
    );
  }

  getRecentSessions(limit: number): SessionHistoryEntry[] {
    const stmt = this.db.prepare(
      "SELECT * FROM session_history ORDER BY createdAt DESC LIMIT ?"
    );
    return stmt.all(limit) as SessionHistoryEntry[];
  }

  saveSession(session: Omit<SessionHistoryEntry, "id">): void {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO session_history (id, prompt, agentsUsed, filesModified, commandsRun, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      session.prompt,
      typeof session.agentsUsed === "string" ? session.agentsUsed : JSON.stringify(session.agentsUsed),
      typeof session.filesModified === "string" ? session.filesModified : JSON.stringify(session.filesModified),
      typeof session.commandsRun === "string" ? session.commandsRun : JSON.stringify(session.commandsRun),
      session.createdAt
    );
  }

  pruneOldSessions(keep: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM session_history WHERE id NOT IN (
        SELECT id FROM session_history ORDER BY createdAt DESC LIMIT ?
      )
    `);
    stmt.run(keep);
  }

  close(): void {
    this.db.close();
  }
}

export async function createMemoryService(
  dbPath: string = ".devagents/memory.db"
): Promise<SqliteMemoryService> {
  try {
    await mkdir(dirname(dbPath), { recursive: true });
  } catch {
    // Directory may already exist
  }

  const service = new SqliteMemoryService(dbPath);
  service.init();
  return service;
}
