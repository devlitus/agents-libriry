import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "./orchestrator.js";
import { NoOpConfirmationHandler } from "./confirmation.js";
import type { Agent, AgentContext, AgentResult, AgentName } from "../agents/types.js";
import type { LlmClient, LlmResponse } from "../llm/types.js";
import type { MemoryService, SessionHistoryEntry } from "../memory/types.js";
import type { ToolProvider } from "../agents/tool-provider.js";
import type { Indexer } from "../indexer/indexer.js";

// Fakes
class FakeLlmClient implements LlmClient {
  readonly provider = "fake";
  readonly model = "fake-model";
  async complete(prompt: string): Promise<string> {
    return '{"selectedAgents": ["architect", "coder"]}';
  }
}

class FakeMemoryService implements MemoryService {
  sessions: SessionHistoryEntry[] = [];
  async saveSession(session: Omit<SessionHistoryEntry, "id">): Promise<string> {
    const id = "fake-id";
    this.sessions.push({ ...session, id });
    return id;
  }
  async getRecentSessions(): Promise<SessionHistoryEntry[]> {
    return this.sessions;
  }
  async saveIndex(): Promise<void> {}
  async getIndex() { return null; }
  async saveAgentMemory(): Promise<void> {}
  async getAgentMemory() { return []; }
}

class FakeToolProvider implements ToolProvider {
  async readFile() { return { success: true, data: "" }; }
  async writeFile() { return { success: true }; }
  async listDirectory() { return { success: true, data: [] }; }
  async runCommand() { return { success: true, data: { stdout: "", stderr: "", exitCode: 0 } }; }
  async fileExists() { return { success: true, data: false }; }
}

class FakeIndexer implements Indexer {
  async index() {
    return { language: "typescript", framework: "none", conventions: null as any };
  }
}

class FakeConfirmationHandler extends NoOpConfirmationHandler {
  response: "yes" | "no" | "edit" = "yes";
  async confirmPlan(): Promise<"yes" | "no" | "edit"> {
    return this.response;
  }
}

class FakeAgent implements Agent {
  constructor(public readonly name: AgentName, public readonly success: boolean = true) {}
  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      agent: this.name,
      success: this.success,
      data: {},
      messages: [`${this.name} completed`]
    };
  }
}

function createOrchestrator(overrides: Partial<ConstructorParameters<typeof Orchestrator>[0]> = {}) {
  const memory = new FakeMemoryService();
  const confirmation = new FakeConfirmationHandler();
  
  const agents = new Map<AgentName, Agent>([
    ["architect", new FakeAgent("architect")],
    ["coder", new FakeAgent("coder")],
    ["tester", new FakeAgent("tester")],
    ["reviewer", new FakeAgent("reviewer")],
  ]);

  const orchestrator = new Orchestrator({
    config: { llm: { provider: "fake" }, team: { autoTest: true, autoReview: true, confirmPlan: true }, memory: { path: ":memory:", keepSessionHistory: 10 } },
    llm: new FakeLlmClient(),
    memory,
    tools: new FakeToolProvider(),
    indexer: new FakeIndexer(),
    confirmation,
    agents,
    ...overrides,
  });
  return { orchestrator, memory, confirmation, agents };
}

async function collectEvents(generator: AsyncGenerator<any, void, unknown>) {
  const events = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe("Orchestrator", () => {
  it("runs full flow with free prompt", async () => {
    // Arrange
    const { orchestrator, memory } = createOrchestrator();

    // Act
    const events = await collectEvents(orchestrator.run("create a REST endpoint"));

    // Assert
    expect(events.map(e => e.type)).toEqual([
      "indexing_start",
      "indexing_complete",
      "plan_ready",
      "plan_confirmed",
      "agent_start",
      "agent_progress",
      "agent_complete",
      "agent_start",
      "agent_progress",
      "agent_complete",
      "agent_start",
      "agent_progress",
      "agent_complete",
      "agent_start",
      "agent_progress",
      "agent_complete",
      "session_complete"
    ]);

    expect(memory.sessions.length).toBe(1);
    expect(memory.sessions[0].prompt).toBe("create a REST endpoint");
  });

  it("handles /plan command by only generating plan", async () => {
    // Arrange
    const { orchestrator, memory } = createOrchestrator();

    // Act
    const events = await collectEvents(orchestrator.run("/plan do something"));

    // Assert
    expect(events.map(e => e.type)).toEqual([
      "indexing_start",
      "indexing_complete",
      "plan_ready"
    ]);
    expect(memory.sessions.length).toBe(0); // No execution, no session saved
  });

  it("handles explicit agent command like /architect", async () => {
    // Arrange
    const { orchestrator } = createOrchestrator();

    // Act
    const events = await collectEvents(orchestrator.run("/architect do something"));

    // Assert
    const types = events.map(e => e.type);
    expect(types).toContain("plan_ready");
    expect(types).toContain("plan_confirmed");
    expect(events.filter(e => e.type === "agent_start")).toHaveLength(1);
    expect(events.find(e => e.type === "agent_start")?.agent).toBe("architect");
  });

  it("cancels execution if plan is rejected", async () => {
    // Arrange
    const { orchestrator, confirmation, memory } = createOrchestrator();
    confirmation.response = "no";

    // Act
    const events = await collectEvents(orchestrator.run("create a REST endpoint"));

    // Assert
    expect(events.map(e => e.type)).toContain("plan_rejected");
    expect(events.map(e => e.type)).not.toContain("plan_confirmed");
    expect(events.map(e => e.type)).not.toContain("agent_start");
    
    const completeEvent = events.find(e => e.type === "session_complete");
    expect(completeEvent?.success).toBe(false);
    expect(memory.sessions.length).toBe(0);
  });

  it("stops execution if an agent fails", async () => {
    // Arrange
    const agents = new Map<AgentName, Agent>([
      ["architect", new FakeAgent("architect", false)],
      ["coder", new FakeAgent("coder")],
    ]);
    const { orchestrator } = createOrchestrator({ agents });

    // Act
    const events = await collectEvents(orchestrator.run("create a REST endpoint"));

    // Assert
    expect(events.filter(e => e.type === "agent_start")).toHaveLength(1); // Only architect starts
    
    const completeEvent = events.find(e => e.type === "session_complete");
    expect(completeEvent?.success).toBe(false);
  });
});
