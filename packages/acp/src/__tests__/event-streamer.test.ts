import { describe, it, expect, vi } from "vitest";
import type { AgentSideConnection } from "@agentclientprotocol/sdk";
import { EventStreamer } from "../event-streamer.js";
import type { OrchestratorEvent } from "@devlitusp/core";

describe("EventStreamer", () => {
  const mockConnection = {
    sessionUpdate: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgentSideConnection;

  const streamer = new EventStreamer(mockConnection, "test-session");

  it("streams indexing_start event", async () => {
    const event: OrchestratorEvent = {
      type: "indexing_start",
    };
    await streamer.stream(event);
    expect(mockConnection.sessionUpdate).toHaveBeenCalledWith({
      sessionId: "test-session",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "🔍 Indexing project files..." },
      },
    });
  });

  it("streams plan_ready event with formatted plan", async () => {
    const event: OrchestratorEvent = {
      type: "plan_ready",
      plan: {
        summary: "Test Plan",
        language: "typescript",
        steps: [{ agent: "architect", action: "design" }],
        contextFiles: [],
      },
    };
    await streamer.stream(event);
    expect(mockConnection.sessionUpdate).toHaveBeenCalled();
  });

  it("streams agent_start event", async () => {
    const event: OrchestratorEvent = {
      type: "agent_start",
      agent: "architect",
    };
    await streamer.stream(event);
    expect(mockConnection.sessionUpdate).toHaveBeenCalledWith({
      sessionId: "test-session",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "🚀 **architect** starting..." },
      },
    });
  });

  it("streams error event", async () => {
    const event: OrchestratorEvent = {
      type: "error",
      message: "Something went wrong",
    };
    await streamer.stream(event);
    expect(mockConnection.sessionUpdate).toHaveBeenCalledWith({
      sessionId: "test-session",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "❌ Error: Something went wrong" },
      },
    });
  });
});
