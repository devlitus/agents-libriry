import type { AgentName, AgentResult } from "./types.js";

export interface PlanStep {
  agent: AgentName;
  action: string;
}

export interface PlanDefinition {
  summary: string;
  language: string;
  contextFiles: string[];
  steps: PlanStep[];
}

export type OrchestratorEvent =
  | { type: "indexing_start" }
  | { type: "indexing_complete" }
  | { type: "plan_ready"; plan: PlanDefinition }
  | { type: "plan_confirmed" }
  | { type: "plan_rejected" }
  | { type: "agent_start"; agent: AgentName }
  | { type: "agent_progress"; agent: AgentName; message: string }
  | { type: "agent_complete"; agent: AgentName; result: AgentResult }
  | { type: "confirm_file"; path: string; diff: string }
  | { type: "confirm_command"; command: string }
  | { type: "session_complete"; success: boolean }
  | { type: "error"; message: string };

export type UserConfirmation = "yes" | "no" | "edit";

export interface ConfirmationHandler {
  confirmPlan(plan: PlanDefinition): Promise<UserConfirmation>;
  confirmFileWrite(path: string, diff: string, isNew: boolean): Promise<UserConfirmation>;
  confirmCommand(command: string): Promise<UserConfirmation>;
}