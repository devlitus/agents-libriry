import type { LlmProvider } from "./llm/types.js";

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