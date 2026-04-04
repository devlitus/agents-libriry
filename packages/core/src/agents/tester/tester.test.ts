import { describe, it, expect, vi } from "vitest";
import type { TesterOutput } from "./types.js";
import { TesterAgent } from "./tester.js";
import { generateTestCommand, validateTestPath } from "./test-command.js";
import { InvalidTestPathError } from "./invalid-path-error.js";
import type { AgentContext } from "../types.js";
import type { LlmClient } from "../../llm/types.js";
import type { MemoryService } from "../../memory/types.js";
import type { ToolProvider } from "../tool-provider.js";
import type { ConfirmationHandler } from "../orchestrator-types.js";
import type { DetectedProject } from "../../indexer/types.js";

describe("TesterOutput structure", () => {
  it("testFilesWritten includes path and content", () => {
    const output: TesterOutput = {
      testFilesWritten: [
        { path: "src/__tests__/api.test.ts", content: "describe('API', () => { it('works', () => {}); });" },
      ],
      testCommand: "npm test -- --testPathPattern=api",
      messages: ["Created test file"],
    };
    expect(output.testFilesWritten).toHaveLength(1);
    expect(output.testFilesWritten[0].path).toContain(".test.ts");
  });

  it("testResult includes passed flag and output", () => {
    const output: TesterOutput = {
      testFilesWritten: [],
      testCommand: "npm test",
      testResult: {
        passed: true,
        output: "PASS src/__tests__/api.test.ts",
      },
      messages: [],
    };
    expect(output.testResult?.passed).toBe(true);
    expect(output.testResult?.output).toContain("PASS");
  });

  it("testResult can be undefined before running", () => {
    const output: TesterOutput = {
      testFilesWritten: [{ path: "test.ts", content: "test" }],
      testCommand: "npm test",
      testResult: undefined,
      messages: ["Tests generated but not executed"],
    };
    expect(output.testResult).toBeUndefined();
  });
});

describe("generateTestCommand", () => {
  it("returns framework-specific test commands", () => {
    expect(generateTestCommand("jest", "foo.test.ts")).toBe("npm test -- --testPathPattern=foo.test.ts");
    expect(generateTestCommand("vitest", "foo.test.ts")).toBe("npx vitest run foo.test.ts");
    expect(generateTestCommand("pytest", "test_foo.py")).toBe("pytest test_foo.py");
    expect(generateTestCommand("cargo", "src/foo.rs")).toBe("cargo test src/foo.rs");
    expect(generateTestCommand("unknown", "foo.test.ts")).toBe("npm test -- foo.test.ts");
  });

  it("escapes semicolon in path for vitest", () => {
    expect(generateTestCommand("vitest", "foo;bar.test.ts")).toBe("npx vitest run foo\\;bar.test.ts");
  });

  it("escapes ampersand in path for jest", () => {
    expect(generateTestCommand("jest", "foo&bar.test.ts")).toBe("npm test -- --testPathPattern=foo\\&bar.test.ts");
  });

  it("escapes dollar sign in path for mocha", () => {
    expect(generateTestCommand("mocha", "foo$bar.test.ts")).toBe("npx mocha foo\\$bar.test.ts");
  });

  it("escapes backtick in path for pytest", () => {
    expect(generateTestCommand("pytest", "foo`bar`.py")).toBe("pytest foo\\`bar\\`.py");
  });

  it("returns unchanged command when path has no metacharacters", () => {
    expect(generateTestCommand("vitest", "foo.test.ts")).toBe("npx vitest run foo.test.ts");
    expect(generateTestCommand("jest", "api.test.ts")).toBe("npm test -- --testPathPattern=api.test.ts");
  });
});

