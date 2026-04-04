/**
 * Interactive setup wizard for @devagents
 * @devagents/cli
 */

import { intro, outro, select, text, confirm } from "@clack/prompts";
import { writeFile, mkdir, readFile, access, constants } from "node:fs/promises";
import { join } from "node:path";
import { CliSetupError, EnvFileError, ConfigFileError, GitignoreError } from "./errors.js";

export interface SetupAnswers {
  environment: "development" | "production";
  provider?: "anthropic" | "openai";
  ollamaUrl?: string;
  ollamaModel?: string;
  apiKey?: string;
  autoTest: boolean;
  autoReview: boolean;
}

interface SetupResult {
  envCreated: boolean;
  configCreated: boolean;
  gitignoreUpdated: boolean;
  devagentsCreated: boolean;
  errors: string[];
}

const DOTENV_DEV_TEMPLATE = `NODE_ENV=development
OLLAMA_BASE_URL={OLLAMA_BASE_URL}
OLLAMA_MODEL={OLLAMA_MODEL}
`;

const DOTENV_ANTHROPIC_TEMPLATE = `ANTHROPIC_API_KEY={API_KEY}
`;

const DOTENV_OPENAI_TEMPLATE = `OPENAI_API_KEY={API_KEY}
`;

const AGENTS_CONFIG_TEMPLATE = `import type { DevAgentsConfig } from "@devagents/core";

const config: DevAgentsConfig = {
  llm: {
    provider: "{PROVIDER}",
    model: "{MODEL}",
  },
  team: {
    autoTest: {AUTO_TEST},
    autoReview: {AUTO_REVIEW},
    confirmPlan: true,
  },
};

export default config;
`;

/**
 * Run the interactive setup wizard
 */
