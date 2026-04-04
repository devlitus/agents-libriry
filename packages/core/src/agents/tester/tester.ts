import type { Agent, AgentContext, AgentExecutionResult, AgentName } from "../types.js";
import type { ConfirmationHandler } from "../orchestrator-types.js";
import type { CoderOutput } from "../coder/types.js";
import type { TesterOutput } from "./types.js";
import { NoOpConfirmationHandler } from "../../orchestrator/confirmation.js";
import { buildTesterPrompt } from "../prompts.js";
import { parseTesterResponse, tryParseWithRetry } from "../response-parser.js";
import { generateTestCommand } from "./test-command.js";
import { generateDiff } from "../coder/diff-generator.js";

export interface TesterAgentOptions {
  confirmation?: ConfirmationHandler;
}

export class TesterAgent implements Agent {
  public readonly name: AgentName = "tester";
  private readonly confirmation: ConfirmationHandler;

  constructor(options: TesterAgentOptions = {}) {
    this.confirmation = options.confirmation || new NoOpConfirmationHandler();
  }

  async execute(context: AgentContext): Promise<AgentExecutionResult> {
    const filesToTest = await this.determineFilesToTest(context);

    if (filesToTest.length === 0) {
      return {
        agent: this.name,
        success: false,
        data: null,
        messages: ["No files to test found."]
      };
    }

    const testFiles = await this.generateTests(context, filesToTest);

    if (testFiles.testFilesWritten.length === 0) {
      return {
        agent: this.name,
        success: false,
        data: testFiles,
        messages: ["Failed to generate any tests."]
      };
    }

    const writtenFiles = await this.confirmAndWriteFiles(context, testFiles);
    testFiles.testFilesWritten = writtenFiles;

    if (writtenFiles.length > 0) {
      const runResult = await this.confirmAndRunCommand(context, writtenFiles[0].path);
      if (runResult) {
        testFiles.testCommand = runResult.command;
        testFiles.testResult = runResult.result;
      }
    }

    this.saveMemory(context, testFiles);

    return {
      agent: this.name,
      success: true,
      data: testFiles,
      messages: testFiles.messages
    };
  }

  private async determineFilesToTest(context: AgentContext): Promise<string[]> {
    const { prompt, previousResults, memory, sessionId } = context;

    if (prompt && prompt.trim().length > 0) {
      const match = prompt.match(/^\/tester\s+(.*)$/);
      if (match && match[1].trim()) {
        return [match[1].trim()];
      }
      return this.askLlmForFileToTest(context);
    }

    const coderResult = previousResults.get("coder");
    if (coderResult && coderResult.success) {
      const data = coderResult.data as CoderOutput;
      return data.filesWritten.map((f) => f.path);
    }

    const memEntry = memory.getAgentMemory(sessionId, "coder_output");
    if (memEntry) {
      try {
        const data = JSON.parse(memEntry.value) as CoderOutput;
        return data.filesWritten.map((f) => f.path);
      } catch {
        return [];
      }
    }

    return [];
  }

  private async askLlmForFileToTest(context: AgentContext): Promise<string[]> {
    const { llm, projectIndex } = context;
    const fileList = projectIndex.fileTree.map((n) => n.path).join(", ");
    const p = `Which file should be tested based on the project context? Respond ONLY with the file path.\nFiles: ${fileList}`;
    const responseText = (await llm.complete(p));
    const text = responseText.trim();
    if (text.includes("```")) {
      return [text.replace(/```/g, "").trim()];
    }
    return [text];
  }

  private async generateTests(context: AgentContext, files: string[]): Promise<TesterOutput> {
    const { llm } = context;
    const prompt = buildTesterPrompt(context, files);
    const responseText = (await llm.complete(prompt));
    
    return tryParseWithRetry(responseText, parseTesterResponse);
  }

  private async confirmAndWriteFiles(context: AgentContext, output: TesterOutput) {
    const { tools } = context;
    const writtenFiles = [];

    for (const testFile of output.testFilesWritten) {
      let originalContent = "";
      try {
        originalContent = await tools.readFile(testFile.path);
      } catch {
        // Assume file does not exist
      }

      const diff = generateDiff(originalContent, testFile.content, testFile.path);
      const isNew = originalContent === "";
      const confirm = await this.confirmation.confirmFileWrite(testFile.path, diff, isNew);
      
      if (confirm === "yes") {
        await tools.writeFile(testFile.path, testFile.content);
        writtenFiles.push(testFile);
      }
    }

    return writtenFiles;
  }

  private async confirmAndRunCommand(context: AgentContext, testPath: string) {
    const fw = context.projectIndex.testFramework || "generic";
    const cmd = generateTestCommand(fw, testPath);
    
    const confirm = await this.confirmation.confirmCommand(cmd);
    if (confirm === "yes") {
      const res = await context.tools.runCommand(cmd);
      return {
        command: cmd,
        result: {
          passed: res.exitCode === 0,
          output: res.stdout + "\n" + res.stderr
        }
      };
    }
    return null;
  }

  private saveMemory(context: AgentContext, data: TesterOutput) {
    const { memory, sessionId } = context;
    memory.setAgentMemory({
      sessionId,
      agent: this.name,
      key: "tester_output",
      value: JSON.stringify(data),
      createdAt: new Date().toISOString()
    });
  }
}
