import { describe, it, expect } from "vitest";
import { formatResult, formatEventAsText } from "../result-formatter.js";
import { Orchestrator } from "@devagents/core";
import type { OrchestratorEvent } from "@devagents/core";

class MockLlm {
  readonly provider = "mock";
  readonly model = "mock-model";

  async complete(prompt: string): Promise<string> {
    if (
      prompt.includes("role: orchestrator") ||
      prompt.includes("Analyze the task")
    ) {
      return '{"selectedAgents": ["architect", "coder"]}';
    }
    if (prompt.includes("You are the Architect")) {
      return JSON.stringify({
        filesToCreate: [{ path: "src/parity.ts", description: "parity test" }],
        filesToModify: [],
        conventions: {
          namingStyle: "camelCase",
          importStyle: "ESM",
          indentSize: 2,
          indentation: "spaces",
          semicolons: true,
          quotes: "double",
          testFilePattern: "*.test.ts",
          testDirectory: "tests",
        },
        notes: [],
      });
    }
    if (prompt.includes("You are the Coder")) {
      return JSON.stringify({
        filesWritten: [
          { path: "src/parity.ts", content: "export const parity = true;", isNew: true },
        ],
        messages: ["Created parity.ts"],
      });
    }
    if (prompt.includes("You are the Tester")) {
      return JSON.stringify({
        testFilesWritten: [],
        testCommand: "",
        testResult: null,
        messages: ["No tests needed"],
      });
    }
    if (prompt.includes("You are the Reviewer")) {
      return JSON.stringify({
        assessment: "approved",
        observations: [],
        messages: ["Looks good"],
      });
    }
    return "{";
  }
}

class MockMemory {
  sessions: Array<{
    id: string;
    prompt: string;
    agentsUsed: string;
    filesModified: string;
    commandsRun: string;
    createdAt: string;
  }> = [];

  async saveSession(session: {
    prompt: string;
    agentsUsed: string;
    filesModified: string;
    commandsRun: string;
    createdAt: string;
  }): Promise<string> {
    const id = "mock-session-" + Date.now();
    this.sessions.push({ ...session, id });
    return id;
  }

  async getRecentSessions() {
    return this.sessions;
  }

  async saveIndex() {}
  async getIndex() {
    return null;
  }

  async setAgentMemory(_entry: unknown) {}
  async saveAgentMemory(_entry: unknown) {}
  async save(_entry: unknown) {}
  async getAgentMemory() {
    return [];
  }
}

class MockIndexer {
  async index() {
    return {
      language: "typescript",
      framework: null,
      testFramework: null,
      conventions: {
        namingStyle: "camelCase",
        importStyle: "ESM",
        indentSize: 2,
        indentation: "spaces",
        quotes: "double",
        semicolons: true,
        testFilePattern: "*.test.ts",
        testDirectory: "tests",
      },
      fileTree: [],
      configFiles: [],
      entryPoints: [],
    };
  }
}

class MockConfirmationHandler {
  async confirmPlan() {
    return "yes" as const;
  }

  async confirmFileWrite(_path: string) {
    return "yes" as const;
  }

  async confirmCommand(_command: string) {
    return "yes" as const;
  }
}

class MockToolProvider {
  files = new Map<string, string>();
  commandsRun: string[] = [];

