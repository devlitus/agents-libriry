import type { AgentSideConnection } from "@agentclientprotocol/sdk";
import type {
  ConfirmationHandler,
  PlanDefinition,
  UserConfirmation,
} from "@devagents/core";

export interface AcpConfirmationHandlerDeps {
  connection: AgentSideConnection;
  sessionId: string;
}

/**
 * ConfirmationHandler implementation for ACP transport.
 * Uses connection.requestPermission() to get user confirmation via IDE.
 */
export class AcpConfirmationHandler implements ConfirmationHandler {
  private readonly connection: AgentSideConnection;
  private readonly sessionId: string;

  constructor(deps: AcpConfirmationHandlerDeps) {
    this.connection = deps.connection;
    this.sessionId = deps.sessionId;
  }

  async confirmPlan(plan: PlanDefinition): Promise<UserConfirmation> {
    const planText = this.formatPlan(plan);

    const response = await this.connection.requestPermission({
      sessionId: this.sessionId,
      toolCall: {
        toolCallId: "confirm_plan",
        title: "Execution Plan",
        kind: "read",
        status: "pending",
        locations: [],
        rawInput: { plan: planText },
      },
      options: [
        {
          kind: "allow_once",
          name: "Approve plan",
          optionId: "yes",
        },
        {
          kind: "reject_once",
          name: "Reject plan",
          optionId: "no",
        },
      ],
    });

    return this.mapOutcome(response);
  }

  async confirmFileWrite(
    path: string,
    diff: string,
    isNew: boolean
  ): Promise<UserConfirmation> {
    const title = isNew ? `Create new file: ${path}` : `Modify file: ${path}`;

    const response = await this.connection.requestPermission({
      sessionId: this.sessionId,
      toolCall: {
        toolCallId: `confirm_file_${path}`,
        title,
        kind: "edit",
        status: "pending",
        locations: [{ path }],
        rawInput: { path, content: diff },
      },
      options: [
        {
          kind: "allow_once",
          name: "Write file",
          optionId: "yes",
        },
        {
          kind: "reject_once",
          name: "Skip file",
          optionId: "no",
        },
        {
          kind: "reject_once",
          name: "Edit first",
          optionId: "edit",
        },
      ],
    });

    return this.mapOutcome(response);
  }

  async confirmCommand(command: string): Promise<UserConfirmation> {
    const response = await this.connection.requestPermission({
      sessionId: this.sessionId,
      toolCall: {
        toolCallId: `confirm_cmd_${Date.now()}`,
        title: "Run terminal command",
        kind: "edit",
        status: "pending",
        locations: [],
        rawInput: { command },
      },
      options: [
        {
          kind: "allow_once",
          name: "Execute",
          optionId: "yes",
        },
        {
          kind: "reject_once",
          name: "Cancel",
          optionId: "no",
        },
      ],
    });

    return this.mapOutcome(response);
  }

  private formatPlan(plan: PlanDefinition): string {
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

  private mapOutcome(
    response: { outcome: { outcome: string; optionId?: string } } | undefined
  ): UserConfirmation {
    if (!response?.outcome) {
      return "no";
    }

    const { outcome, optionId } = response.outcome;

    if (outcome === "cancelled") {
      return "no";
    }

    if (optionId === "yes") {
      return "yes";
    }

    if (optionId === "edit") {
      return "edit";
    }

    return "no";
  }
}
