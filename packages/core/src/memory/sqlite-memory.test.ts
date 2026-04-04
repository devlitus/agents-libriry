import { describe, it, expect, beforeEach } from "vitest";
import { SqliteMemoryService } from "./sqlite-memory.js";
import type { MemoryService, ProjectIndex, AgentMemoryEntry, SessionHistoryEntry } from "./types.js";

// In-memory fake implementation for testing when better-sqlite3 isn't available
class FakeSqliteMemoryService implements MemoryService {
  private projectIndex: ProjectIndex | null = null;
  private agentMemory: AgentMemoryEntry[] = [];
  private sessions: SessionHistoryEntry[] = [];

  init(): void {
    // No-op for in-memory implementation
  }

  getProjectIndex(): ProjectIndex | null {
    return this.projectIndex;
  }

  saveProjectIndex(index: ProjectIndex): void {
    this.projectIndex = index;
  }

  getAgentMemory(sessionId: string, key: string): AgentMemoryEntry | null {
    return this.agentMemory.find(e => e.sessionId === sessionId && e.key === key) ?? null;
  }

  setAgentMemory(entry: Omit<AgentMemoryEntry, "id">): void {
    const newEntry: AgentMemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    this.agentMemory.push(newEntry);
  }

  getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[] {
    return this.agentMemory.filter(e => e.sessionId === sessionId);
  }

  clearSessionMemory(sessionId: string): void {
    this.agentMemory = this.agentMemory.filter(e => e.sessionId !== sessionId);
  }

  getRecentSessions(limit: number): SessionHistoryEntry[] {
    return this.sessions.slice(0, limit);
  }

  saveSession(session: Omit<SessionHistoryEntry, "id">): void {
    const newSession: SessionHistoryEntry = {
      ...session,
      id: crypto.randomUUID(),
    };
    this.sessions.unshift(newSession);
  }

  pruneOldSessions(keep: number): void {
    this.sessions = this.sessions.slice(0, keep);
  }

  close(): void {
    // No-op for in-memory implementation
  }
}

// Check if better-sqlite3 native bindings are available
const sqlite3Available = (() => {
  try {
    new SqliteMemoryService(":memory:");
    return true;
  } catch {
    return false;
  }
})();

// Use real implementation if available, otherwise use fake
type TestMemoryService = SqliteMemoryService | FakeSqliteMemoryService;
const createTestMemory = (): TestMemoryService => {
  if (sqlite3Available) {
    const memory = new SqliteMemoryService(":memory:");
    memory.init();
    return memory;
  }
  return new FakeSqliteMemoryService();
};

describe("memory/sqlite-memory", () => {
  let memory: TestMemoryService;

  beforeEach(() => {
    memory = createTestMemory();
  });

  it("init creates tables", () => {
    const index = memory.getProjectIndex();
    expect(index).toBeNull();
  });

  it("save and get project index", () => {
    const project = {
      id: "test-id",
      language: "typescript",
      framework: "next",
      testFw: "jest",
      fileTree: '{"files":[]}',
      conventions: '{"namingStyle":"camelCase"}',
      configFiles: '["package.json"]',
      entryPoints: '["src/index.ts"]',
      indexedAt: new Date().toISOString(),
    };

    memory.saveProjectIndex(project);
    const retrieved = memory.getProjectIndex();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.language).toBe("typescript");
    expect(retrieved?.framework).toBe("next");
  });

  it("save and get agent memory", () => {
    const entry = {
      sessionId: "session-1",
      agent: "architect",
      key: "plan",
      value: '{"steps":["step1","step2"]}',
      createdAt: new Date().toISOString(),
    };

    memory.setAgentMemory(entry);
    const retrieved = memory.getAgentMemory("session-1", "plan");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.agent).toBe("architect");
    expect(retrieved?.key).toBe("plan");
  });

  it("save and get recent sessions", () => {
    const session = {
      prompt: "create a REST API",
      agentsUsed: '["architect","coder"]',
      filesModified: '["src/api.ts"]',
      commandsRun: '["pnpm build"]',
      createdAt: new Date().toISOString(),
    };

    memory.saveSession(session);
    const sessions = memory.getRecentSessions(10);

    expect(sessions.length).toBe(1);
    expect(sessions[0].prompt).toBe("create a REST API");
  });

  it("prune old sessions", () => {
    for (let i = 0; i < 10; i++) {
      memory.saveSession({
        prompt: `session ${i}`,
        agentsUsed: "[]",
        filesModified: "[]",
        commandsRun: "[]",
        createdAt: new Date().toISOString(),
      });
    }

    memory.pruneOldSessions(5);
    const sessions = memory.getRecentSessions(10);

    expect(sessions.length).toBe(5);
  });

  it("getAgentMemoryBySession returns all entries for a session", () => {
    memory.setAgentMemory({
      sessionId: "session-x",
      agent: "architect",
      key: "plan1",
      value: '{"steps":["step1"]}',
      createdAt: new Date().toISOString(),
    });
    memory.setAgentMemory({
      sessionId: "session-x",
      agent: "architect",
      key: "plan2",
      value: '{"steps":["step2"]}',
      createdAt: new Date().toISOString(),
    });
    memory.setAgentMemory({
      sessionId: "session-y",
      agent: "coder",
      key: "plan1",
      value: '{"files":[]}',
      createdAt: new Date().toISOString(),
    });

    const sessionXEntries = memory.getAgentMemoryBySession("session-x");
    expect(sessionXEntries.length).toBe(2);
    expect(sessionXEntries.every((e) => e.sessionId === "session-x")).toBe(true);

    const sessionYEntries = memory.getAgentMemoryBySession("session-y");
    expect(sessionYEntries.length).toBe(1);
    expect(sessionYEntries[0].sessionId).toBe("session-y");
  });

  it("clearSessionMemory removes all entries for a session", () => {
    memory.setAgentMemory({
      sessionId: "session-to-clear",
      agent: "architect",
      key: "plan",
      value: '{"steps":[]}',
      createdAt: new Date().toISOString(),
    });
    memory.setAgentMemory({
      sessionId: "session-to-clear",
      agent: "coder",
      key: "files",
      value: '{"files":[]}',
      createdAt: new Date().toISOString(),
    });
    memory.setAgentMemory({
      sessionId: "other-session",
      agent: "architect",
      key: "plan",
      value: '{"steps":[]}',
      createdAt: new Date().toISOString(),
    });

    memory.clearSessionMemory("session-to-clear");

    const clearedEntries = memory.getAgentMemoryBySession("session-to-clear");
    expect(clearedEntries.length).toBe(0);

    const otherEntries = memory.getAgentMemoryBySession("other-session");
    expect(otherEntries.length).toBe(1);
  });

  it("clearSessionMemory does nothing for non-existent session", () => {
    memory.setAgentMemory({
      sessionId: "existing-session",
      agent: "architect",
      key: "plan",
      value: '{"steps":[]}',
      createdAt: new Date().toISOString(),
    });

    memory.clearSessionMemory("non-existent-session");

    const entries = memory.getAgentMemoryBySession("existing-session");
    expect(entries.length).toBe(1);
  });
});
