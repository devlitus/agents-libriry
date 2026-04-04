import type { Agent, AgentContext, AgentExecutionResult } from "../types.js";
import { buildArchitectPrompt } from "../prompts.js";
import { parseArchitectResponse, tryParseWithRetry } from "../response-parser.js";
import { selectRelevantFiles } from "./file-selector.js";

export class ArchitectAgent implements Agent {
  readonly name = "architect";

  async execute(context: AgentContext): Promise<AgentExecutionResult> {
    const { prompt, projectIndex, llm, memory, tools, sessionId } = context;

    try {
      const selectedFiles = await selectRelevantFiles(prompt, projectIndex, llm);
      const fileContents: string[] = [];

      for (const filePath of selectedFiles) {
        try {
          const content = await tools.readFile(filePath);
          fileContents.push(`\n--- ${filePath} ---\n${content}`);
        } catch (e) {
          // File reading failed, skip
        }
      }

      let fullPrompt = buildArchitectPrompt(context);
      if (fileContents.length > 0) {
        fullPrompt += `\n\nContext from existing files:${fileContents.join("")}`;
      }

      const response = await llm.complete(fullPrompt);
      const plan = tryParseWithRetry(response, parseArchitectResponse);

      memory.setAgentMemory({
        sessionId,
        agent: this.name,
        key: "last_architect_plan",
        value: JSON.stringify(plan),
        createdAt: new Date().toISOString(),
      });

      return {
        agent: this.name,
        success: true,
        data: plan,
        messages: ["Architecture plan generated successfully."],
      };
    } catch (error) {
      return {
        agent: this.name,
        success: false,
        data: null,
        messages: [(error as Error).message || "Failed to generate architecture plan"],
      };
    }
  }
}
