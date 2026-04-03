import { describe, it, expect, vi } from "vitest";
import type { Agent, AgentContext, AgentResult, AgentName } from "./types.js";
import type { LlmClient, CompletionOptions } from "../llm/types.js";
import type { MemoryService } from "../memory/types.js";
import type { DetectedProject } from "../indexer/types.js";
import type { DevAgentsConfig } from "../types.js";
import type { ToolProvider } from "./tool-provider.js";

class FakeLlmClient implements LlmClient {
  async complete(_prompt: string): Promise<string> {
    return "fake response";
  }
  async *_stream(_prompt: string): AsyncIterable<string> {
    yield "chunk";
  }
}

class FakeMemoryService implements MemoryService {
  init(): void {}
  getProjectIndex(): ReturnType<MemoryService["getProjectIndex"]> {
    return null;
  }
  saveProjectIndex(): void {}
  getAgentMemory(): ReturnType<MemoryService["getAgentMemory"]> {
    return null;
  }
  setAgentMemory(): void {}
  getAgentMemoryBySession(): ReturnType<MemoryService["getAgentMemoryBySession"]> {
    return [];
  }
  clearSessionMemory(): void {}
  getRecentSessions(): ReturnType<MemoryService["getRecentSessions"]> {
    return [];
  }
  saveSession(): void {}
  pruneOldSessions(): void {}
}

class FakeToolProvider implements ToolProvider {
  async readFile(_path: string): Promise<string> {
    return "";
  }
  async writeFile(_path: string, _content: string): Promise<void> {}
  async listDirectory(_path: string): Promise<string[]> {
    return [];
  }
  async runCommand(_cmd: string) {
    return { exitCode: 0, stdout: "", stderr: "" };
  }
}

function createFakeContext(): AgentContext {
  return {
    sessionId: "test-session",
    prompt: "test prompt",
    projectIndex: {
      language: "typescript",
      framework: "express",
      testFramework: "jest",
      conventions: {
        namingStyle: "camelCase",
        testFilePattern: "*.test.ts",
        testDirectory: "__tests__",
        importStyle: "named",
        indentation: "spaces",
        indentSize: 2,
        semicolons: true,
        quotes: "single",
      },
      fileTree: [],
      configFiles: [],
      entryPoints: [],
    },
    previousResults: new Map(),
    config: {},
    llm: new FakeLlmClient(),
    memory: new FakeMemoryService(),
    tools: new FakeToolProvider(),
  };
}

describe("Agent interface contract", () => {
  it("execute returns Promise<AgentResult>", async () => {
    const context = createFakeContext();
    const result = await context.llm.complete("test");
    expect(result).toBe("fake response");
  });

  it("AgentResult has correct structure", () => {
    const result: AgentResult = {
      agent: "architect",
      success: true,
      data: { plan: "test" },
      messages: ["step 1"],
    };
    expect(result.agent).toBe("architect");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ plan: "test" });
    expect(result.messages).toHaveLength(1);
  });

  it("AgentResult with error has correct structure", () => {
    const result: AgentResult = {
      agent: "coder",
      success: false,
      data: undefined,
      messages: ["failed to write file"],
    };
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });

  it("AgentName is union of valid agent names", () => {
    const names: AgentName[] = ["orchestrator", "architect", "coder", "tester", "reviewer"];
    expect(names).toHaveLength(5);
  });

  it("AgentContext contains all required fields", () => {
    const ctx = createFakeContext();
    expect(ctx.sessionId).toBeDefined();
    expect(ctx.prompt).toBeDefined();
    expect(ctx.projectIndex).toBeDefined();
    expect(ctx.previousResults).toBeInstanceOf(Map);
    expect(ctx.config).toBeDefined();
    expect(ctx.llm).toBeDefined();
    expect(ctx.memory).toBeDefined();
    expect(ctx.tools).toBeDefined();
  });
});