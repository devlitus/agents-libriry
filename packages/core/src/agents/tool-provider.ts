export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ToolProvider {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<string[]>;
  runCommand(command: string): Promise<CommandResult>;
}