/**
 * LLM provider types and interfaces for @devagents/core
 * @devagents/core
 */

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface LlmResponse {
  text: string;
  tokensUsed: number;
}

export interface LlmClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
}

export type LlmProvider = "ollama" | "anthropic" | "openai";

export interface OllamaOptions {
  url?: string;
  model?: string;
}

export interface AnthropicOptions {
  apiKey?: string;
  model?: string;
}

export interface OpenAIOptions {
  apiKey?: string;
  model?: string;
}

export type ProviderOptions = OllamaOptions | AnthropicOptions | OpenAIOptions;
