import * as acp from "@agentclientprotocol/sdk";
import { exec } from "node:child_process";
import type { ToolProvider, CommandResult } from "@devagents/core";

export interface AcpToolProviderDeps {
  connection: acp.AgentSideConnection;
  sessionId: string;
}

export class AcpToolProvider implements ToolProvider {
  private readonly connection: acp.AgentSideConnection;
  private readonly sessionId: string;

  constructor(deps: AcpToolProviderDeps) {
    this.connection = deps.connection;
    this.sessionId = deps.sessionId;
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
    const entries = await new Promise<string[]>((resolve, reject) => {
      exec(`ls -la "${path}"`, { encoding: "utf-8" }, (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        const lines = stdout.split("\n").filter((line) => line.length > 0);
        const result: string[] = [];
        for (const line of lines.slice(1)) {
          const parts = line.split(/\s+/);
          if (parts.length >= 9) {
            const name = parts.slice(8).join(" ");
            if (name !== "." && name !== "..") {
              result.push(name);
            }
          }
        }
        resolve(result);
      });
    });
    return entries;
  }

  async runCommand(command: string): Promise<CommandResult> {
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
}
