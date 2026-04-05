import { describe, it, expect } from "vitest";
import { formatResult, formatEventAsText } from "../result-formatter.js";
import type { OrchestratorEvent } from "@devlitusp/core";

describe("result-formatter", () => {
  describe("formatEventAsText", () => {
    it("formats indexing_start event", () => {
      const event: OrchestratorEvent = { type: "indexing_start" };
      expect(formatEventAsText(event)).toBe("Indexing project files...");
    });

    it("formats plan_ready event", () => {
      const event: OrchestratorEvent = {
        type: "plan_ready",
        plan: {
          summary: "Test Plan",
          language: "typescript",
          steps: [{ agent: "architect", action: "design" }],
          contextFiles: [],
        },
      };
      const text = formatEventAsText(event);
      expect(text).toContain("Test Plan");
      expect(text).toContain("architect");
    });

    it("formats agent_start event", () => {
      const event: OrchestratorEvent = {
        type: "agent_start",
        agent: "coder",
      };
      expect(formatEventAsText(event)).toBe("coder starting...");
    });

    it("formats error event", () => {
      const event: OrchestratorEvent = {
        type: "error",
        message: "Something failed",
      };
      expect(formatEventAsText(event)).toBe("Error: Something failed");
    });
  });

  describe("formatResult", () => {
    it("returns McpToolResult with content", () => {
      const events: OrchestratorEvent[] = [
        { type: "indexing_start" },
        { type: "indexing_complete" },
      ];
      const result = formatResult("Done", events);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.isError).toBe(false);
    });

    it("formats events in result text", () => {
      const events: OrchestratorEvent[] = [
        { type: "indexing_start" },
        { type: "agent_start", agent: "architect" },
      ];
      const result = formatResult("Summary", events);

      expect(result.content[0].text).toContain("Summary");
      expect(result.content[0].text).toContain("Indexing project files...");
      expect(result.content[0].text).toContain("architect starting...");
    });
  });
});
