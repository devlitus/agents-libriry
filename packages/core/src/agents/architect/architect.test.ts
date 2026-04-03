import { describe, it, expect } from "vitest";
import type { ArchitectPlan } from "./types.js";
import { ArchitectAgent } from "./architect.js";
import type { AgentContext, AgentResult } from "../types.js";
import type { DetectedProject, ProjectConventions } from "../../indexer/types.js";
import type { ToolProvider, CommandResult } from "../tool-provider.js";
import type { LlmClient } from "../../llm/types.js";
import type { MemoryService, AgentMemoryEntry, SessionHistoryEntry, ProjectIndex } from "../../memory/types.js";

const dummyConventions: ProjectConventions = {
  namingStyle: "camelCase",
  testFilePattern: "*.test.ts",
  testDirectory: "__tests__",
  importStyle: "named",
  indentation: "spaces",
  indentSize: 2,
  semicolons: true,
  quotes: "single",
};

const dummyProjectIndex: DetectedProject = {
  language: "typescript",
  framework: null,
  testFramework: null,
  conventions: dummyConventions,
  fileTree: [{ path: "src/index.ts", type: "file" }],
  configFiles: [],
  entryPoints: [],
};

class FakeLlmClient implements LlmClient {
  constructor(public nextResponse: string) {}
  async complete(_prompt: string): Promise<string> {
    return this.nextResponse;
  }
  async *stream(_prompt: string): AsyncIterable<string> {
    yield this.nextResponse;
  }
}

class FakeMemoryService implements MemoryService {
  private readonly memories = new Map<string, any>();
  
  init(): void {}
  getProjectIndex(): ProjectIndex | null { return null; }
  saveProjectIndex(): void {}
  
  getAgentMemory(_sessionId: string, key: string): AgentMemoryEntry | null {
    return this.memories.get(key) || null;
  }
  
  setAgentMemory(entry: Omit<AgentMemoryEntry, "id">): void {
    this.memories.set(entry.key, { ...entry, id: "1" });
  }
  
  getAgentMemoryBySession(): AgentMemoryEntry[] { return []; }
  clearSessionMemory(): void {}
  getRecentSessions(): SessionHistoryEntry[] { return []; }
  saveSession(): void {}
  pruneOldSessions(): void {}

  getSavedPlan(key: string) {
    return this.memories.get(key);
  }
}

class FakeToolProvider implements ToolProvider {
  async readFile(_path: string): Promise<string> {
    return "file content";
  }
  async writeFile(): Promise<void> {}
  async listDirectory(): Promise<string[]> { return []; }
  async runCommand(): Promise<CommandResult> { return { exitCode: 0, stdout: "", stderr: "" }; }
}

describe("ArchitectPlan structure", () => {
  it("filesToCreate is array of file objects", () => {
    const plan: ArchitectPlan = {
      filesToCreate: [
        { path: "src/api/users.ts", description: "User API routes" },
        { path: "src/models/user.ts", description: "User model" },
      ],
      filesToModify: [],
      conventions: dummyConventions,
      notes: ["Use dependency injection"],
    };
    expect(plan.filesToCreate).toHaveLength(2);
    expect(plan.filesToCreate[0].path).toBe("src/api/users.ts");
  });

  it("filesToModify includes currentContent and change", () => {
    const plan: ArchitectPlan = {
      filesToCreate: [],
      filesToModify: [
        {
          path: "src/index.ts",
          currentContent: "const app = express();",
          change: "Add CORS middleware",
        },
      ],
      conventions: dummyConventions,
      notes: [],
    };
    expect(plan.filesToModify[0].currentContent).toBeDefined();
    expect(plan.filesToModify[0].change).toBeDefined();
  });

  it("conventions includes all required fields", () => {
    expect(dummyConventions.namingStyle).toBe("camelCase");
    expect(dummyConventions.importStyle).toBe("named");
    expect(dummyConventions.semicolons).toBe(true);
  });

  it("notes is optional array", () => {
    const plan: ArchitectPlan = {
      filesToCreate: [{ path: "test.ts", description: "test" }],
      filesToModify: [],
      conventions: dummyConventions,
      notes: [],
    };
    expect(Array.isArray(plan.notes)).toBe(true);
  });
});

describe("ArchitectAgent", () => {
  it("executes successfully and returns parsed plan", async () => {
    // Arrange
    const validJson = JSON.stringify({
      filesToCreate: [{ path: "src/new.ts", description: "new file" }],
      filesToModify: [],
      conventions: dummyConventions,
      notes: []
    });
    const llm = new FakeLlmClient(validJson);
    const memory = new FakeMemoryService();
    const tools = new FakeToolProvider();
    
    const context: AgentContext = {
      sessionId: "session-123",
      prompt: "Create a new file",
      projectIndex: dummyProjectIndex,
      previousResults: new Map(),
      config: {},
      llm,
      memory,
      tools
    };
    
    const agent = new ArchitectAgent();

    // Act
    const result = await agent.execute(context);

    // Assert
    expect(result.success).toBe(true);
    expect(result.agent).toBe("architect");
    
    const plan = result.data as ArchitectPlan;
    expect(plan.filesToCreate).toHaveLength(1);
    expect(plan.filesToCreate[0].path).toBe("src/new.ts");
    
    const savedPlan = memory.getSavedPlan("last_architect_plan");
    expect(savedPlan).toBeDefined();
    expect(JSON.parse(savedPlan.value)).toEqual(plan);
  });

  it("returns failure when LLM returns invalid JSON", async () => {
    // Arrange
    const invalidJson = "this is not json";
    const llm = new FakeLlmClient(invalidJson);
    const memory = new FakeMemoryService();
    const tools = new FakeToolProvider();
    
    const context: AgentContext = {
      sessionId: "session-123",
      prompt: "Create a new file",
      projectIndex: dummyProjectIndex,
      previousResults: new Map(),
      config: {},
      llm,
      memory,
      tools
    };
    
    const agent = new ArchitectAgent();

    // Act
    const result = await agent.execute(context);

    // Assert
    expect(result.success).toBe(false);
    expect(result.messages[0]).toMatch(/No JSON found in response|Failed to parse/);
  });
});
