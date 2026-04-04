import type { ConfirmationHandler, PlanDefinition, UserConfirmation } from "@devagents/core";

export class McpConfirmationHandler implements ConfirmationHandler {
  async confirmPlan(plan: PlanDefinition): Promise<UserConfirmation> {
    return "yes";
  }

  async confirmFileWrite(
    _path: string,
    _diff: string,
    _isNew: boolean
  ): Promise<UserConfirmation> {
    return "yes";
  }

  async confirmCommand(_command: string): Promise<UserConfirmation> {
    return "yes";
  }
}
