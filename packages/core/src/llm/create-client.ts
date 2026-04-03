import type { LlmClient, LlmProvider } from "./types.js";
import { OllamaClient } from "./ollama-client.js";
import { AnthropicClient } from "./anthropic-client.js";
import { OpenAIClient } from "./openai-client.js";

export { OllamaClient, AnthropicClient, OpenAIClient };

/**
 * Error thrown when no LLM provider is available
 */
export class NoProviderError extends Error {
  name = "NoProviderError";

  constructor(message: string) {
    super(message);
  }
}

interface CreateClientOptions {
  provider?: LlmProvider;
  model?: string;
  apiKey?: string;
  url?: string;
}

/**
 * Creates an LLM client based on environment variables or explicit config
 *
 * Detection priority:
 * 1. Explicit config in options.provider
 * 2. NODE_ENV=development → Ollama
 * 3. ANTHROPIC_API_KEY env var → Anthropic
 * 4. OPENAI_API_KEY env var → OpenAI
 * 5. None → Error
 *
 * Note: NODE_ENV=development + ANTHROPIC_API_KEY → Ollama wins (unless explicit config)
 */
export function createClient(options: CreateClientOptions = {}): LlmClient {
  const { provider, model, apiKey, url } = options;

  // 1. Explicit config takes priority
  if (provider) {
    return createProviderClient(provider, { model, apiKey, url });
  }

  // 2. NODE_ENV=development → Ollama (unless ANTHROPIC_API_KEY is explicitly set and no config)
  if (process.env.NODE_ENV === "development") {
    // Only use Ollama if ANTHROPIC_API_KEY is not set
    // This allows dev mode to still use Anthropic if key is provided
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      return new OllamaClient({ url, model });
    }
  }

  // 3. ANTHROPIC_API_KEY → Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY, model });
  }

  // 4. OPENAI_API_KEY → OpenAI
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY, model });
  }

  // 5. None available
  throw new NoProviderError(
    "No LLM provider available. Run 'npx devagents setup' or set ANTHROPIC_API_KEY / OPENAI_API_KEY environment variables."
  );
}

function createProviderClient(
  provider: LlmProvider,
  options: { model?: string; apiKey?: string; url?: string }
): LlmClient {
  switch (provider) {
    case "ollama":
      return new OllamaClient({ url: options.url, model: options.model });
    case "anthropic":
      return new AnthropicClient({
        apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
        model: options.model,
      });
    case "openai":
      return new OpenAIClient({
        apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
        model: options.model,
      });
    default:
      throw new NoProviderError(`Unsupported provider: ${provider}`);
  }
}

/**
 * Detects which provider should be used based on environment
 */
export function detectProvider(): LlmProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.NODE_ENV === "development") return "ollama";
  return null;
}
