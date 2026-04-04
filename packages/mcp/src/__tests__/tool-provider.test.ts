import { describe, it, expect, beforeAll } from "vitest";
import { McpToolProvider } from "../tool-provider.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("McpToolProvider", () => {
  const testDir = join(tmpdir(), "mcp-test-" + Date.now());

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  describe("readFile", () => {
    it("reads file content", async () => {
      const testFile = join(testDir, "read-test.txt");
      await writeFile(testFile, "test content", "utf-8");

      const provider = new McpToolProvider(testDir);
      const result = await provider.readFile("read-test.txt");
      expect(result).toBe("test content");
    });
  });

  describe("writeFile", () => {
    it("writes file content", async () => {
      const testFile = join(testDir, "write-test.txt");
      const provider = new McpToolProvider(testDir);

      await provider.writeFile("write-test.txt", "new content");
      const result = await readFile(testFile, "utf-8");
      expect(result).toBe("new content");
    });
  });

  describe("listDirectory", () => {
    it("returns array of filenames", async () => {
      const provider = new McpToolProvider(testDir);
      const result = await provider.listDirectory(testDir);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("runCommand", () => {
    it("returns CommandResult with exitCode, stdout, stderr", async () => {
      const provider = new McpToolProvider(testDir);
      const result = await provider.runCommand("echo hello");

      expect(result).toHaveProperty("exitCode");
      expect(result).toHaveProperty("stdout");
      expect(result).toHaveProperty("stderr");
      expect(result.stdout.trim()).toBe("hello");
    });
  });
});