describe("TesterAgent", () => {
  it("returns error result when no files to test are found", async () => {
    // Arrange
    const agent = new TesterAgent();
    const context = {
      prompt: "",
      sessionId: "123",
      previousResults: new Map(),
      memory: { getAgentMemory: vi.fn().mockReturnValue(null) } as unknown as MemoryService,
      llm: {} as LlmClient,
      tools: {} as ToolProvider,
      projectIndex: { testFramework: "jest", fileTree: [] } as unknown as DetectedProject,
      config: {}
    } as unknown as AgentContext;

    // Act
    const result = await agent.execute(context);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.messages[0]).toContain("No files to test found");
  });
  
  it("generates and writes tests and executes them when confirmed", async () => {
    // Arrange
    const mockConfirmation: ConfirmationHandler = {
      confirmPlan: vi.fn().mockResolvedValue("yes"),
      confirmFileWrite: vi.fn().mockResolvedValue("yes"),
      confirmCommand: vi.fn().mockResolvedValue("yes"),
    };

    const agent = new TesterAgent({ confirmation: mockConfirmation });
    
    const llmOutput = JSON.stringify({
      testFilesWritten: [{ path: "foo.test.ts", content: "test code" }],
      testCommand: "npm test",
      messages: ["done"]
    });

    const context = {
      prompt: "/tester foo.ts",
      sessionId: "123",
      previousResults: new Map(),
      memory: { setAgentMemory: vi.fn() } as unknown as MemoryService,
      llm: { complete: vi.fn().mockResolvedValue(llmOutput) } as unknown as LlmClient,
      tools: { 
        readFile: vi.fn().mockRejectedValue(new Error("Not found")), 
        writeFile: vi.fn().mockResolvedValue(undefined),
        runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "PASS", stderr: "" })
      } as unknown as ToolProvider,
      projectIndex: { testFramework: "vitest", conventions: {}, fileTree: [] } as unknown as DetectedProject,
      config: {}
    } as unknown as AgentContext;

    // Act
    const result = await agent.execute(context);
    
    // Assert
    expect(result.success).toBe(true);
    expect(context.tools.writeFile).toHaveBeenCalledWith("foo.test.ts", "test code");
    expect(context.tools.runCommand).toHaveBeenCalledWith("npx vitest run foo.test.ts");
    
    const data = result.data as TesterOutput;
    expect(data.testResult?.passed).toBe(true);
  });
});

describe("validateTestPath", () => {
  it("returns void when path has no shell metacharacters", () => {
    expect(() => validateTestPath("foo.test.ts")).not.toThrow();
    expect(() => validateTestPath("src/__tests__/api.test.ts")).not.toThrow();
    expect(() => validateTestPath("test-file.ts")).not.toThrow();
  });

  it("throws InvalidTestPathError when path contains semicolon", () => {
    expect(() => validateTestPath("foo;bar.test.ts")).toThrow(InvalidTestPathError);
    expect(() => validateTestPath("foo;bar.test.ts")).toThrow('Invalid test path "foo;bar.test.ts"');
  });

  it("throws InvalidTestPathError when path contains pipe", () => {
    expect(() => validateTestPath("foo|bar.test.ts")).toThrow(InvalidTestPathError);
    expect(() => validateTestPath("foo|bar.test.ts")).toThrow('Invalid test path "foo|bar.test.ts"');
  });

  it("throws InvalidTestPathError when path contains ampersand", () => {
    expect(() => validateTestPath("foo&bar.test.ts")).toThrow(InvalidTestPathError);
    expect(() => validateTestPath("foo&bar.test.ts")).toThrow('Invalid test path "foo&bar.test.ts"');
  });

  it("throws InvalidTestPathError when path contains backtick", () => {
    expect(() => validateTestPath("foo`bar`.test.ts")).toThrow(InvalidTestPathError);
    expect(() => validateTestPath("foo`bar`.test.ts")).toThrow('Invalid test path "foo`bar`.test.ts"');
  });

  it("throws InvalidTestPathError when path contains dollar sign", () => {
    expect(() => validateTestPath("foo$bar.test.ts")).toThrow(InvalidTestPathError);
    expect(() => validateTestPath("foo$bar.test.ts")).toThrow('Invalid test path "foo$bar.test.ts"');
  });

  it("throws InvalidTestPathError when path contains parentheses", () => {
    expect(() => validateTestPath("foo(bar).test.ts")).toThrow(InvalidTestPathError);
    expect(() => validateTestPath("foo(bar).test.ts")).toThrow('Invalid test path "foo(bar).test.ts"');
  });

  it("throws InvalidTestPathError when path contains backtick command substitution", () => {
    expect(() => validateTestPath("foo`ls`.test.ts")).toThrow(InvalidTestPathError);
  });

  it("throws InvalidTestPathError when path contains $() command substitution", () => {
    expect(() => validateTestPath("foo$(ls).test.ts")).toThrow(InvalidTestPathError);
  });
});