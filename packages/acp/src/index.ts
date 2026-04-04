import * as acp from "@agentclientprotocol/sdk";
import { Readable, Writable } from "node:stream";
import type { ContentBlock } from "@agentclientprotocol/sdk/dist/schema/types.gen.js";
import {
  Orchestrator,
  createClient,
  createMemoryService,
  createIndexer,
  loadConfig,
} from "@devagents/core";
import type { OrchestratorOptions } from "@devagents/core";
import { AcpToolProvider, type AcpToolProviderDeps } from "./tool-provider.js";
import { AcpConfirmationHandler, type AcpConfirmationHandlerDeps } from "./confirmation-handler.js";
import { EventStreamer } from "./event-streamer.js";

interface SessionState {
  pendingPrompt: AbortController | null;
}

export class DevAgentsAcpAgent implements acp.Agent {
  private connection: acp.AgentSideConnection;
  private orchestrator: Orchestrator | null = null;
  private confirmationHandler: AcpConfirmationHandler | null = null;
  private session: SessionState = { pendingPrompt: null };

  constructor(connection: acp.AgentSideConnection) {
    this.connection = connection;
  }

  async initialize(_params: acp.InitializeRequest): Promise<acp.InitializeResponse> {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: {
          image: false,
          audio: false,
          embeddedContext: true,
        },
      },
      agentInfo: {
        name: "devagents",
        title: "Dev Team",
        version: "0.0.1",
      },
    };
  }

  async newSession(_params: acp.NewSessionRequest): Promise<acp.NewSessionResponse> {
    const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await this.initializeOrchestrator(sessionId);

    return { sessionId };
  }

  private async initializeOrchestrator(sessionId: string): Promise<void> {
    const config = await loadConfig();
    const llm = createClient({
      provider: config.llm?.provider,
      model: config.llm?.model,
    });
    const memory = await createMemoryService(config.memory?.path ?? ".devagents/memory.db");
    const indexer = await createIndexer(
      process.cwd(),
      config.indexer?.ignore ?? [],
      config.indexer?.alwaysRead ?? []
    );

    const toolDeps: AcpToolProviderDeps = {
      connection: this.connection,
      sessionId,
    };
    const confirmDeps: AcpConfirmationHandlerDeps = {
      connection: this.connection,
      sessionId,
    };

    const toolProvider = new AcpToolProvider(toolDeps);
    this.confirmationHandler = new AcpConfirmationHandler(confirmDeps);

    const orchestratorOptions: OrchestratorOptions = {
      config,
      llm,
      memory,
      tools: toolProvider,
      indexer,
      confirmation: this.confirmationHandler,
    };

    this.orchestrator = new Orchestrator(orchestratorOptions);
  }

  async authenticate(_params: acp.AuthenticateRequest): Promise<acp.AuthenticateResponse | void> {
    return {};
  }

  async setSessionMode(_params: acp.SetSessionModeRequest): Promise<acp.SetSessionModeResponse> {
    return {};
  }

  async prompt(params: acp.PromptRequest): Promise<acp.PromptResponse> {
    if (!this.orchestrator) {
      throw new Error("Session not initialized. Call newSession first.");
    }

    this.session.pendingPrompt = new AbortController();

    const prompt = this.extractTextFromPrompt(params.prompt);

    if (!prompt) {
      return { stopReason: "end_turn" };
    }

    try {
      for await (const event of this.orchestrator.run(prompt)) {
        const streamer = new EventStreamer(this.connection, params.sessionId);
        await streamer.stream(event);
      }
    } catch (err) {
      if (this.session.pendingPrompt?.signal.aborted) {
        return { stopReason: "cancelled" };
      }
      throw err;
    }

    this.session.pendingPrompt = null;
    return { stopReason: "end_turn" };
  }

  private extractTextFromPrompt(prompt: Array<ContentBlock>): string | null {
    const textBlocks: string[] = [];

    for (const block of prompt) {
      if (block.type === "text" && "text" in block) {
        textBlocks.push(block.text);
      }
    }

    return textBlocks.length > 0 ? textBlocks.join("\n") : null;
  }

  async cancel(_params: acp.CancelNotification): Promise<void> {
    this.session.pendingPrompt?.abort();
  }
}

function startServer(): void {
  const input = Writable.toWeb(process.stdout);
  const output = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
  const stream = acp.ndJsonStream(input, output);

  new acp.AgentSideConnection((conn) => new DevAgentsAcpAgent(conn), stream);
}

process.on("SIGTERM", () => {
  process.exit(0);
});

process.on("SIGINT", () => {
  process.exit(0);
});

startServer();
