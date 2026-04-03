import type { PlanDefinition, PlanStep } from "../agents/orchestrator-types.js";
import type { AgentName } from "../agents/types.js";
import type { DetectedProject } from "../indexer/types.js";

export function generatePlan(
  summary: string,
  project: DetectedProject,
  selectedAgents: AgentName[]
): PlanDefinition {
  const steps: PlanStep[] = selectedAgents.map((agent) => ({
    agent,
    action: getActionForAgent(agent),
  }));

  return {
    summary,
    language: project.language,
    contextFiles: project.configFiles,
    steps,
  };
}

function getActionForAgent(agent: AgentName): string {
  switch (agent) {
    case "architect":
      return "Design project structure and plan files to create/modify";
    case "coder":
      return "Implement code changes";
    case "tester":
      return "Generate and run tests";
    case "reviewer":
      return "Review code for issues";
    default:
      return "Execute agent";
  }
}

export function formatPlanForDisplay(plan: PlanDefinition): string {
  const lines: string[] = [
    `Execution plan — "${plan.summary}"`,
    `Detected language: ${plan.language}`,
    `Context files read: ${plan.contextFiles.length > 0 ? plan.contextFiles.join(", ") : "none"}`,
    "",
    ...plan.steps.map((step, i) => `${i + 1}. ${capitalize(step.agent)} → ${step.action}`),
    "",
    "Continue? [Y/n/edit]",
  ];

  return lines.join("\n");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}