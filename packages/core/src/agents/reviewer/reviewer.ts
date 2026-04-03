import type { Agent, AgentContext, AgentResult } from "../types.js";
import type { ReviewerOutput, ReviewObservation } from "./types.js";
import { buildReviewerPrompt } from "../prompts.js";
import { parseReviewerResponse, tryParseWithRetry } from "../response-parser.js";
import { runSecurityChecks, type FileContent } from "./security-checks.js";
import { formatObservation } from "./formatter.js";
import type { CoderOutput } from "../coder/types.js";
import type { ArchitectPlan } from "../architect/types.js";

export class ReviewerAgent implements Agent {
  readonly name = "reviewer";

  async execute(context: AgentContext): Promise<AgentResult> {
    const coderResult = context.previousResults.get("coder");
    if (!coderResult || !coderResult.success || !coderResult.data) {
      return {
        agent: this.name,
        success: false,
        data: null,
        messages: ["Cannot review: Coder output not found."],
      };
    }

    const coderOutput = coderResult.data as CoderOutput;
    const filesWritten = coderOutput.filesWritten.map((f) => f.path);

    const architectResult = context.previousResults.get("architect");
    if (!architectResult || !architectResult.success || !architectResult.data) {
      return {
        agent: this.name,
        success: false,
        data: null,
        messages: ["Cannot review: Architect plan not found."],
      };
    }
    const plan = architectResult.data as ArchitectPlan;

    const fileContents: FileContent[] = [];
    for (const path of filesWritten) {
      try {
        const content = await context.tools.readFile(path);
        fileContents.push({ path, content });
      } catch (e) {
      }
    }

    const securityObservations = runSecurityChecks(fileContents);
    const prompt = buildReviewerPrompt(context, filesWritten, plan);
    
    let llmOutput: ReviewerOutput;
    try {
      const response = (await context.llm.complete(prompt));
      llmOutput = tryParseWithRetry(response, parseReviewerResponse);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return {
        agent: this.name,
        success: false,
        data: null,
        messages: [`Failed to parse LLM review response: ${errorMsg}`],
      };
    }

    const allObservations = [...securityObservations, ...llmOutput.observations];
    const overallAssessment = allObservations.length > 0 ? "issues" : "pass";
    const messages = [...llmOutput.messages];
    
    for (const obs of allObservations) {
      messages.push(formatObservation(obs));
    }
    
    if (allObservations.length === 0) {
      messages.push("✅ Code review passed with no issues.");
    }

    const data: ReviewerOutput = {
      observations: allObservations,
      overallAssessment,
      messages: llmOutput.messages,
    };

    return {
      agent: this.name,
      success: true,
      data,
      messages,
    };
  }
}
