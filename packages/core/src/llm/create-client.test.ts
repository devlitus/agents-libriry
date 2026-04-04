import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LlmClient } from "./types.js";

// Fake provider for testing
class FakeLlmProvider implements LlmClient {
  async complete(_prompt: string): Promise<string> {
    return "fake response";
  }

  async *stream(_prompt: string): AsyncIterable<string> {
    yield "chunk1";
    yield "chunk2";
  }
}

describe("llm/types", () => {
  it("LlmClient complete returns string", async () => {
    const client = new FakeLlmProvider();
    const result = await client.complete("test");
    expect(typeof result).toBe("string");
    expect(result).toBe("fake response");
  });

  it("LlmClient stream yields chunks", async () => {
    const client = new FakeLlmProvider();
    const chunks: string[] = [];
    for await (const chunk of client.stream("test")) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["chunk1", "chunk2"]);
  });

  it("valid provider names are accepted", () => {
    const providers = ["ollama", "anthropic", "openai"] as const;
    providers.forEach((p) => expect(p).toBeDefined());
  });
});

describe("llm/create-client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws NoProviderError when no provider is available", async () => {
    // Clear env vars
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.NODE_ENV;

    const { createClient, NoProviderError } = await import("./create-client.js");
    expect(() => createClient()).toThrow(NoProviderError);
  });

  it("detects anthropic when API key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "";

    const { detectProvider } = await import("./create-client.js");
    expect(detectProvider()).toBe("anthropic");

    delete process.env.ANTHROPIC_API_KEY;
  });

  it("detects openai when API key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "";
    process.env.OPENAI_API_KEY = "test-key";

    const { detectProvider } = await import("./create-client.js");
    expect(detectProvider()).toBe("openai");

    delete process.env.OPENAI_API_KEY;
  });

  it("detects ollama in development mode", async () => {
    process.env.NODE_ENV = "development";
    process.env.ANTHROPIC_API_KEY = "";
    process.env.OPENAI_API_KEY = "";

    const { detectProvider } = await import("./create-client.js");
    expect(detectProvider()).toBe("ollama");

    process.env.NODE_ENV = "test";
  });
});
