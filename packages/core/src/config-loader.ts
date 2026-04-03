import { readFile } from "fs/promises";
import { join, isAbsolute } from "path";
import type { DevAgentsConfig } from "./memory/types.js";
import { LlmProvider } from "./llm/types.js";

export class ConfigLoaderError extends Error {
  name = "ConfigLoaderError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
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

export function getDefaultConfig(): DevAgentsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export async function loadConfig(
  projectRoot?: string
): Promise<DevAgentsConfig> {
  const root = projectRoot ?? process.cwd();
  const configPath = join(root, "agents.config.ts");

  try {
    const content = await readFile(configPath, "utf-8");
    const config = parseConfigFile(content);

    return mergeConfig(DEFAULT_CONFIG, config);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return getDefaultConfig();
    }
    throw new ConfigLoaderError(
      `Failed to load config from ${configPath}`,
      error
    );
  }
}

function parseConfigFile(content: string): Partial<DevAgentsConfig> {
  // Remove type annotations and export keyword for evaluation
  const cleaned = content
    .replace(/import\s+.*?from\s+['"].*?['"]/g, "")
    .replace(/export\s+default\s+/g, "")
    .replace(/:\s*DevAgentsConfig/g, "")
    .replace(/:\s*LlmProvider/g, "")
    .replace(/:\s*boolean/g, "")
    .replace(/:\s*string\[\]/g, "")
    .replace(/:\s*string/g, "")
    .replace(/=\s*\{/g, ": {")
    .replace(/\}\s*;?\s*$/, "}");

  try {
    // Evaluate the config object
    const fn = new Function(`return ${cleaned}`);
    return fn() as Partial<DevAgentsConfig>;
  } catch {
    return {};
  }
}

function mergeConfig(
  defaults: DevAgentsConfig,
  overrides: Partial<DevAgentsConfig>
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
