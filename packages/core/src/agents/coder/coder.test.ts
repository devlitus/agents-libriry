import { describe, it, expect, vi } from "vitest";
import type { CoderOutput } from "./types.js";
import { CoderAgent } from "./coder.js";
import type { AgentContext } from "../types.js";
import type { ToolProvider } from "../tool-provider.js";
import type { LlmClient } from "../../llm/types.js";
import type { MemoryService } from "../../memory/types.js";

describe("CoderOutput structure", () => {
  it("filesWritten includes path, content and isNew", () => {
    const output: CoderOutput = {
      filesWritten: [
        { path: "src/api.ts", content: "export const api = () => {}", isNew: true },
        { path: "src/index.ts", content: "import { api } from './api'", isNew: false },
      ],
      dependenciesInstalled: [],
      messages: ["Created src/api.ts"],
    };
    expect(output.filesWritten).toHaveLength(2);
    expect(output.filesWritten[0].isNew).toBe(true);
    expect(output.filesWritten[1].isNew).toBe(false);
  });

  it("dependenciesInstalled lists npm packages", () => {
    const output: CoderOutput = {
      filesWritten: [],
      dependenciesInstalled: ["zod", "express"],
      messages: [],
    };
    expect(output.dependenciesInstalled).toContain("zod");
  });

  it("messages is array of strings", () => {
    const output: CoderOutput = {
      filesWritten: [],
      dependenciesInstalled: [],
      messages: ["File created", "Dependency installed"],
    };
    expect(output.messages[0]).toBeTypeOf("string");
  });
});

describe("CoderAgent", () => {
  it("executes standalone when no plan is present", async () => {
    const fakeLlm: LlmClient = {
      complete: vi.fn().mockResolvedValueOnce(
        JSON.stringify({
          filesToCreate: [],
          filesToModify: [],
          conventions: {
            namingStyle: "camelCase",
            importStyle: "named",
            indentSize: 2,
            indentation: "spaces",
            semicolons: true,
            quotes: "double"
          }
        })
      ).mockResolvedValueOnce(
        JSON.stringify({
          filesWritten: [],
          dependenciesInstalled: [],
          messages: ["Done"]
        })
      ),
      stream: vi.fn(),
    };

    const context = {
      prompt: "do something",
      llm: fakeLlm,
      tools: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        runCommand: vi.fn(),
      } as unknown as ToolProvider,
      memory: {
        setAgentMemory: vi.fn(),
      } as unknown as MemoryService,
      previousResults: new Map(),
      projectIndex: {
        language: "TypeScript",
        framework: null,
        conventions: {
          namingStyle: "camelCase",
          importStyle: "named",
          indentation: "spaces",
          indentSize: 2,
          semicolons: true,
          quotes: "double"
        }
      }
    } as unknown as AgentContext;

    const agent = new CoderAgent();
    const result = await agent.execute(context);
    
    expect(result.success).toBe(true);
    expect(fakeLlm.complete).toHaveBeenCalledTimes(2);
  });
});