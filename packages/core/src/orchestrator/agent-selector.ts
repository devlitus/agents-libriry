import type { AgentName, AgentContext } from "../agents/types.js";

export interface AgentSelection {
  agents: AgentName[];
  reason: string;
}

export function selectAgentsForPrompt(prompt: string, context: AgentContext): AgentSelection {
  const { config } = context;
  const autoTest = config.team?.autoTest ?? true;
  const autoReview = config.team?.autoReview ?? true;

  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("test") && (lowerPrompt.includes("add") || lowerPrompt.includes("generate") || lowerPrompt.includes("write"))) {
    return {
      agents: ["tester"],
      reason: "Prompt mentions testing",
    };
  }

  if (lowerPrompt.includes("review") || lowerPrompt.includes("check")) {
    return {
      agents: autoReview ? ["reviewer"] : [],
      reason: "Prompt mentions reviewing",
    };
  }

  if (lowerPrompt.includes("design") || lowerPrompt.includes("structure") || lowerPrompt.includes("architecture")) {
    return {
      agents: ["architect"],
      reason: "Prompt mentions design/architecture",
    };
  }

  if (lowerPrompt.includes("create") || lowerPrompt.includes("implement") || lowerPrompt.includes("add") || lowerPrompt.includes("build")) {
    const agents: AgentName[] = ["architect", "coder"];
    if (autoTest) agents.push("tester");
    if (autoReview) agents.push("reviewer");
    return {
      agents,
      reason: "Full flow for creation task",
    };
  }

  if (lowerPrompt.includes("modify") || lowerPrompt.includes("change") || lowerPrompt.includes("update") || lowerPrompt.includes("refactor")) {
    const agents: AgentName[] = ["coder"];
    if (autoReview) agents.push("reviewer");
    return {
      agents,
      reason: "Coder + reviewer for modification task",
    };
  }

  return {
    agents: [],
    reason: "No agents selected for unknown prompt",
  };
}