import { describe, it, expect, vi, beforeEach } from "vitest";
import { Orchestrator } from "./orchestrator.js";
import { NoOpConfirmationHandler } from "./confirmation.js";
import { ArchitectAgent, CoderAgent, TesterAgent, ReviewerAgent } from "../agents/index.js";
import type { Agent, AgentContext, AgentResult, AgentName } from "../agents/types.js";
import type { LlmClient, LlmResponse } from "../llm/types.js";
import type { MemoryService, SessionHistoryEntry } from "../memory/types.js";
import type { ToolProvider } from "../agents/tool-provider.js";
import type { Indexer } from "../indexer/indexer.js";

// Mock LLM Client that responds appropriately to each agent's prompts
class MockIntegrationLlm implements LlmClient {
  readonly provider = "mock";
  readonly model = "mock-model";
  
  async complete(prompt: string): Promise<string> {
    if (prompt.includes("role: orchestrator") || prompt.includes("Analyze the task and determine what files need to be created or modified")) {
      return '{"selectedAgents": ["architect", "coder", "tester", "reviewer"]}';
    }
    if (prompt.includes("You are the Architect")) {
      return JSON.stringify({
          filesToCreate: [{ path: "src/new.ts", description: "new file" }],
          filesToModify: [],
          conventions: { namingStyle: "camelCase", importStyle: "ESM", indentSize: 2, indentation: "spaces", semicolons: true, quotes: "double", testFilePattern: "*.test.ts", testDirectory: "tests" },
          notes: []
        });
    }
    if (prompt.includes("You are the Coder")) {
      return JSON.stringify({
          filesWritten: [{ path: "src/new.ts", content: "console.log('new');", isNew: true }],
          messages: ["Coder did work"]
        });
    }
    if (prompt.includes("You are the Tester")) {
      return JSON.stringify({
          testFilesWritten: [{ path: "tests/new.test.ts", content: "test('new', () => {});" }],
          testCommand: "npm test",
          testResult: { passed: true, output: "Success" },
          messages: ["Tester did work"]
        });
    }
    if (prompt.includes("You are the Reviewer")) {
      return JSON.stringify({
          assessment: "approved",
          observations: [],
          messages: ["Reviewer did work"]
        });
    }
    
    // Default fallback
    return "{";
  }
}

class MockIntegrationMemory implements MemoryService {
  sessions: SessionHistoryEntry[] = [];
  agentMemories: any[] = [];
  
  async saveSession(session: Omit<SessionHistoryEntry, "id">): Promise<string> {
    const id = "mock-session-id";
    this.sessions.push({ ...session, id });
    return id;
  }
  async getRecentSessions() { return this.sessions; }
  async saveIndex() {}
  async getIndex() { return null; }
  
  async setAgentMemory(entry: any) { this.agentMemories.push(entry); }
  async saveAgentMemory(entry: any) { this.agentMemories.push(entry); }
  async save(entry: any) { this.agentMemories.push(entry); }
  async getAgentMemory() { return []; }
}

class MockIntegrationTools implements ToolProvider {
  files = new Map<string, string>();
  commandsRun: string[] = [];

  async readFile(path: string) {
    if (this.files.has(path)) return this.files.get(path)!;
    throw new Error(`File not found: ${path}`);
  }
  async writeFile(path: string, content: string) {
    this.files.set(path, content);
  }
  async listDirectory() { return []; }
  async runCommand(command: string) {
    this.commandsRun.push(command);
    return { stdout: "Success", stderr: "", exitCode: 0 };
  }
  async fileExists(path: string) { return this.files.has(path); }
}

class MockIntegrationIndexer implements Indexer {
  async index() {
    return { language: "typescript", framework: "none", conventions: { namingStyle: "camelCase", importStyle: "ESM", indentSize: 2, indentation: "spaces", quotes: "double", semicolons: true, testFilePattern: "*.test.ts", testDirectory: "tests" }, fileTree: [] };
  }
}

class TrackedConfirmationHandler implements NoOpConfirmationHandler {
  planConfirmed = false;
  filesConfirmed: string[] = [];
  commandsConfirmed: string[] = [];
  
  async confirmPlan() {
    this.planConfirmed = true;
    return "yes" as const;
  }
  async confirmFileWrite(path: string) {
    this.filesConfirmed.push(path);
    return "yes" as const;
  }
  async confirmCommand(command: string) {
    this.commandsConfirmed.push(command);
    return "yes" as const;
  }
}

async function collectEvents(generator: AsyncGenerator<any, void, unknown>) {
  const events = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe("Orchestrator Integration", () => {
  it("executes full flow: prompt -> Architect -> Coder -> Tester -> Reviewer", async () => {
    // Arrange
    const memory = new MockIntegrationMemory();
    const tools = new MockIntegrationTools();
    const confirmation = new TrackedConfirmationHandler();
    
    // We use the REAL agents, but inject our mocked dependencies!
    const agents = new Map<AgentName, Agent>([
      ["architect", new ArchitectAgent()],
      ["coder", new CoderAgent({ confirmation })],
      ["tester", new TesterAgent({ confirmation })],
      ["reviewer", new ReviewerAgent()],
    ]);

    const orchestrator = new Orchestrator({
      config: { 
        llm: { provider: "mock" }, 
        team: { autoTest: true, autoReview: true, confirmPlan: true }, 
        memory: { path: ":memory:", keepSessionHistory: 10 } 
      },
      llm: new MockIntegrationLlm(),
      memory,
      tools,
      indexer: new MockIntegrationIndexer(),
      confirmation,
      agents
    });

    // Act
    const prompt = "create a REST endpoint";
    const events = await collectEvents(orchestrator.run(prompt));

    // Assert
    // 1. Verify flow progression
    const agentStartEvents = events.filter(e => e.type === "agent_start").map(e => e.agent);
    expect(agentStartEvents).toEqual(["architect", "coder", "tester", "reviewer"]);

    const completeEvent = events.find(e => e.type === "session_complete");
    expect(completeEvent?.success).toBe(true);

    // 2. Verify data flows
    // Coder should have written src/new.ts
    expect(tools.files.has("src/new.ts")).toBe(true);
    // Tester should have written tests/new.test.ts
    expect(tools.files.has("tests/new.test.ts")).toBe(true);
    // Tools should have run commands
    expect(tools.commandsRun).toContain("npm test -- tests/new.test.ts");

    // 3. Verify session is saved at end
    expect(memory.sessions.length).toBe(1);
    expect(memory.sessions[0].prompt).toBe(prompt);
    
    // Agents used should be recorded
    const agentsUsed = JSON.parse(memory.sessions[0].agentsUsed);
    expect(agentsUsed).toEqual(["architect", "coder", "tester", "reviewer"]);

    // 4. Verify confirmations requested at correct points
    expect(confirmation.planConfirmed).toBe(true);
    expect(confirmation.filesConfirmed).toContain("src/new.ts");
    expect(confirmation.filesConfirmed).toContain("tests/new.test.ts");
    expect(confirmation.commandsConfirmed).toContain("npm test -- tests/new.test.ts");
  });
});
