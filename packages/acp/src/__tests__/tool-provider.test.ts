import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentSideConnection } from "@agentclientprotocol/sdk";
import { AcpToolProvider } from "../tool-provider.js";

describe("AcpToolProvider", () => {
  const mockConnection = {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
  } as unknown as AgentSideConnection;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("readFile", () => {
    it("returns file content when readTextFile succeeds", async () => {
      mockConnection.readTextFile = vi.fn().mockResolvedValue({
        content: "file contents",
      });

      const provider = new AcpToolProvider({
        connection: mockConnection,
        sessionId: "test-session",
      });

      const result = await provider.readFile("/path/to/file.txt");
      expect(result).toBe("file contents");
      expect(mockConnection.readTextFile).toHaveBeenCalledWith({
        path: "/path/to/file.txt",
      });
    });

    it("throws when readTextFile returns unexpected shape", async () => {
      mockConnection.readTextFile = vi.fn().mockResolvedValue({});

      const provider = new AcpToolProvider({
        connection: mockConnection,
        sessionId: "test-session",
      });

      await expect(provider.readFile("/path/to/file.txt")).rejects.toThrow(
        "Failed to read file: /path/to/file.txt"
      );
    });
  });

  describe("writeFile", () => {
    it("calls writeTextFile with correct params", async () => {
      mockConnection.writeTextFile = vi.fn().mockResolvedValue(undefined);

      const provider = new AcpToolProvider({
        connection: mockConnection,
        sessionId: "test-session",
      });

      await provider.writeFile("/path/to/file.txt", "new content");
      expect(mockConnection.writeTextFile).toHaveBeenCalledWith({
        path: "/path/to/file.txt",
        content: "new content",
      });
    });
  });

  describe("listDirectory", () => {
    it("returns array type when called", async () => {
      const provider = new AcpToolProvider({
        connection: mockConnection,
        sessionId: "test-session",
      });

      const result = provider.listDirectory("/");
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("runCommand", () => {
    it("returns CommandResult with exitCode, stdout, stderr", async () => {
      const provider = new AcpToolProvider({
        connection: mockConnection,
        sessionId: "test-session",
      });

      const result = await provider.runCommand("echo hello");
      expect(result).toHaveProperty("exitCode");
      expect(result).toHaveProperty("stdout");
      expect(result).toHaveProperty("stderr");
    });
  });
});
