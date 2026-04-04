import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentSideConnection } from "@agentclientprotocol/sdk";
import { AcpConfirmationHandler } from "../confirmation-handler.js";

function createMockConnection(): AgentSideConnection {
  return {
    requestPermission: vi.fn().mockResolvedValue({
      outcome: { outcome: "resolved", optionId: "yes" },
    }),
  } as unknown as AgentSideConnection;
}

describe("AcpConfirmationHandler", () => {
  let mockConnection: AgentSideConnection;
  let handler: AcpConfirmationHandler;

  beforeEach(() => {
    mockConnection = createMockConnection();
    handler = new AcpConfirmationHandler({
      connection: mockConnection,
      sessionId: "test-session",
    });
  });

  describe("confirmPlan", () => {
    it("returns yes when user approves plan", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      const plan = {
        summary: "Test Plan",
        language: "typescript",
        contextFiles: [],
        steps: [{ agent: "architect" as const, action: "design" }],
      };

      const result = await handler.confirmPlan(plan);

      expect(result).toBe("yes");
      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "test-session",
          toolCall: expect.objectContaining({
            title: "Execution Plan",
            kind: "read",
          }),
          options: expect.arrayContaining([
            expect.objectContaining({ optionId: "yes", name: "Approve plan" }),
            expect.objectContaining({ optionId: "no", name: "Reject plan" }),
          ]),
        })
      );
    });

    it("returns no when user rejects plan", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "no" },
      });

      const plan = {
        summary: "Test Plan",
        language: "typescript",
        contextFiles: [],
        steps: [],
      };

      const result = await handler.confirmPlan(plan);

      expect(result).toBe("no");
    });

    it("returns edit when user chooses edit option", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "edit" },
      });

      const plan = {
        summary: "Test Plan",
        language: "typescript",
        contextFiles: [],
        steps: [],
      };

      const result = await handler.confirmPlan(plan);

      expect(result).toBe("edit");
    });

    it("returns no when response is undefined", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const plan = {
        summary: "Test Plan",
        language: "typescript",
        contextFiles: [],
        steps: [],
      };

      const result = await handler.confirmPlan(plan);

      expect(result).toBe("no");
    });

    it("returns no when outcome is cancelled", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "cancelled" },
      });

      const plan = {
        summary: "Test Plan",
        language: "typescript",
        contextFiles: [],
        steps: [],
      };

      const result = await handler.confirmPlan(plan);

      expect(result).toBe("no");
    });

    it("formats plan with summary, language and steps", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      const plan = {
        summary: "Implement login feature",
        language: "typescript",
        contextFiles: ["src/auth.ts"],
        steps: [
          { agent: "architect" as const, action: "design auth structure" },
          { agent: "coder" as const, action: "implement login" },
        ],
      };

      await handler.confirmPlan(plan);

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: expect.objectContaining({
            rawInput: expect.objectContaining({
              plan: expect.stringContaining("# Implement login feature"),
            }),
          }),
        })
      );
    });
  });

  describe("confirmFileWrite", () => {
    it("returns yes when user approves file write", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      const result = await handler.confirmFileWrite(
        "src/new.ts",
        "console.log('new');",
        true
      );

      expect(result).toBe("yes");
    });

    it("returns no when user skips file", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "no" },
      });

      const result = await handler.confirmFileWrite(
        "src/new.ts",
        "console.log('new');",
        true
      );

      expect(result).toBe("no");
    });

    it("returns edit when user chooses edit first", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "edit" },
      });

      const result = await handler.confirmFileWrite(
        "src/new.ts",
        "console.log('new');",
        true
      );

      expect(result).toBe("edit");
    });

    it("uses correct title for new file", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      await handler.confirmFileWrite("src/new.ts", "content", true);

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: expect.objectContaining({
            title: "Create new file: src/new.ts",
          }),
        })
      );
    });

    it("uses correct title for modified file", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      await handler.confirmFileWrite("src/existing.ts", "content", false);

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: expect.objectContaining({
            title: "Modify file: src/existing.ts",
          }),
        })
      );
    });

    it("includes diff in rawInput", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      const diff = "--- a/src/new.ts\n+++ b/src/new.ts\n@@ -1 +1 @@\n-old\n+new";
      await handler.confirmFileWrite("src/new.ts", diff, true);

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: expect.objectContaining({
            rawInput: expect.objectContaining({
              content: diff,
            }),
          }),
        })
      );
    });

    it("provides three options: yes, no, edit", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      await handler.confirmFileWrite("src/new.ts", "content", true);

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ name: "Write file", optionId: "yes" }),
            expect.objectContaining({ name: "Skip file", optionId: "no" }),
            expect.objectContaining({ name: "Edit first", optionId: "edit" }),
          ]),
        })
      );
    });
  });

  describe("confirmCommand", () => {
    it("returns yes when user approves command", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      const result = await handler.confirmCommand("npm test");

      expect(result).toBe("yes");
    });

    it("returns no when user cancels command", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "no" },
      });

      const result = await handler.confirmCommand("npm test");

      expect(result).toBe("no");
    });

    it("includes command in requestPermission", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      await handler.confirmCommand("rm -rf node_modules");

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: expect.objectContaining({
            title: "Run terminal command",
            rawInput: expect.objectContaining({
              command: "rm -rf node_modules",
            }),
          }),
        })
      );
    });

    it("provides two options: execute and cancel", async () => {
      (mockConnection.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        outcome: { outcome: "resolved", optionId: "yes" },
      });

      await handler.confirmCommand("npm test");

      expect(mockConnection.requestPermission).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ name: "Execute", optionId: "yes" }),
            expect.objectContaining({ name: "Cancel", optionId: "no" }),
          ]),
        })
      );
    });
  });
});
