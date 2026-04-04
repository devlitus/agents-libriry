import type { ConfirmationHandler, UserConfirmation, PlanDefinition } from "../agents/orchestrator-types.js";

export class NoOpConfirmationHandler implements ConfirmationHandler {
  async confirmPlan(_plan: PlanDefinition): Promise<UserConfirmation> {
    return "yes";
  }

  async confirmFileWrite(_path: string, _diff: string, _isNew: boolean): Promise<UserConfirmation> {
    return "yes";
  }

  async confirmCommand(_command: string): Promise<UserConfirmation> {
    return "yes";
  }
}