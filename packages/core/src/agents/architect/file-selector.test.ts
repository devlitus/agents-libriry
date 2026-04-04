import { describe, it, expect } from "vitest";
import { selectRelevantFiles } from "./file-selector.js";
import type { DetectedProject, FileTreeNode } from "../../indexer/types.js";
import type { LlmClient } from "../../llm/types.js";

const dummyProjectIndex: DetectedProject = {
  language: "typescript",
  framework: null,
  testFramework: null,
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
  configFiles: [],
  entryPoints: [],
  fileTree: [
    {
      path: "src",
      type: "directory",
      children: [
        { path: "src/index.ts", type: "file" },
        { path: "src/utils.ts", type: "file" },
        {
          path: "src/components",
          type: "directory",
          children: [
            { path: "src/components/Button.tsx", type: "file" },
            { path: "src/components/Input.tsx", type: "file" }
          ]
        },
        {
          path: "src/routes",
          type: "directory",
          children: [
            { path: "src/routes/api.ts", type: "file" }
          ]
        }
      ]
    },
    { path: "package.json", type: "file" }
  ]
};

class FakeLlmClient implements LlmClient {
  constructor(private readonly response: string) {}
  
  async complete(_prompt: string): Promise<string> {
    return this.response;
  }
  
  async *stream(_prompt: string): AsyncIterable<string> {
    yield this.response;
  }
}

describe("selectRelevantFiles", () => {
  it("finds files by exact match in prompt", async () => {
    // Arrange
    const llm = new FakeLlmClient("");
    
    // Act
    const files = await selectRelevantFiles("Fix the Button.tsx component", dummyProjectIndex, llm);
    
    // Assert
    expect(files).toContain("src/components/Button.tsx");
  });

  it("finds files by type mentioned in prompt", async () => {
    // Arrange
    const llm = new FakeLlmClient("");
    
    // Act
    const files = await selectRelevantFiles("Add a new endpoint", dummyProjectIndex, llm);
    
    // Assert
    expect(files).toContain("src/routes/api.ts");
  });

  it("uses LLM fallback when prompt is ambiguous", async () => {
    // Arrange
    const llm = new FakeLlmClient(JSON.stringify(["src/index.ts", "package.json"]));
    
    // Act
    const files = await selectRelevantFiles("Setup the initial structure", dummyProjectIndex, llm);
    
    // Assert
    expect(files).toEqual(["src/index.ts", "package.json"]);
  });

  it("limits the maximum number of files", async () => {
    // Arrange
    const llm = new FakeLlmClient("");
    
    // Act
    const files = await selectRelevantFiles("Check components and utils and routes", dummyProjectIndex, llm, 2);
    
    // Assert
    expect(files.length).toBeLessThanOrEqual(2);
  });
});
