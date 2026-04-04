/**
 * Tests for setup wizard
 * @devagents/cli
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

// We'll test the non-interactive parts of the setup
// since the full wizard requires user input

describe("setup module", () => {
  const testDir = join(process.cwd(), ".test-setup-" + Date.now());

  beforeEach(async () => {
    // Create test directory
    try {
      await mkdir(testDir, { recursive: true });
    } catch {
      // May already exist
    }
  });

  describe("createEnvFile", () => {
    it("should create .env file for development environment", async () => {
      const { createEnvFile } = await import("../setup.js");
      const envPath = join(testDir, ".env");

      await createEnvFile(envPath, "development", {
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "llama3.1",
        apiKey: "",
      });

      const content = await readFile(envPath, "utf-8");
      expect(content).toContain("NODE_ENV=development");
      expect(content).toContain("OLLAMA_BASE_URL=http://localhost:11434");
      expect(content).toContain("OLLAMA_MODEL=llama3.1");
    });

    it("should create .env file for Anthropic production", async () => {
      const { createEnvFile } = await import("../setup.js");
      const envPath = join(testDir, ".env-anthropic");

      await createEnvFile(envPath, "production", {
        ollamaUrl: "",
        ollamaModel: "",
        provider: "anthropic",
        apiKey: "sk-ant-test123",
      });

      const content = await readFile(envPath, "utf-8");
      expect(content).toContain("ANTHROPIC_API_KEY=sk-ant-test123");
    });

    it("should create .env file for OpenAI production", async () => {
      const { createEnvFile } = await import("../setup.js");
      const envPath = join(testDir, ".env-openai");

      await createEnvFile(envPath, "production", {
        ollamaUrl: "",
        ollamaModel: "",
        provider: "openai",
        apiKey: "sk-openai-test123",
      });

      const content = await readFile(envPath, "utf-8");
      expect(content).toContain("OPENAI_API_KEY=sk-openai-test123");
    });
  });

  describe("createAgentsConfig", () => {
    it("should create agents.config.ts for development", async () => {
      const { createAgentsConfig } = await import("../setup.js");
      const configPath = join(testDir, "agents.config.ts");

      await createAgentsConfig(configPath, "development", {
        ollamaModel: "llama3.1",
        provider: undefined,
        autoTest: true,
        autoReview: true,
      });

      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('provider: "ollama"');
      expect(content).toContain('model: "llama3.1"');
      expect(content).toContain("autoTest: true");
      expect(content).toContain("autoReview: true");
    });

    it("should create agents.config.ts for production anthropic", async () => {
      const { createAgentsConfig } = await import("../setup.js");
      const configPath = join(testDir, "agents.config.anthropic.ts");

      await createAgentsConfig(configPath, "production", {
        ollamaModel: "",
        provider: "anthropic",
        autoTest: false,
        autoReview: true,
      });

      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('provider: "anthropic"');
      expect(content).toContain('model: "claude-sonnet-4-5"');
      expect(content).toContain("autoTest: false");
    });

    it("should create agents.config.ts for production openai", async () => {
      const { createAgentsConfig } = await import("../setup.js");
      const configPath = join(testDir, "agents.config.openai.ts");

      await createAgentsConfig(configPath, "production", {
        ollamaModel: "",
        provider: "openai",
        autoTest: true,
        autoReview: false,
      });

      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('provider: "openai"');
      expect(content).toContain('model: "gpt-4o"');
      expect(content).toContain("autoReview: false");
    });
  });

  describe("updateGitignore", () => {
    it("should create .gitignore if it doesn't exist", async () => {
      const { updateGitignore } = await import("../setup.js");
      const newProjectDir = join(testDir, "new-project");
      await mkdir(newProjectDir, { recursive: true });
      const gitignorePath = join(newProjectDir, ".gitignore");

      await updateGitignore(gitignorePath, [".env", ".devagents/"]);

      const content = await readFile(gitignorePath, "utf-8");
      expect(content).toContain(".env");
      expect(content).toContain(".devagents/");
    });

    it("should add entries without duplicating existing ones", async () => {
      const { updateGitignore } = await import("../setup.js");
      const gitignorePath = join(testDir, ".gitignore");

      // Create initial .gitignore
      await writeFile(gitignorePath, ".env\nnode_modules/\n", "utf-8");

      await updateGitignore(gitignorePath, [".env", ".devagents/", "dist"]);

      const content = await readFile(gitignorePath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      // Count occurrences
      const envLines = lines.filter((l) => l === ".env");
      expect(envLines).toHaveLength(1); // No duplicates
      expect(lines).toContain(".devagents/");
      expect(lines).toContain("dist");
    });

    it("should not add entries that already exist", async () => {
      const { updateGitignore } = await import("../setup.js");
      const gitignorePath = join(testDir, ".gitignore-existing");

      // Create .gitignore with entries
      await writeFile(gitignorePath, ".env\n.devagents/\nnode_modules/\n", "utf-8");

      await updateGitignore(gitignorePath, [".env", ".devagents/"]);

      const content = await readFile(gitignorePath, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      // Should not have duplicates
      expect(lines.filter((l) => l === ".env")).toHaveLength(1);
      expect(lines.filter((l) => l === ".devagents/")).toHaveLength(1);
    });
  });
});
