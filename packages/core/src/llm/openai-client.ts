import type { LlmClient, CompletionOptions } from "./types.js";

const DEFAULT_MODEL = "gpt-4o";

/**
 * Error thrown when OpenAI API key is missing or request fails
 */
export class OpenAIError extends Error {
  name = "OpenAIError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/**
 * OpenAI LLM provider
 * Uses openai SDK
 */
export class OpenAIClient implements LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private client: unknown;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options.model ?? DEFAULT_MODEL;

    if (!this.apiKey) {
      throw new OpenAIError("OPENAI_API_KEY environment variable is not set");
    }

    if (!this.apiKey.startsWith("sk-")) {
      throw new OpenAIError("Invalid OPENAI_API_KEY format: must start with 'sk-'");
    }
  }

  private async getClient() {
    if (!this.client) {
      const OpenAI = await import("openai");
      this.client = new OpenAI.OpenAI({ apiKey: this.apiKey });
    }
    return this.client as {
      chat: {
        completions: {
          create: (options: Record<string, unknown>) => Promise<{
            choices: Array<{ message: { content: string } }>;
          }>;
        };
      };
    };
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const client = await this.getClient();

    const createOptions: Record<string, unknown> = {
      model: this.model,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: "system", content: options.systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
    };

    if (options?.temperature !== undefined) {
      createOptions.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      createOptions.max_tokens = options.maxTokens;
    }
    if (options?.stopSequences) {
      createOptions.stop = options.stopSequences;
    }

    try {
      const response = await client.chat.completions.create(createOptions);
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      throw new OpenAIError("Failed to get completion from OpenAI", error);
    }
  }

  async *stream(
    prompt: string,
    options?: CompletionOptions
  ): AsyncIterable<string> {
    const client = await this.getClient();

    const createOptions: Record<string, unknown> = {
      model: this.model,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: "system", content: options.systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
      stream: true,
    };

    if (options?.temperature !== undefined) {
      createOptions.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      createOptions.max_tokens = options.maxTokens;
    }

    try {
      const response = await client.chat.completions.create(createOptions);

      const stream = response as unknown as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      throw new OpenAIError("Failed to stream from OpenAI", error);
    }
  }
}
