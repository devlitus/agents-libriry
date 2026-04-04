import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ToolProvider, CommandResult } from "@devagents/core";

export class McpToolProvider implements ToolProvider {
  private readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  async readFile(path: string): Promise<string> {
    const fullPath = this.resolvePath(path);
    const content = await readFile(fullPath, "utf-8");
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await writeFile(fullPath, content, "utf-8");
  }

  async listDirectory(path: string): Promise<string[]> {
    const fullPath = this.resolvePath(path);
    const entries = await readdir(fullPath);
    return entries;
  }

  async runCommand(command: string): Promise<CommandResult> {
    const { exec } = await import("node:child_process");
    const result = await new Promise<CommandResult>((resolve) => {
      exec(command, { encoding: "utf-8" }, (err, stdout, stderr) => {
        resolve({
          exitCode: err?.code ?? 0,
          stdout: stdout,
          stderr: stderr,
        });
      });
    });
    return result;
  }

  private resolvePath(path: string): string {
    if (path.startsWith("/")) {
      return path;
    }
    return join(this.rootDir, path);
  }
}
