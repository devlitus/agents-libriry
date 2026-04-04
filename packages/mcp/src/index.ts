import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  Orchestrator,
  createClient,
  createMemoryService,
  createIndexer,
  loadConfig,
} from "@devagents/core";
import type { OrchestratorOptions } from "@devagents/core";
import type { OrchestratorEvent } from "@devagents/core";
import type { Indexer } from "@devagents/core";
import { McpToolProvider } from "./tool-provider.js";
import { McpConfirmationHandler } from "./confirmation-handler.js";
import { formatResult } from "./result-formatter.js";

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const TOOLS: Tool[] = [
  {
    name: "orchestrate",
    description: "Execute the full devagents flow with a prompt",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The prompt to execute",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "architect",
    description: "Run the Architect agent only to create a plan",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What to plan",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "coder",
    description: "Run the Coder agent only to implement code",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What to implement",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "tester",
    description: "Run the Tester agent only to generate tests",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What to test",
        },
        file: {
          type: "string",
          description: "Optional: specific file to test",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "reviewer",
    description: "Run the Reviewer agent only to review code",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What to review",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "plan",
    description: "Generate a plan without executing",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What to plan",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "status",
    description: "View project status (language, framework, etc.)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

async function runOrchestrator(
  prompt: string,
  orchestrator: Orchestrator
): Promise<{ events: OrchestratorEvent[]; error?: string }> {
  const events: OrchestratorEvent[] = [];
  try {
    for await (const event of orchestrator.run(prompt)) {
      events.push(event);
    }
    return { events };
  } catch (error) {
    return {
      events,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatToolResult(
  toolName: string,
  result: { events: OrchestratorEvent[]; error?: string }
) {
  if (result.error) {
    return {
      content: [{ type: "text", text: `Error: ${result.error}` }] as const,
      isError: true,
    };
  }

  const summary = `${capitalize(toolName)} execution complete.`;
  return formatResult(summary, result.events);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function getProjectIndex(indexer: Indexer) {
  const index = await indexer.index();
  return JSON.stringify(index, null, 2);
}

async function getSessionHistory(memory: Awaited<ReturnType<typeof createMemoryService>>) {
  const sessions = await memory.getRecentSessions();
  return JSON.stringify(sessions, null, 2);
}

async function getTeamConfig() {
  const config = await loadConfig();
  // Mask any sensitive values
  const safeConfig = {
    llm: config.llm ? {
      provider: config.llm.provider,
      model: config.llm.model,
    } : null,
    team: config.team,
    indexer: config.indexer,
    memory: config.memory,
  };
  return JSON.stringify(safeConfig, null, 2);
}

async function createOrchestratorDeps() {
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

  return { config, llm, memory, indexer };
}

async function main() {
  const { config, llm, memory, indexer } = await createOrchestratorDeps();

  const toolProvider = new McpToolProvider(process.cwd());
  const confirmationHandler = new McpConfirmationHandler();

  const orchestratorOptions: OrchestratorOptions = {
    config,
    llm,
    memory,
    tools: toolProvider,
    indexer,
    confirmation: confirmationHandler,
  };

  const orchestrator = new Orchestrator(orchestratorOptions);

  const server = new Server(
    {
      name: "devagents-mcp",
      version: "0.0.1",
    },
    {
      capabilities: {
        tools: {},
        resources: {
          subscribe: true,
          listChanged: false,
        },
      },
    }
  );

  // Resources handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "project://index",
          name: "Project Index",
          description: "Indexed project information (language, framework, conventions)",
          mimeType: "application/json",
        },
        {
          uri: "project://sessions",
          name: "Session History",
          description: "Recent session history from memory",
          mimeType: "application/json",
        },
        {
          uri: "project://config",
          name: "Team Configuration",
          description: "Current team configuration (safe view, credentials masked)",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: [
        {
          uriTemplate: "project://index",
          name: "Project Index",
          description: "Indexed project information",
          mimeType: "application/json",
        },
        {
          uriTemplate: "project://sessions",
          name: "Session History",
          description: "Recent session history",
          mimeType: "application/json",
        },
        {
          uriTemplate: "project://config",
          name: "Team Configuration",
          description: "Current team configuration",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    try {
      if (uri === "project://index") {
        const content = await getProjectIndex(indexer);
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      }

      if (uri === "project://sessions") {
        const content = await getSessionHistory(memory);
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      }

      if (uri === "project://config") {
        const content = await getTeamConfig();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      }

      // Unknown resource
      return {
        contents: [],
        isError: true,
      };
    } catch (error) {
      return {
        contents: [],
        isError: true,
      };
    }
  });

  // Tools handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS,
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments ?? {};

    if (toolName === "orchestrate") {
      const prompt = args.prompt as string;
      if (!prompt) {
        return {
          content: [{ type: "text", text: "Missing prompt argument" }],
          isError: true,
        };
      }

      const result = runOrchestrator(prompt, orchestrator);
      return formatToolResult("orchestrate", await result);
    }

    if (toolName === "architect") {
      const prompt = args.prompt as string;
      if (!prompt) {
        return {
          content: [{ type: "text", text: "Missing prompt argument" }],
          isError: true,
        };
      }
      const result = await runOrchestrator(`/architect ${prompt}`, orchestrator);
      return formatToolResult("architect", result);
    }

    if (toolName === "coder") {
      const prompt = args.prompt as string;
      if (!prompt) {
        return {
          content: [{ type: "text", text: "Missing prompt argument" }],
          isError: true,
        };
      }
      const result = await runOrchestrator(`/coder ${prompt}`, orchestrator);
      return formatToolResult("coder", result);
    }

    if (toolName === "tester") {
      const prompt = args.prompt as string;
      if (!prompt) {
        return {
          content: [{ type: "text", text: "Missing prompt argument" }],
          isError: true,
        };
      }
      const file = args.file as string | undefined;
      const fullPrompt = file ? `/tester ${prompt} for file ${file}` : `/tester ${prompt}`;
      const result = await runOrchestrator(fullPrompt, orchestrator);
      return formatToolResult("tester", result);
    }

    if (toolName === "reviewer") {
      const prompt = args.prompt as string;
      if (!prompt) {
        return {
          content: [{ type: "text", text: "Missing prompt argument" }],
          isError: true,
        };
      }
      const result = await runOrchestrator(`/reviewer ${prompt}`, orchestrator);
      return formatToolResult("reviewer", result);
    }

    if (toolName === "plan") {
      const prompt = args.prompt as string;
      if (!prompt) {
        return {
          content: [{ type: "text", text: "Missing prompt argument" }],
          isError: true,
        };
      }
      const result = await runOrchestrator(`/plan ${prompt}`, orchestrator);
      return formatToolResult("plan", result);
    }

    if (toolName === "status") {
      try {
        const index = await indexer.index();
        const status = formatProjectStatus(index);
        return {
          content: [{ type: "text", text: status }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting project status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: "text", text: `Tool '${toolName}' not found` }],
      isError: true,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function formatProjectStatus(index: Awaited<ReturnType<Indexer["index"]>>): string {
  const lines: string[] = [
    "# Project Status",
    "",
    `**Language:** ${index.language || "unknown"}`,
    `**Framework:** ${index.framework || "none detected"}`,
    `**Test Framework:** ${index.testFramework || "none detected"}`,
    "",
    "## Conventions",
    "",
    `- Naming: ${index.conventions.namingStyle || "default"}`,
    `- Import style: ${index.conventions.importStyle || "default"}`,
    `- Indentation: ${index.conventions.indentSize ?? 2} spaces`,
    `- Semicolons: ${index.conventions.semicolons ? "yes" : "no"}`,
    `- Quotes: ${index.conventions.quotes || "double"}`,
    "",
    "## Project Structure",
    "",
    `**Files indexed:** ${index.fileTree.length}`,
    `**Config files:** ${index.configFiles.length > 0 ? index.configFiles.join(", ") : "none"}`,
    `**Entry points:** ${index.entryPoints.length > 0 ? index.entryPoints.join(", ") : "none"}`,
  ];

  return lines.join("\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
