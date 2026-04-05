/**
 * Typed error classes for CLI
 * @devlitusp/cli
 */

export class CliSetupError extends Error {
  name = "CliSetupError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export class CliCheckError extends Error {
  name = "CliCheckError";
  checkType: string;

  constructor(message: string, checkType: string) {
    super(message);
    this.checkType = checkType;
  }
}

export class EnvFileError extends Error {
  name = "EnvFileError";
  path: string;

  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}

export class ConfigFileError extends Error {
  name = "ConfigFileError";
  path: string;

  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}

export class GitignoreError extends Error {
  name = "GitignoreError";
  path: string;

  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}
