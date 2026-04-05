/**
 * LLM module barrel export
 * @devlitusp/core
 */

export type {
  LlmClient,
  CompletionOptions,
  LlmProvider,
  LlmResponse,
  OllamaOptions,
  AnthropicOptions,
  OpenAIOptions,
  ProviderOptions,
} from "./types.js";

export {
  OllamaClient,
  OllamaError,
} from "./ollama-client.js";

export {
  AnthropicClient,
  AnthropicError,
} from "./anthropic-client.js";

export {
  OpenAIClient,
  OpenAIError,
} from "./openai-client.js";

export {
  createClient,
  detectProvider,
  NoProviderError,
} from "./create-client.js";

export {
  LLMProviderNotAvailableError,
  LLMTimeoutError,
  LLMConfigurationError,
} from "./errors.js";
