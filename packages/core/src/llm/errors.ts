/**
 * Typed error classes for LLM providers
 * @devagents/core
 */

export class LLMProviderNotAvailableError extends Error {
  name = "LLMProviderNotAvailableError";

  constructor(public readonly provider: string) {
    super(`LLM provider "${provider}" is not available`);
  }
}

export class LLMTimeoutError extends Error {
  name = "LLMTimeoutError";

  constructor(public readonly provider: string, public readonly timeoutMs: number) {
    super(`LLM provider "${provider}" timed out after ${timeoutMs}ms`);
  }
}

export class LLMConfigurationError extends Error {
  name = "LLMConfigurationError";

  constructor(public readonly provider: string, public readonly reason: string) {
    super(`LLM provider "${provider}" configuration error: ${reason}`);
  }
}
