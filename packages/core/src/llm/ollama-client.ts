import type { LlmClient, CompletionOptions } from "./types.js";
import { Ollama } from "ollama";

export class OllamaError extends Error {
  name = "OllamaError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export class OllamaClient implements LlmClient {
  private readonly url: string;
  private readonly model: string;
  private client: Ollama;

  constructor(options: { url?: string; model?: string } = {}) {
    this.url = options.url ?? "http://localhost:11434";
    this.model = options.model ?? "llama3.1";
    this.client = new Ollama({ address: this.url });
  }

  async complete(prompt: string, _options?: CompletionOptions): Promise<string> {
    try {
      let fullResponse = "";
      for await (const token of this.client.generate(this.model, prompt)) {
        fullResponse += token;
      }
      return fullResponse;
    } catch (error) {
      throw new OllamaError(
        `Failed to get completion from Ollama at ${this.url}`,
        error
      );
    }
  }

  async *stream(
    prompt: string,
    _options?: CompletionOptions
  ): AsyncIterable<string> {
    try {
      for await (const token of this.client.generate(this.model, prompt)) {
        yield token;
      }
    } catch (error) {
      throw new OllamaError(
        `Failed to stream from Ollama at ${this.url}`,
        error
      );
    }
  }
}
