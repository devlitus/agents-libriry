import { buildCoderPrompt } from "../prompts.js";
import { parseCoderResponse } from "../response-parser.js";
import { generateDiff } from "./diff-generator.js";
import { detectDependencies } from "./dependency-detector.js";
import type { Agent, AgentContext, AgentResult, AgentName } from "../types.js";
import type { ConfirmationHandler } from "../orchestrator-types.js";
import type { ArchitectPlan } from "../architect/types.js";
import type { CoderOutput } from "./types.js";

// A dummy/noop handler in case none is provided
class NoOpConfirmationHandler implements ConfirmationHandler {
  async confirmPlan(): Promise<"yes" | "no" | "edit"> { return "yes"; }
  async confirmFileWrite(): Promise<"yes" | "no" | "edit"> { return "yes"; }
  async confirmCommand(): Promise<"yes" | "no" | "edit"> { return "yes"; }
}

export interface CoderAgentOptions {
  confirmation?: ConfirmationHandler;
}

export class CoderAgent implements Agent {
  readonly name: AgentName = "coder";
  private readonly confirmation: ConfirmationHandler;

  constructor(options?: CoderAgentOptions) {
    this.confirmation = options?.confirmation ?? new NoOpConfirmationHandler();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const messages: string[] = [];
    
    // 1. Get ArchitectPlan
    let plan = this.getArchitectPlan(context);

    // 2. Standalone mode (no plan from Architect)
    if (!plan) {
      messages.push("Running in standalone mode (no Architect plan found). Generating internal plan...");
      plan = await this.generateInternalPlan(context);
    }

    // 3. Build prompt and get LLM response
    const prompt = buildCoderPrompt(context, plan);
    const llmResponse = await context.llm.complete(prompt);
    
    const coderOutput = parseCoderResponse(llmResponse);
    const finalFilesWritten: CoderOutput["filesWritten"] = [];
    const finalDependencies: string[] = [];

    // 4. Process each file
    for (const fileWrite of coderOutput.filesWritten) {
      let originalContent = "";
      let isNew = fileWrite.isNew;

      try {
        originalContent = await context.tools.readFile(fileWrite.path);
        isNew = false;
      } catch {
        isNew = true;
      }

      const diff = generateDiff(originalContent, fileWrite.content, fileWrite.path);
      
      if (!diff) {
        messages.push(`No changes needed for ${fileWrite.path}`);
        continue;
      }

      // Request confirmation
      const confirmation = await this.confirmation.confirmFileWrite(fileWrite.path, diff, isNew);
      
      if (confirmation === "yes" || confirmation === "edit") {
        await context.tools.writeFile(fileWrite.path, fileWrite.content);
        finalFilesWritten.push({ ...fileWrite, isNew });
        messages.push(`Wrote ${fileWrite.path}${confirmation === "edit" ? " (with edits)" : ""}`);
      } else {
        messages.push(`Skipped ${fileWrite.path} (rejected by user)`);
      }
    }

    // 5. Detect dependencies
    for (const file of finalFilesWritten) {
      let packageJsonContent: string | undefined;
      try {
        packageJsonContent = await context.tools.readFile("package.json");
      } catch {
        // No package.json
      }
      
      const deps = detectDependencies(file.content, packageJsonContent);
      for (const dep of deps) {
        if (!finalDependencies.includes(dep)) {
          finalDependencies.push(dep);
        }
      }
    }

    // 6. Propose npm install if needed
    for (const dep of finalDependencies) {
      const command = `npm install ${dep}`;
      const conf = await this.confirmation.confirmCommand(command);
      if (conf === "yes") {
        try {
          await context.tools.runCommand(command);
          messages.push(`Installed dependency: ${dep}`);
        } catch (error) {
          messages.push(`Failed to install dependency: ${dep} - ${(error as Error).message}`);
        }
      } else {
        messages.push(`Skipped dependency install: ${dep}`);
      }
    }

    // 7. Save files_written to agent_memory
    if (finalFilesWritten.length > 0) {
      try {
        await context.memory.setAgentMemory({
          sessionId: context.sessionId,
          agent: this.name,
          key: "files_written",
          value: JSON.stringify(finalFilesWritten),
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Ignore memory errors
      }
    }

    const output: CoderOutput = {
      filesWritten: finalFilesWritten,
      dependenciesInstalled: finalDependencies,
      messages: [...coderOutput.messages, ...messages],
    };

    return {
      agent: this.name,
      success: true,
      data: output,
      messages: output.messages,
    };
  }

  private getArchitectPlan(context: AgentContext): ArchitectPlan | undefined {
    const architectResult = context.previousResults.get("architect");
    if (architectResult?.success && architectResult.data) {
      return architectResult.data as ArchitectPlan;
    }
    return undefined;
  }

  private async generateInternalPlan(context: AgentContext): Promise<ArchitectPlan> {
    const prompt = `Generate a plan for this task: ${context.prompt}
Analyze the task and determine what files need to be created or modified.

Output your plan as a JSON object with this structure:
{
  "filesToCreate": [{"path": "src/file.ts", "description": "what this file does", "template": ""}],
  "filesToModify": [{"path": "existing/file.ts", "currentContent": "", "change": "what to change"}],
  "conventions": {"namingStyle": "camelCase", "importStyle": "ESM", "indentSize": 2, "indentation": "spaces", "semicolons": true, "quotes": "double", "testFilePattern": "*.test.ts", "testDirectory": "tests"},
  "notes": ["standalone generated plan"]
}

Respond ONLY with valid JSON.`;

    const response = await context.llm.complete(prompt);
    
    try {
      const text = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text) as ArchitectPlan;
      return {
        filesToCreate: parsed.filesToCreate || [],
        filesToModify: parsed.filesToModify || [],
        conventions: parsed.conventions || {
          namingStyle: "camelCase",
          importStyle: "named",
          indentSize: 2,
          indentation: "spaces",
          quotes: "double",
          semicolons: true,
          testFilePattern: "*.test.ts",
          testDirectory: "tests"
        },
        notes: parsed.notes || []
      };
    } catch {
      // Fallback
      return {
        filesToCreate: [],
        filesToModify: [],
        conventions: {
          namingStyle: "camelCase",
          importStyle: "named",
          indentSize: 2,
          indentation: "spaces",
          quotes: "double",
          semicolons: true,
          testFilePattern: "*.test.ts",
          testDirectory: "tests"
        },
        notes: ["Failed to parse internal plan"]
      };
    }
  }
}