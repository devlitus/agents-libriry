import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DevAgentsConfig } from "./memory/types.js";
import { LlmProvider } from "./llm/types.js";

/**
 * Error thrown when config loading or parsing fails.
 */
export class ConfigLoaderError extends Error {
  name = "ConfigLoaderError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }

  toJSON(): unknown {
    return {
      name: this.name,
      message: this.message,
      ...(process.env.NODE_ENV !== "production" ? { cause: this.cause, stack: this.stack } : {}),
    };
  }
}

const DEFAULT_CONFIG: DevAgentsConfig = {
  llm: {},
  team: {
    autoTest: true,
    autoReview: true,
    confirmPlan: true,
  },
  indexer: {
    ignore: [],
    alwaysRead: [],
  },
  memory: {
    path: ".devagents/memory.db",
    keepSessionHistory: 20,
  },
};

/**
 * Returns a deep copy of the default configuration.
 */
export function getDefaultConfig(): DevAgentsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/**
 * Parses a JSON configuration string into a partial DevAgentsConfig.
 * Uses JSON.parse directly for secure parsing (no eval).
 */
export function parseJsonConfig(content: string): Partial<DevAgentsConfig> {
  try {
    return JSON.parse(content) as Partial<DevAgentsConfig>;
  } catch {
    return {};
  }
}

/**
 * Loads configuration from the project root.
 *
 * Resolution order:
 * 1. agents.config.json (recommended — secure, uses JSON.parse)
 * 2. Default configuration (if no config file found)
 *
 * @deprecated TypeScript config files (agents.config.ts) are no longer supported.
 *             Use JSON config files (agents.config.json) instead for secure parsing.
 */
export async function loadConfig(
  projectRoot?: string,
): Promise<DevAgentsConfig> {
  const root = projectRoot ?? process.cwd();

  // Only support JSON config (secure, uses JSON.parse)
  const jsonPath = join(root, "agents.config.json");
  try {
    const content = await readFile(jsonPath, "utf-8");
    const config = parseJsonConfig(content);
    return mergeConfig(DEFAULT_CONFIG, config);
  } catch (jsonError) {
    if ((jsonError as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new ConfigLoaderError(`Failed to parse ${jsonPath}`, jsonError);
    }
    // No config file — return defaults silently
    return getDefaultConfig();
  }
}

function mergeConfig(
  defaults: DevAgentsConfig,
  overrides: Partial<DevAgentsConfig>,
): DevAgentsConfig {
  return {
    llm: {
      ...defaults.llm,
      ...overrides.llm,
    },
    team: {
      ...defaults.team,
      ...overrides.team,
    },
    indexer: {
      ...defaults.indexer,
      ...overrides.indexer,
    },
    memory: {
      ...defaults.memory,
      ...overrides.memory,
    },
  };
}

/**
 * Reads configuration from environment variables.
 * Priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > NODE_ENV=development (Ollama)
 */
export function getEnvConfig(): Partial<DevAgentsConfig> {
  const config: Partial<DevAgentsConfig> = {};

  if (process.env.ANTHROPIC_API_KEY) {
    config.llm = { provider: "anthropic" as LlmProvider };
  } else if (process.env.OPENAI_API_KEY) {
    config.llm = { provider: "openai" as LlmProvider };
  } else if (process.env.NODE_ENV === "development") {
    config.llm = { provider: "ollama" as LlmProvider };
  }

  return config;
}
