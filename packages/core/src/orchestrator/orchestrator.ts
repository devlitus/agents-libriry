import { parseCommand } from "./command-parser.js";
import { selectAgentsForPrompt } from "./agent-selector.js";
import { generatePlan, formatPlanForDisplay } from "./plan-generator.js";
import { NoOpConfirmationHandler } from "./confirmation.js";
import { ArchitectAgent, CoderAgent, TesterAgent, ReviewerAgent } from "../agents/index.js";
import type { OrchestratorEvent, PlanDefinition } from "../agents/orchestrator-types.js";
import type { Agent, AgentContext, AgentResult, AgentName } from "../agents/types.js";
import type { ConfirmationHandler } from "../agents/orchestrator-types.js";
import type { ReviewerOutput, ReviewObservation } from "../agents/reviewer/types.js";
import type { LlmClient } from "../llm/types.js";
import type { MemoryService } from "../memory/types.js";
import type { ToolProvider } from "../agents/tool-provider.js";
import type { DevAgentsConfig } from "../types.js";
import type { Indexer } from "../indexer/indexer.js";

export interface OrchestratorOptions {
  config: DevAgentsConfig;
  llm: LlmClient;
  memory: MemoryService;
  tools: ToolProvider;
  indexer: Indexer;
  confirmation?: ConfirmationHandler;
  agents?: Map<AgentName, Agent>;
}

export class Orchestrator {
  private readonly config: DevAgentsConfig;
  private readonly llm: LlmClient;
  private readonly memory: MemoryService;
  private readonly tools: ToolProvider;
  private readonly indexer: Indexer;
  private readonly confirmation: ConfirmationHandler;
  private readonly agents: Map<AgentName, Agent>;

  constructor(options: OrchestratorOptions) {
    this.config = options.config;
    this.llm = options.llm;
    this.memory = options.memory;
    this.tools = options.tools;
    this.indexer = options.indexer;
    this.confirmation = options.confirmation || new NoOpConfirmationHandler();
    this.agents = options.agents || new Map<AgentName, Agent>([
      ["architect", new ArchitectAgent()],
      ["coder", new CoderAgent()],
      ["tester", new TesterAgent()],
      ["reviewer", new ReviewerAgent()],
    ]);
  }

  async *run(prompt: string): AsyncGenerator<OrchestratorEvent, void, unknown> {
    const sessionId = crypto.randomUUID();

    yield { type: "indexing_start" };
    const projectIndex = await this.indexer.index();
    yield { type: "indexing_complete" };

    const command = parseCommand(prompt);
    const actualPrompt = command.type === "free" ? prompt : ('prompt' in command && typeof command.prompt === 'string' ? command.prompt : "");
    
    const context = this.createContext(sessionId, actualPrompt, projectIndex);

    if (command.type === "plan") {
      const selection = selectAgentsForPrompt(actualPrompt, context);
      const plan = generatePlan(actualPrompt, projectIndex, selection.agents);
      yield { type: "plan_ready", plan };
      return;
    }

    let agentsToRun: AgentName[];
    if (command.type === "free") {
      const selection = selectAgentsForPrompt(actualPrompt, context);
      agentsToRun = selection.agents;
    } else {
      // It's a specific agent command like /architect, /coder, etc.
      agentsToRun = [command.type as AgentName];
    }

    const plan = generatePlan(actualPrompt, projectIndex, agentsToRun);
    yield { type: "plan_ready", plan };

    const confirmed = await this.confirmation.confirmPlan(plan);
    if (confirmed !== "yes") {
      yield { type: "plan_rejected" };
      yield { type: "session_complete", success: false };
      return;
    }

    yield { type: "plan_confirmed" };

    let sessionSuccess = true;

    for (let i = 0; i < agentsToRun.length; i++) {
      const agentName = agentsToRun[i];
      const agent = this.agents.get(agentName);
      if (!agent) continue;

      yield { type: "agent_start", agent: agentName };
      
      const result = await agent.execute(context);
      context.previousResults.set(agentName, result);
      
      for (const msg of result.messages) {
        yield { type: "agent_progress", agent: agentName, message: msg };
      }
      
      yield { type: "agent_complete", agent: agentName, result };

      if (!result.success) {
        sessionSuccess = false;
        break; // Stop execution if an agent fails
      }

      if (agentName === "reviewer") {
        const reviewerOutput = result.data as ReviewerOutput | null;
        if (!reviewerOutput || reviewerOutput.overallAssessment === "pass" || !reviewerOutput.observations?.length) {
          continue;
        }

        const formattedObs = reviewerOutput.observations
          .map((obs: ReviewObservation) => {
            const location = obs.line ? `${obs.file}:${obs.line}` : obs.file;
            const suggestion = obs.suggestion ?? "no suggestion";
            return `${location}: ${obs.message} (${suggestion})`;
          })
          .join("\n");

        context.prompt += `\n\nPlease fix the following review observations:\n${formattedObs}`;

        const confirmed = await this.confirmation.confirmPlan({
          summary: "Reviewer found issues. Apply fixes?",
          language: projectIndex.language,
          contextFiles: [],
          steps: [
            { agent: "coder", action: "Apply reviewer fixes" },
            { agent: "reviewer", action: "Re-review fixes" },
          ],
        });

        if (confirmed === "yes") {
          agentsToRun.push("coder", "reviewer");
          yield { type: "agent_progress", agent: "orchestrator", message: "Restarting Coder to apply Reviewer fixes." };
        }
      }
    }

    await this.saveSession(sessionId, prompt, agentsToRun, [], []);

    yield { type: "session_complete", success: sessionSuccess };
  }

  private createContext(sessionId: string, prompt: string, projectIndex: Awaited<ReturnType<Indexer["index"]>>): AgentContext {
    return {
      sessionId,
      prompt,
      projectIndex,
      previousResults: new Map<AgentName, AgentResult>(),
      config: this.config,
      llm: this.llm,
      memory: this.memory,
      tools: this.tools,
    };
  }

  private async saveSession(sessionId: string, prompt: string, agentsUsed: AgentName[], filesModified: string[], commandsRun: string[]): Promise<void> {
    try {
      this.memory.saveSession({
        prompt,
        agentsUsed: JSON.stringify(agentsUsed),
        filesModified: JSON.stringify(filesModified),
        commandsRun: JSON.stringify(commandsRun),
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Session saving is best-effort
    }
  }
}
