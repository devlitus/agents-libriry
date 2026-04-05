import * as acp from "@agentclientprotocol/sdk";
import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { ToolProvider, CommandResult } from "@devlitusp/core";

/**
 * Commands allowed to be executed via runCommand().
 * Prevents arbitrary command injection by limiting to known-safe tools.
 */
const ALLOWED_COMMANDS = new Set([
  "npm",
  "pnpm",
  "npx",
  "pnpx",
  "git",
  "node",
  "python",
  "python3",
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "find",
  "grep",
]);

export interface AcpToolProviderDeps {
  connection: acp.AgentSideConnection;
  sessionId: string;
  rootDir?: string;
}

/**
 * Error thrown when a path traversal attack is detected.
 */
export class PathTraversalError extends Error {
  constructor(public readonly path: string) {
    super(`Path traversal detected: ${path}`);
    this.name = "PathTraversalError";
  }

  toJSON(): unknown {
    return {
      name: this.name,
      message: this.message,
      path: this.path,
      ...(process.env.NODE_ENV !== "production" ? { stack: this.stack } : {}),
    };
  }
}

/**
 * Error thrown when a command is not in the allowlist.
 */
export class CommandNotAllowedError extends Error {
  constructor(public readonly command: string) {
    super(`Command not allowed: ${command}`);
    this.name = "CommandNotAllowedError";
  }

  toJSON(): unknown {
    return {
      name: this.name,
      message: this.message,
      command: this.command,
      ...(process.env.NODE_ENV !== "production" ? { stack: this.stack } : {}),
    };
  }
}

export class AcpToolProvider implements ToolProvider {
  private readonly connection: acp.AgentSideConnection;
  private readonly sessionId: string;
  private readonly rootDir: string;

  constructor(deps: AcpToolProviderDeps) {
    this.connection = deps.connection;
    this.sessionId = deps.sessionId;
    this.rootDir = deps.rootDir ?? process.cwd();
  }

  async readFile(path: string): Promise<string> {
    const response = await this.connection.readTextFile({ path });
    if ("content" in response && typeof response.content === "string") {
      return response.content;
    }
    throw new Error(`Failed to read file: ${path}`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.connection.writeTextFile({ path, content });
  }

  async listDirectory(path: string): Promise<string[]> {
    const fullPath = this.resolvePath(path);
    const entries = await readdir(fullPath);
    return entries;
  }

  async runCommand(command: string): Promise<CommandResult> {
    const firstSpaceIndex = command.indexOf(" ");
    const baseCommand = firstSpaceIndex === -1 ? command : command.slice(0, firstSpaceIndex);

    if (!ALLOWED_COMMANDS.has(baseCommand)) {
      throw new CommandNotAllowedError(baseCommand);
    }

    const result = await new Promise<CommandResult>((resolve) => {
      const timeoutMs = 30_000;
      const timer = setTimeout(() => {
        resolve({
          exitCode: 124,
          stdout: "",
          stderr: `Command timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      execFile(
        command,
        { encoding: "utf-8", shell: false },
        (err, stdout, stderr) => {
          clearTimeout(timer);
          resolve({
            exitCode: typeof err?.code === 'number' ? err.code : (err ? 1 : 0),
            stdout: stdout ?? "",
            stderr: stderr ?? "",
          });
        }
      );
    });

    return result;
  }

  private resolvePath(path: string): string {
    if (isAbsolute(path)) {
      throw new PathTraversalError("Absolute paths not allowed");
    }

    const fullPath = resolve(this.rootDir, path);
    const resolvedRoot = resolve(this.rootDir);

    if (!fullPath.startsWith(resolvedRoot)) {
      throw new PathTraversalError(`Path outside project directory: ${path}`);
    }

    return fullPath;
  }
}