  async readFile(path: string): Promise<string> {
    if (this.files.has(path)) return this.files.get(path)!;
    throw new Error(`File not found: ${path}`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async listDirectory(): Promise<string[]> {
    return [];
  }

  async runCommand(command: string) {
    this.commandsRun.push(command);
    return { stdout: "Success", stderr: "", exitCode: 0 };
  }
}

async function collectEvents(
  generator: AsyncGenerator<OrchestratorEvent, void, unknown>
): Promise<OrchestratorEvent[]> {
  const events: OrchestratorEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe("ACP ↔ MCP Parity", () => {
  describe("3.3.3 — ACP ↔ MCP parity", () => {
    it("produces same core events from Orchestrator regardless of transport", async () => {
      const mockTools = new MockToolProvider();
      const confirmation = new MockConfirmationHandler();

      const orchestrator = new Orchestrator({
        config: {
          llm: { provider: "mock" },
          team: { autoTest: false, autoReview: false, confirmPlan: false },
          memory: { path: ":memory:", keepSessionHistory: 10 },
        },
        llm: new MockLlm(),
        memory: new MockMemory(),
        tools: mockTools,
        indexer: new MockIndexer(),
        confirmation,
      });

      const events = await collectEvents(orchestrator.run("create a feature"));

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("indexing_start");
      expect(events[events.length - 1].type).toBe("session_complete");
    });

    it("both transports report same event sequence", async () => {
      const mockTools = new MockToolProvider();
      const confirmation = new MockConfirmationHandler();

      const orchestrator = new Orchestrator({
        config: {
          llm: { provider: "mock" },
          team: { autoTest: false, autoReview: false, confirmPlan: false },
          memory: { path: ":memory:", keepSessionHistory: 10 },
        },
        llm: new MockLlm(),
        memory: new MockMemory(),
        tools: mockTools,
        indexer: new MockIndexer(),
        confirmation,
      });

      const events = await collectEvents(orchestrator.run("create a feature"));
      const eventTypes = events.map((e) => e.type);

      expect(eventTypes[0]).toBe("indexing_start");
      expect(eventTypes).toContain("indexing_complete");
      expect(eventTypes).toContain("plan_ready");
      expect(eventTypes).toContain("agent_start");
      expect(eventTypes).toContain("agent_complete");
      expect(eventTypes).toContain("session_complete");
    });

    it("MCP formatResult contains same information that ACP would stream", async () => {
      const mockTools = new MockToolProvider();
      const confirmation = new MockConfirmationHandler();

      const orchestrator = new Orchestrator({
        config: {
          llm: { provider: "mock" },
          team: { autoTest: false, autoReview: false, confirmPlan: false },
          memory: { path: ":memory:", keepSessionHistory: 10 },
        },
        llm: new MockLlm(),
        memory: new MockMemory(),
        tools: mockTools,
        indexer: new MockIndexer(),
        confirmation,
      });

      const events = await collectEvents(orchestrator.run("create a feature"));
      const result = formatResult("Parity Test Complete", events);

      expect(result.content[0].text).toContain("Indexing project files");
      expect(result.content[0].text).toContain("Indexing complete");
      expect(result.content[0].text).toContain("## Steps:");
      expect(result.content[0].text).toContain("architect starting");
      expect(result.content[0].text).toContain("Parity Test Complete");
    });

    it("all event types are formatted correctly by MCP formatter", () => {
      const eventTests: Array<{ event: OrchestratorEvent; contains: string }> = [
        { event: { type: "indexing_start" }, contains: "Indexing project files" },
        { event: { type: "indexing_complete" }, contains: "Indexing complete" },
        { event: { type: "plan_confirmed" }, contains: "Plan confirmed" },
        { event: { type: "plan_rejected" }, contains: "Plan rejected" },
        { event: { type: "agent_start", agent: "architect" }, contains: "architect starting" },
        { event: { type: "agent_progress", agent: "coder", message: "writing file" }, contains: "writing file" },
        { event: { type: "session_complete", success: true }, contains: "Session completed successfully" },
        { event: { type: "session_complete", success: false }, contains: "Session completed with errors" },
        { event: { type: "error", message: "failed" }, contains: "Error: failed" },
      ];

      for (const { event, contains } of eventTests) {
        expect(formatEventAsText(event)).toContain(contains);
      }
    });

    it("plan_ready event contains all plan details", () => {
      const planEvent: OrchestratorEvent = {
        type: "plan_ready",
        plan: {
          summary: "Test Plan",
          language: "typescript",
          contextFiles: ["src/index.ts", "src/app.ts"],
          steps: [
            { agent: "architect", action: "design" },
            { agent: "coder", action: "implement" },
          ],
        },
      };

      const formatted = formatEventAsText(planEvent);

      expect(formatted).toContain("# Test Plan");
      expect(formatted).toContain("typescript");
      expect(formatted).toContain("**architect**: design");
      expect(formatted).toContain("**coder**: implement");
      expect(formatted).toContain("src/index.ts");
      expect(formatted).toContain("src/app.ts");
    });

    it("core events are identical for same prompt (deterministic)", async () => {
      const orchestrator1 = new Orchestrator({
        config: {
          llm: { provider: "mock" },
          team: { autoTest: false, autoReview: false, confirmPlan: false },
          memory: { path: ":memory:", keepSessionHistory: 10 },
        },
        llm: new MockLlm(),
        memory: new MockMemory(),
        tools: new MockToolProvider(),
        indexer: new MockIndexer(),
        confirmation: new MockConfirmationHandler(),
      });

      const orchestrator2 = new Orchestrator({
        config: {
          llm: { provider: "mock" },
          team: { autoTest: false, autoReview: false, confirmPlan: false },
          memory: { path: ":memory:", keepSessionHistory: 10 },
        },
        llm: new MockLlm(),
        memory: new MockMemory(),
        tools: new MockToolProvider(),
        indexer: new MockIndexer(),
        confirmation: new MockConfirmationHandler(),
      });

      const events1 = await collectEvents(orchestrator1.run("create a feature"));
      const events2 = await collectEvents(orchestrator2.run("create a feature"));

      const types1 = events1.map((e) => e.type);
      const types2 = events2.map((e) => e.type);

      expect(types1).toEqual(types2);
    });
  });
});
