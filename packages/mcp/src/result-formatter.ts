import type { OrchestratorEvent, PlanDefinition } from "@devlitusp/core";

export interface McpToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export function formatEventAsText(event: OrchestratorEvent): string {
  switch (event.type) {
    case "indexing_start":
      return "Indexing project files...";
    case "indexing_complete":
      return "Indexing complete.";
    case "plan_ready":
      return formatPlanAsText(event.plan);
    case "plan_confirmed":
      return "Plan confirmed. Starting execution...";
    case "plan_rejected":
      return "Plan rejected.";
    case "agent_start":
      return `${event.agent} starting...`;
    case "agent_progress":
      return event.message;
    case "agent_complete":
      return `${event.agent} completed.`;
    case "confirm_file":
      return `File write: ${event.path}\n\`\`\`\n${event.diff}\n\`\`\``;
    case "confirm_command":
      return `Command: ${event.command}`;
    case "session_complete":
      return event.success
        ? "Session completed successfully!"
        : "Session completed with errors.";
    case "error":
      return `Error: ${event.message}`;
  }
}

export function formatPlanAsText(plan: PlanDefinition): string {
  const lines: string[] = [
    `# ${plan.summary}`,
    `Language: ${plan.language}`,
    "",
    "## Steps:",
  ];

  for (const step of plan.steps) {
    lines.push(`- **${step.agent}**: ${step.action}`);
  }

  if (plan.contextFiles.length > 0) {
    lines.push("", "## Context files:");
    for (const file of plan.contextFiles) {
      lines.push(`- ${file}`);
    }
  }

  return lines.join("\n");
}

export function formatResult(
  summary: string,
  events: OrchestratorEvent[]
): McpToolResult {
  const lines: string[] = [summary, "", "---", ""];

  for (const event of events) {
    const text = formatEventAsText(event);
    lines.push(text);
  }

  return {
    content: [
      {
        type: "text",
        text: lines.join("\n"),
      },
    ],
    isError: false,
  };
}