export async function runSetup(projectRoot?: string): Promise<SetupResult> {
  const root = projectRoot ?? process.cwd();
  const result: SetupResult = {
    envCreated: false,
    configCreated: false,
    gitignoreUpdated: false,
    devagentsCreated: false,
    errors: [],
  };

  try {
    intro("devagents setup");

    // Step 1: Ask environment
    const envChoice = (await select({
      message: "Choose your environment:",
      options: [
        { value: "development", label: "Development (Ollama - local, free)" },
        { value: "production", label: "Production (API key required)" },
      ],
    })) as string;

    const environment: "development" | "production" = envChoice === "production" ? "production" : "development";

    let ollamaUrl = "http://localhost:11434";
    let ollamaModel = "llama3.1";
    let provider: "anthropic" | "openai" | undefined;
    let apiKey = "";

    if (environment === "development") {
      // Step 2a: Ask Ollama URL
      const customUrl = (await text({
        message: "Ollama URL:",
        defaultValue: ollamaUrl,
      })) as string;
      ollamaUrl = customUrl || ollamaUrl;

      // Step 2b: Ask model
      const customModel = (await text({
        message: "Model:",
        defaultValue: ollamaModel,
      })) as string;
      ollamaModel = customModel || ollamaModel;
    } else {
      // Step 2c: Ask provider
      const providerChoice = (await select({
        message: "Choose your LLM provider:",
        options: [
          { value: "anthropic", label: "Anthropic (Claude)" },
          { value: "openai", label: "OpenAI (GPT)" },
        ],
      })) as string;
      provider = providerChoice as "anthropic" | "openai";

      // Step 2d: Ask API key
      const key = (await text({
        message: `${provider === "anthropic" ? "Anthropic" : "OpenAI"} API Key:`,
      })) as string;
      apiKey = key;
    }

    // Step 3: Ask about auto test
    const autoTest = await confirm({
      message: "Enable Tester automatically?",
      initialValue: true,
    });

    // Step 4: Ask about auto review
    const autoReview = await confirm({
      message: "Enable Reviewer automatically?",
      initialValue: true,
    });

    // Step 5: Create .env file
    const envPath = join(root, ".env");
    const envExists = await fileExists(envPath);

    if (envExists) {
      const shouldOverwrite = await confirm({
        message: ".env already exists. Overwrite?",
        initialValue: false,
      });

      if (!shouldOverwrite) {
        result.errors.push(".env file not created (user chose not to overwrite)");
      } else {
        await createEnvFile(envPath, environment, {
          ollamaUrl,
          ollamaModel,
          provider,
          apiKey,
        });
        result.envCreated = true;
      }
    } else {
      await createEnvFile(envPath, environment, {
        ollamaUrl,
        ollamaModel,
        provider,
        apiKey,
      });
      result.envCreated = true;
    }

    // Step 6: Create agents.config.ts
    const configPath = join(root, "agents.config.ts");
    const configExists = await fileExists(configPath);

    if (configExists) {
      const shouldOverwrite = await confirm({
        message: "agents.config.ts already exists. Overwrite?",
        initialValue: false,
      });

      if (!shouldOverwrite) {
        result.errors.push("agents.config.ts not created (user chose not to overwrite)");
      } else {
        await createAgentsConfig(configPath, environment, {
          ollamaModel,
          provider,
          autoTest: autoTest as boolean,
          autoReview: autoReview as boolean,
        });
        result.configCreated = true;
      }
    } else {
      await createAgentsConfig(configPath, environment, {
        ollamaModel,
        provider,
        autoTest: autoTest as boolean,
        autoReview: autoReview as boolean,
      });
      result.configCreated = true;
    }

    // Step 7: Create .devagents/ directory
    const devagentsDir = join(root, ".devagents");
    try {
      await mkdir(devagentsDir, { recursive: true });
      result.devagentsCreated = true;
    } catch (err) {
      result.errors.push(`.devagents/ directory: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 8: Update .gitignore
    const gitignorePath = join(root, ".gitignore");
    const gitignoreUpdated = await updateGitignore(gitignorePath, [".env", ".devagents/"]);
    result.gitignoreUpdated = gitignoreUpdated;
    if (!gitignoreUpdated) {
      result.errors.push(".gitignore not updated");
    }

    // Step 9: Show summary
    showSummary(result);

    outro("Next: Run `npx devagents check` to verify your setup");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      outro("Setup cancelled");
      return result;
    }
    throw err;
  }

  return result;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function createEnvFile(
  path: string,
  environment: "development" | "production",
  options: {
    ollamaUrl: string;
    ollamaModel: string;
    provider?: "anthropic" | "openai";
    apiKey: string;
  }
): Promise<void> {
  try {
    let content: string;

    if (environment === "development") {
      content = DOTENV_DEV_TEMPLATE.replace("{OLLAMA_BASE_URL}", options.ollamaUrl).replace(
        "{OLLAMA_MODEL}",
        options.ollamaModel
      );
    } else if (options.provider === "anthropic") {
      content = DOTENV_ANTHROPIC_TEMPLATE.replace("{API_KEY}", options.apiKey);
    } else {
      content = DOTENV_OPENAI_TEMPLATE.replace("{API_KEY}", options.apiKey);
    }

    await writeFile(path, content, "utf-8");
  } catch (err) {
    throw new EnvFileError(
      `Failed to create .env file: ${err instanceof Error ? err.message : String(err)}`,
      path
    );
  }
}

export async function createAgentsConfig(
  path: string,
  environment: "development" | "production",
  options: {
    ollamaModel: string;
    provider?: "anthropic" | "openai";
    autoTest: boolean;
    autoReview: boolean;
  }
): Promise<void> {
  try {
    let provider: string;
    let model: string;

    if (environment === "development") {
      provider = "ollama";
      model = options.ollamaModel;
    } else if (options.provider === "anthropic") {
      provider = "anthropic";
      model = "claude-sonnet-4-5";
    } else {
      provider = "openai";
      model = "gpt-4o";
    }

    const content = AGENTS_CONFIG_TEMPLATE.replace("{PROVIDER}", provider)
      .replace("{MODEL}", model)
      .replace("{AUTO_TEST}", String(options.autoTest))
      .replace("{AUTO_REVIEW}", String(options.autoReview));

    await writeFile(path, content, "utf-8");
  } catch (err) {
    throw new ConfigFileError(
      `Failed to create agents.config.ts: ${err instanceof Error ? err.message : String(err)}`,
      path
    );
  }
}

export async function updateGitignore(gitignorePath: string, entries: string[]): Promise<boolean> {
  try {
    let content = "";
    let existingEntries: string[] = [];

    try {
      content = await readFile(gitignorePath, "utf-8");
      existingEntries = content.split("\n");
    } catch {
      // File doesn't exist, will be created
    }

    let updated = false;
    const lines: string[] = [...existingEntries];

    for (const entry of entries) {
      const trimmedEntry = entry.trim();
      if (!trimmedEntry) continue;

      // Check if entry already exists (as exact match or with trailing slash差异)
      const exists = lines.some(
        (line) => line.trim() === trimmedEntry || line.trim() === trimmedEntry.replace(/\/$/, "")
      );

      if (!exists) {
        lines.push(trimmedEntry);
        updated = true;
      }
    }

    if (updated) {
      await writeFile(gitignorePath, lines.join("\n") + "\n", "utf-8");
    }

    return true;
  } catch (err) {
    throw new GitignoreError(
      `Failed to update .gitignore: ${err instanceof Error ? err.message : String(err)}`,
      gitignorePath
    );
  }
}

function showSummary(result: SetupResult): void {
  console.log("\n--- Setup Summary ---");

  if (result.envCreated) {
    console.log("✓  .env created");
  }

  if (result.configCreated) {
    console.log("✓  agents.config.ts created");
  }

  if (result.gitignoreUpdated) {
    console.log("✓  .env added to .gitignore");
    console.log("✓  .devagents/ added to .gitignore");
  }

  if (result.devagentsCreated) {
    console.log("✓  .devagents/ directory created");
  }

  for (const error of result.errors) {
    console.log(`✗  ${error}`);
  }
}
