import type { LlmProvider } from "../llm/types.js";

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

export type AgentName = "orchestrator" | "architect" | "coder" | "tester" | "reviewer";

export type UserConfirmation = "yes" | "no" | "edit";

export interface AgentResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export interface DevAgentsConfig {
  llm?: {
    provider?: LlmProvider;
    model?: string;
  };
  team?: {
    autoTest?: boolean;
    autoReview?: boolean;
    confirmPlan?: boolean;
  };
  indexer?: {
    ignore?: string[];
    alwaysRead?: string[];
  };
  memory?: {
    path?: string;
    keepSessionHistory?: number;
  };
}
