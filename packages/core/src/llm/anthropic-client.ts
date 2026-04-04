import type { LlmClient, CompletionOptions } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-5";

/**
 * Error thrown when Anthropic API key is missing or request fails
 */
export class AnthropicError extends Error {
  name = "AnthropicError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/**
 * Anthropic LLM provider
 * Uses @anthropic-ai/sdk
 */
export class AnthropicClient implements LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private client: unknown;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = options.model ?? DEFAULT_MODEL;

    if (!this.apiKey) {
      throw new AnthropicError("ANTHROPIC_API_KEY environment variable is not set");
    }

    if (!this.apiKey.startsWith("sk-ant-")) {
      throw new AnthropicError("Invalid ANTHROPIC_API_KEY format: must start with 'sk-ant-'");
    }
  }

  private async getClient() {
    if (!this.client) {
      const anthropic = await import("@anthropic-ai/sdk");
      this.client = new anthropic.Anthropic({ apiKey: this.apiKey });
    }
    return this.client as {
      messages: {
        create: (options: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>;
        stream: (options: Record<string, unknown>) => AsyncIterable<unknown>;
      };
    };
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const client = await this.getClient();

    const createOptions: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      messages: [{ role: "user", content: prompt }],
    };

    if (options?.systemPrompt) {
      createOptions.system = options.systemPrompt;
    }
    if (options?.temperature !== undefined) {
      createOptions.temperature = options.temperature;
    }
    if (options?.stopSequences) {
      createOptions.stop_sequences = options.stopSequences;
    }

    try {
      const response = await client.messages.create(createOptions);
      return response.content[0]?.text ?? "";
    } catch (error) {
      throw new AnthropicError("Failed to get completion from Anthropic", error);
    }
  }

  async *stream(
    prompt: string,
    options?: CompletionOptions
  ): AsyncIterable<string> {
    const client = await this.getClient();

    const streamOptions: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 4096,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    };

    if (options?.systemPrompt) {
      streamOptions.system = options.systemPrompt;
    }
    if (options?.temperature !== undefined) {
      streamOptions.temperature = options.temperature;
    }

    try {
      const response = await client.messages.stream(streamOptions);

      for await (const event of response) {
        const e = event as { type?: string; delta?: { text?: string } };
        if (e.type === "content_block_delta" && e.delta?.text) {
          yield e.delta.text;
        }
      }
    } catch (error) {
      throw new AnthropicError("Failed to stream from Anthropic", error);
    }
  }
}
