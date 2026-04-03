import type { LlmClient } from "../llm/types.js";
import type { MemoryService } from "../memory/types.js";
import type { DetectedProject } from "../indexer/types.js";
import type { DevAgentsConfig } from "../types.js";
import type { ToolProvider } from "./tool-provider.js";

export type AgentName = "orchestrator" | "architect" | "coder" | "tester" | "reviewer";

export interface AgentContext {
  sessionId: string;
  prompt: string;
  projectIndex: DetectedProject;
  previousResults: Map<AgentName, AgentResult>;
  config: DevAgentsConfig;
  llm: LlmClient;
  memory: MemoryService;
  tools: ToolProvider;
}

export interface AgentResult {
  agent: AgentName;
  success: boolean;
  data: unknown;
  messages: string[];
}

export interface Agent {
  name: AgentName;
  execute(context: AgentContext): Promise<AgentResult>;
}