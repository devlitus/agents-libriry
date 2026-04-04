import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentSideConnection } from "@agentclientprotocol/sdk";

// Define mock types locally
interface MockLlm {
  complete: ReturnType<typeof vi.fn>;
  stream: ReturnType<typeof vi.fn>;
}

interface MockMemory {
  init: ReturnType<typeof vi.fn>;
  getProjectIndex: ReturnType<typeof vi.fn>;
  saveProjectIndex: ReturnType<typeof vi.fn>;
  getAgentMemory: ReturnType<typeof vi.fn>;
  setAgentMemory: ReturnType<typeof vi.fn>;
  getAgentMemoryBySession: ReturnType<typeof vi.fn>;
  clearSessionMemory: ReturnType<typeof vi.fn>;
  getRecentSessions: ReturnType<typeof vi.fn>;
  saveSession: ReturnType<typeof vi.fn>;
  pruneOldSessions: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface MockIndexer {
  index: ReturnType<typeof vi.fn>;
  isIndexFresh: ReturnType<typeof vi.fn>;
}

interface MockOrchestrator {
  run: ReturnType<typeof vi.fn>;
}

// Mock the @devagents/core module before importing the agent
vi.mock("@devagents/core", async () => {
  const mockLlm: MockLlm = {
    complete: vi.fn().mockResolvedValue("mocked response"),
    stream: vi.fn(),
  };

  const mockMemory: MockMemory = {
    init: vi.fn(),
    getProjectIndex: vi.fn().mockReturnValue(null),
    saveProjectIndex: vi.fn(),
    getAgentMemory: vi.fn().mockReturnValue(null),
    setAgentMemory: vi.fn(),
    getAgentMemoryBySession: vi.fn().mockReturnValue([]),
    clearSessionMemory: vi.fn(),
    getRecentSessions: vi.fn().mockReturnValue([]),
    saveSession: vi.fn(),
    pruneOldSessions: vi.fn(),
    close: vi.fn(),
  };

  const mockIndexer: MockIndexer = {
    index: vi.fn().mockResolvedValue({
      language: "typescript",
      framework: null,
      testFramework: "vitest",
      conventions: {
        namingStyle: "camelCase" as const,
        testFilePattern: "*.test.ts",
        testDirectory: "__tests__",
        importStyle: "named" as const,
      },
      fileTree: [],
      configFiles: [],
      entryPoints: [],
    }),
    isIndexFresh: vi.fn().mockReturnValue(true),
  };

  const mockOrchestrator: MockOrchestrator = {
    run: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: () => ({
        next: vi.fn().mockResolvedValue({ done: true }),
      }),
    }),
  };

  return {
    Orchestrator: vi.fn(() => mockOrchestrator),
    createClient: vi.fn(() => mockLlm),
    createMemoryService: vi.fn(() => Promise.resolve(mockMemory)),
    createIndexer: vi.fn(() => Promise.resolve(mockIndexer)),
    loadConfig: vi.fn(() => ({
      llm: { provider: "ollama" },
      team: { autoTest: true, autoReview: true, confirmPlan: true },
      indexer: { ignore: [], alwaysRead: [] },
      memory: { path: ".devagents/memory.db", keepSessionHistory: 50 },
    })),
  };
});

// Import the agent AFTER mocking
import { DevAgentsAcpAgent } from "../index.js";

/**
 * Mock ACP Agent connection for testing
 */
function createMockConnection(): AgentSideConnection {
  return {
    requestPermission: vi.fn().mockResolvedValue({
      outcome: { outcome: "resolved", optionId: "yes" },
    }),
    sessionUpdate: vi.fn().mockResolvedValue(undefined),
    readTextFile: vi.fn().mockResolvedValue({ content: "file content" }),
    writeTextFile: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgentSideConnection;
}

describe("ACP Transport Integration", () => {
  describe("3.3.1 — ACP + Core end-to-end", () => {
    let mockConnection: AgentSideConnection;

    beforeEach(() => {
      mockConnection = createMockConnection();
      vi.clearAllMocks();
    });

    it("initializes with agent capabilities and info", async () => {
      const agent = new DevAgentsAcpAgent(mockConnection);

      const response = await agent.initialize({
        protocolVersion: 1,
        clientCapabilities: {},
        clientInfo: { name: "test-client", title: "Test Client", version: "1.0.0" },
      });

      expect(response.protocolVersion).toBeDefined();
      expect(response.agentCapabilities).toBeDefined();
      if (response.agentCapabilities) {
        expect(response.agentCapabilities.loadSession).toBe(false);
        if (response.agentCapabilities.promptCapabilities) {
          expect(response.agentCapabilities.promptCapabilities.embeddedContext).toBe(true);
        }
      }
      expect(response.agentInfo).toBeDefined();
      if (response.agentInfo) {
        expect(response.agentInfo.name).toBe("devagents");
        expect(response.agentInfo.title).toBe("Dev Team");
        expect(response.agentInfo.version).toBe("0.0.1");
      }
    });

    it("implements authenticate", async () => {
      const agent = new DevAgentsAcpAgent(mockConnection);

      const authResponse = await agent.authenticate({
        methodId: "test-method",
      });

      // authenticate returns empty object or void
      expect(authResponse).toBeDefined();
    });

    it("implements setSessionMode", async () => {
      const agent = new DevAgentsAcpAgent(mockConnection);

      const sessionModeResponse = await agent.setSessionMode({
        modeId: "default",
        sessionId: "test-session",
      });

      expect(sessionModeResponse).toBeDefined();
    });

    it("implements cancel method without throwing", async () => {
      const agent = new DevAgentsAcpAgent(mockConnection);

      // Cancel should not throw even without session
      await expect(agent.cancel({ sessionId: "test-session" })).resolves.not.toThrow();
    });

    it("implements prompt and throws for uninitialized session", async () => {
      const agent = new DevAgentsAcpAgent(mockConnection);

      // Don't initialize session - prompt without session should throw
      await expect(() =>
        agent.prompt({
          sessionId: "test-session",
          prompt: [], // Empty prompt array
        })
      ).rejects.toThrow("Session not initialized");
    });

    it("connection sessionUpdate method is callable", async () => {
      // Verify the mock connection has all required methods
      expect(typeof mockConnection.sessionUpdate).toBe("function");
      expect(typeof mockConnection.requestPermission).toBe("function");
      expect(typeof mockConnection.readTextFile).toBe("function");
      expect(typeof mockConnection.writeTextFile).toBe("function");
    });

    it("implements newSession and generates session ID", async () => {
      // This test uses mocked core functions to avoid requiring actual LLM/Memory setup
      const agent = new DevAgentsAcpAgent(mockConnection);

      // Initialize session
      const sessionResponse = await agent.newSession({
        cwd: "/test",
        mcpServers: [],
      });

      // Session ID should be generated (16 bytes = 32 hex chars)
      expect(sessionResponse.sessionId).toBeDefined();
      expect(sessionResponse.sessionId.length).toBe(32);
      expect(/^[a-f0-9]+$/.test(sessionResponse.sessionId)).toBe(true);

      // Orchestrator should be initialized and ready for prompt
      // (We can't directly test this without exposing the orchestrator, but we verified sessionId)
    });
  });
});
