import { describe, it, expect } from "vitest";
import type { OrchestratorEvent, PlanDefinition, ConfirmationHandler, UserConfirmation } from "./orchestrator-types.js";
import type { AgentName } from "./types.js";

describe("OrchestratorEvent discriminated union", () => {
  it("indexing_start has correct type", () => {
    const event: OrchestratorEvent = { type: "indexing_start" };
    expect(event.type).toBe("indexing_start");
  });

  it("indexing_complete has correct type", () => {
    const event: OrchestratorEvent = { type: "indexing_complete" };
    expect(event.type).toBe("indexing_complete");
  });

  it("plan_ready includes plan data", () => {
    const plan: PlanDefinition = {
      summary: "create API",
      language: "typescript",
      contextFiles: ["src/index.ts"],
      steps: [{ agent: "architect", action: "create plan" }],
    };
    const event: OrchestratorEvent = { type: "plan_ready", plan };
    expect(event.type).toBe("plan_ready");
    expect(event.plan).toBeDefined();
    expect(event.plan.summary).toBe("create API");
  });

  it("plan_confirmed has correct type", () => {
    const event: OrchestratorEvent = { type: "plan_confirmed" };
    expect(event.type).toBe("plan_confirmed");
  });

  it("plan_rejected has correct type", () => {
    const event: OrchestratorEvent = { type: "plan_rejected" };
    expect(event.type).toBe("plan_rejected");
  });

  it("agent_start includes agent name", () => {
    const event: OrchestratorEvent = { type: "agent_start", agent: "architect" };
    expect(event.type).toBe("agent_start");
    expect(event.agent).toBe("architect");
  });

  it("agent_progress includes agent and message", () => {
    const event: OrchestratorEvent = { type: "agent_progress", agent: "coder", message: "writing file" };
    expect(event.agent).toBe("coder");
    expect(event.message).toBe("writing file");
  });

  it("agent_complete includes agent and result", () => {
    const event: OrchestratorEvent = {
      type: "agent_complete",
      agent: "tester",
      result: { agent: "tester", success: true, data: {}, messages: [] },
    };
    expect(event.agent).toBe("tester");
    expect(event.result.success).toBe(true);
  });

  it("confirm_file includes path and diff", () => {
    const event: OrchestratorEvent = {
      type: "confirm_file",
      path: "src/api.ts",
      diff: "+ new line",
    };
    expect(event.type).toBe("confirm_file");
    expect(event.path).toBe("src/api.ts");
    expect(event.diff).toBeDefined();
  });

  it("confirm_command includes command", () => {
    const event: OrchestratorEvent = {
      type: "confirm_command",
      command: "npm install zod",
    };
    expect(event.command).toBe("npm install zod");
  });

  it("session_complete includes success flag", () => {
    const event: OrchestratorEvent = { type: "session_complete", success: true };
    expect(event.success).toBe(true);
  });

  it("error includes message", () => {
    const event: OrchestratorEvent = { type: "error", message: "something went wrong" };
    expect(event.message).toBe("something went wrong");
  });
});

describe("PlanDefinition structure", () => {
  it("has required fields", () => {
    const plan: PlanDefinition = {
      summary: "build REST API",
      language: "typescript",
      contextFiles: ["package.json"],
      steps: [
        { agent: "architect", action: "design endpoints" },
        { agent: "coder", action: "implement routes" },
      ],
    };
    expect(plan.summary).toBeDefined();
    expect(plan.language).toBeDefined();
    expect(plan.contextFiles).toBeInstanceOf(Array);
    expect(plan.steps).toBeInstanceOf(Array);
  });

  it("steps reference valid agent names", () => {
    const plan: PlanDefinition = {
      summary: "test",
      language: "typescript",
      contextFiles: [],
      steps: [
        { agent: "architect" as AgentName, action: "plan" },
        { agent: "coder" as AgentName, action: "code" },
        { agent: "tester" as AgentName, action: "test" },
        { agent: "reviewer" as AgentName, action: "review" },
      ],
    };
    expect(plan.steps[0].agent).toBe("architect");
    expect(plan.steps[3].agent).toBe("reviewer");
  });
});

describe("ConfirmationHandler interface", () => {
  it("UserConfirmation is union of yes|no|edit", () => {
    const confirmations: UserConfirmation[] = ["yes", "no", "edit"];
    expect(confirmations).toHaveLength(3);
  });
});