import type { LlmProvider } from "../llm/types.js";
import type { UserConfirmation, DevAgentsConfig } from "../types.js";

export type { UserConfirmation, DevAgentsConfig };

export interface AgentResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export interface ProjectIndex {
  id: string;
  language: string;
  framework: string | null;
  testFw: string | null;
  fileTree: string;
  conventions: string;
  configFiles: string;
  entryPoints: string;
  indexedAt: string;
}

export interface AgentMemoryEntry {
  id: string;
  sessionId: string;
  agent: string;
  key: string;
  value: string;
  createdAt: string;
}

export interface SessionHistoryEntry {
  id: string;
  prompt: string;
  agentsUsed: string;
  filesModified: string;
  commandsRun: string;
  createdAt: string;
}

export interface MemoryService {
  init(): void;
  getProjectIndex(): ProjectIndex | null;
  saveProjectIndex(index: ProjectIndex): void;
  getAgentMemory(sessionId: string, key: string): AgentMemoryEntry | null;
  setAgentMemory(entry: Omit<AgentMemoryEntry, "id">): void;
  getAgentMemoryBySession(sessionId: string): AgentMemoryEntry[];
  clearSessionMemory(sessionId: string): void;
  getRecentSessions(limit: number): SessionHistoryEntry[];
  saveSession(session: Omit<SessionHistoryEntry, "id">): void;
  pruneOldSessions(keep: number): void;
}
