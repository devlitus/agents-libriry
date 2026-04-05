import { describe, it, expect } from "vitest";
import { McpConfirmationHandler } from "../confirmation-handler.js";
import { formatResult, formatEventAsText } from "../result-formatter.js";
import { Orchestrator } from "@devlitusp/core";
import type { OrchestratorEvent, ToolProvider } from "@devlitusp/core";

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
        filesToCreate: [{ path: "src/feature.ts", description: "feature" }],
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
          { path: "src/feature.ts", content: "export const feature = true;", isNew: true },
        ],
        messages: ["Created feature.ts"],
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

class MockToolProvider implements ToolProvider {
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

describe("MCP Transport Integration", () => {
  describe("3.3.2 — MCP + Core end-to-end", () => {
    it("produces valid MCP result when orchestrator completes", async () => {
      const mockTools = new MockToolProvider();

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
        confirmation: new McpConfirmationHandler(),
      });

      const events = await collectEvents(orchestrator.run("create a feature"));
      const result = formatResult("Done", events);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.isError).toBe(false);
    });

    it("formats events as readable MCP text", async () => {
      const events: OrchestratorEvent[] = [
        { type: "indexing_start" },
        { type: "indexing_complete" },
        { type: "agent_start", agent: "architect" },
        { type: "agent_complete", agent: "architect", result: { agent: "architect", success: true, data: {}, messages: [] } },
      ];

      const result = formatResult("Test", events);

      expect(result.content[0].text).toContain("Indexing project files");
      expect(result.content[0].text).toContain("architect starting");
    });

    it("MockToolProvider records file writes from Coder", async () => {
      const mockTools = new MockToolProvider();

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
        confirmation: new McpConfirmationHandler(),
      });

      await collectEvents(orchestrator.run("create a feature"));

      expect(mockTools.files.has("src/feature.ts")).toBe(true);
    });

    it("McpConfirmationHandler always approves for MCP context", async () => {
      const handler = new McpConfirmationHandler();

      const plan = {
        summary: "Test Plan",
        language: "typescript",
        contextFiles: [],
        steps: [{ agent: "architect" as const, action: "design" }],
      };

      const result = await handler.confirmPlan(plan);
      expect(result).toBe("yes");
    });

    it("formatEventAsText produces valid text for each event type", () => {
      const eventTests: Array<{ event: OrchestratorEvent; expected: string }> = [
        { event: { type: "indexing_start" }, expected: "Indexing project files..." },
        { event: { type: "indexing_complete" }, expected: "Indexing complete." },
        { event: { type: "plan_confirmed" }, expected: "Plan confirmed. Starting execution..." },
        { event: { type: "plan_rejected" }, expected: "Plan rejected." },
        { event: { type: "agent_start", agent: "architect" }, expected: "architect starting..." },
        { event: { type: "agent_progress", agent: "coder", message: "writing file" }, expected: "writing file" },
        { event: { type: "session_complete", success: true }, expected: "Session completed successfully!" },
        { event: { type: "session_complete", success: false }, expected: "Session completed with errors." },
        { event: { type: "error", message: "failed" }, expected: "Error: failed" },
      ];

      for (const { event, expected } of eventTests) {
        expect(formatEventAsText(event)).toBe(expected);
      }
    });

    it("produces events in correct order for full flow", async () => {
      const mockTools = new MockToolProvider();

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
        confirmation: new McpConfirmationHandler(),
      });

      const events = await collectEvents(orchestrator.run("create a feature"));

      const eventTypes = events.map((e) => e.type);

      expect(eventTypes[0]).toBe("indexing_start");
      expect(eventTypes[1]).toBe("indexing_complete");
      expect(eventTypes[2]).toBe("plan_ready");
      expect(eventTypes).toContain("agent_start");
      expect(eventTypes).toContain("agent_complete");
      expect(eventTypes[eventTypes.length - 1]).toBe("session_complete");
    });
  });
});
