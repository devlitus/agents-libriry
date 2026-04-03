import { describe, it, expect, vi } from "vitest";
import type { ToolProvider, CommandResult } from "./tool-provider.js";

class FakeToolProvider implements ToolProvider {
  async readFile(_path: string): Promise<string> {
    return "file content";
  }
  async writeFile(_path: string, _content: string): Promise<void> {}
  async listDirectory(_path: string): Promise<string[]> {
    return ["file1.ts", "file2.ts"];
  }
  async runCommand(_cmd: string): Promise<CommandResult> {
    return { exitCode: 0, stdout: "command output", stderr: "" };
  }
}

describe("ToolProvider interface", () => {
  const provider: ToolProvider = new FakeToolProvider();

  it("readFile returns string content", async () => {
    const content = await provider.readFile("/path/to/file.ts");
    expect(typeof content).toBe("string");
  });

  it("writeFile accepts path and content", async () => {
    await expect(provider.writeFile("/path/to/file.ts", "content")).resolves.toBeUndefined();
  });

  it("listDirectory returns array of strings", async () => {
    const files = await provider.listDirectory("/path");
    expect(Array.isArray(files)).toBe(true);
    expect(files[0]).toBeTypeOf("string");
  });

  it("runCommand returns CommandResult", async () => {
    const result = await provider.runCommand("ls");
    expect(result).toHaveProperty("exitCode");
    expect(result).toHaveProperty("stdout");
    expect(result).toHaveProperty("stderr");
    expect(result.exitCode).toBeTypeOf("number");
  });
});

describe("CommandResult structure", () => {
  it("has correct fields for success", () => {
    const result: CommandResult = {
      exitCode: 0,
      stdout: "output",
      stderr: "",
    };
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("");
  });

  it("has correct fields for error", () => {
    const result: CommandResult = {
      exitCode: 1,
      stdout: "",
      stderr: "error message",
    };
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("error message");
  });
});