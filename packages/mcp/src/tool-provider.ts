import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type { ToolProvider, CommandResult } from "@devagents/core";

/**
 * Set of commands allowed to be executed via runCommand().
 * Commands not in this set will be rejected to prevent command injection.
 */
const ALLOWED_COMMANDS = new Set([
  // Package managers
  "npm",
  "pnpm",
  "npx",
  "pnpx",
  // VCS
  "git",
  // Runtimes
  "node",
  "python",
  "python3",
  // File viewing (read-only)
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "find",
  "grep",
  // Shell (for tests)
  "echo",
]);

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

/**
 * Error thrown when a path traversal attempt is detected.
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
 * MCP tool provider that enforces strict security controls:
 * - Command allowlist for runCommand()
 * - Path containment validation for all file operations
 */
export class McpToolProvider implements ToolProvider {
  private readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  /** @inheritdoc */
  async readFile(path: string): Promise<string> {
    const fullPath = this.resolvePath(path);
    const content = await readFile(fullPath, "utf-8");
    return content;
  }

  /** @inheritdoc */
  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await writeFile(fullPath, content, "utf-8");
  }

  /** @inheritdoc */
  async listDirectory(path: string): Promise<string[]> {
    const fullPath = this.resolvePath(path);
    const entries = await readdir(fullPath);
    return entries;
  }

  /** @inheritdoc */
  async runCommand(command: string): Promise<CommandResult> {
    const { execFile } = await import("node:child_process");

    const parts = command.trim().split(/\s+/);
    const binary = parts[0];
    const args = parts.slice(1);

    if (!ALLOWED_COMMANDS.has(binary)) {
      throw new CommandNotAllowedError(binary);
    }

    const result = await new Promise<CommandResult>((resolve) => {
      execFile(
        binary,
        args,
        { encoding: "utf-8", timeout: 30_000 },
        (err, stdout, stderr) => {
          resolve({
            exitCode: typeof err?.code === "number" ? err.code : 0,
            stdout: stdout ?? "",
            stderr: stderr ?? "",
          });
        },
      );
    });

    return result;
  }

  /**
   * Resolves a user-provided path to an absolute path within rootDir.
   * Blocks absolute paths and validates the result stays within rootDir.
   *
   * @param path - User-provided path (relative or absolute)
   * @returns Resolved absolute path within rootDir
   * @throws PathTraversalError if path escapes rootDir
   */
  private resolvePath(path: string): string {
    let resolved: string;

    if (path.startsWith("/")) {
      // Absolute path passed - resolve it and validate containment
      resolved = resolve(path);
    } else {
      // Relative path - resolve against rootDir
      resolved = resolve(this.rootDir, path);
    }

    // Ensure resolved path is within rootDir
    const rel = relative(this.rootDir, resolved);
    if (rel.startsWith("..")) {
      throw new PathTraversalError(path);
    }

    return resolved;
  }
}
