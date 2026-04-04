import { describe, it, expect } from "vitest";
import type { LlmClient } from "./types.js";

class FakeLlmProvider implements LlmClient {
  constructor(private readonly response: string) {}

  async complete(_prompt: string): Promise<string> {
    return this.response;
  }

  async *stream(_prompt: string): AsyncIterable<string> {
    const chunks = this.response.split(" ");
    for (const chunk of chunks) {
      yield chunk;
    }
  }
}

describe("llm/AnthropicClient configuration", () => {
  it("throws AnthropicError when API key is not set", () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => {
      const { AnthropicClient } = require("./anthropic-client.js");
      new AnthropicClient();
    }).toThrow();

    if (original !== undefined) {
      process.env.ANTHROPIC_API_KEY = original;
    }
  });
});

describe("llm/OpenAIClient configuration", () => {
  it("throws OpenAIError when API key is not set", () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(() => {
      const { OpenAIClient } = require("./openai-client.js");
      new OpenAIClient();
    }).toThrow();

    if (original !== undefined) {
      process.env.OPENAI_API_KEY = original;
    }
  });
});

describe("llm/FakeLLMProvider", () => {
  it("complete returns configured response", async () => {
    const fake = new FakeLlmProvider("hello world");
    const result = await fake.complete("any prompt");
    expect(result).toBe("hello world");
  });

  it("stream splits response into chunks", async () => {
    const fake = new FakeLlmProvider("hello world");
    const chunks: string[] = [];
    for await (const chunk of fake.stream("any prompt")) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(["hello", "world"]);
  });

  it("complete returns different responses for different instances", async () => {
    const fake1 = new FakeLlmProvider("response 1");
    const fake2 = new FakeLlmProvider("response 2");
    const r1 = await fake1.complete("prompt");
    const r2 = await fake2.complete("prompt");
    expect(r1).toBe("response 1");
    expect(r2).toBe("response 2");
  });

  it("stream yields multiple chunks", async () => {
    const fake = new FakeLlmProvider("one two three four");
    const chunks: string[] = [];
    for await (const chunk of fake.stream("prompt")) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(4);
    expect(chunks).toEqual(["one", "two", "three", "four"]);
  });
});

describe("llm/errors", () => {
  it("LLMProviderNotAvailableError has correct name and message", async () => {
    const { LLMProviderNotAvailableError } = await import("./errors.js");
    const error = new LLMProviderNotAvailableError("ollama");
    expect(error.name).toBe("LLMProviderNotAvailableError");
    expect(error.message).toBe('LLM provider "ollama" is not available');
    expect(error.provider).toBe("ollama");
  });

  it("LLMTimeoutError has correct name and message", async () => {
    const { LLMTimeoutError } = await import("./errors.js");
    const error = new LLMTimeoutError("anthropic", 30000);
    expect(error.name).toBe("LLMTimeoutError");
    expect(error.message).toBe("LLM provider \"anthropic\" timed out after 30000ms");
    expect(error.provider).toBe("anthropic");
    expect(error.timeoutMs).toBe(30000);
  });

  it("LLMConfigurationError has correct name and message", async () => {
    const { LLMConfigurationError } = await import("./errors.js");
    const error = new LLMConfigurationError("openai", "invalid api key");
    expect(error.name).toBe("LLMConfigurationError");
    expect(error.message).toBe("LLM provider \"openai\" configuration error: invalid api key");
    expect(error.provider).toBe("openai");
    expect(error.reason).toBe("invalid api key");
  });
});