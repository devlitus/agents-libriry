/**
 * Error thrown when a test path contains shell metacharacters.
 * This prevents command injection attacks when executing test commands.
 */
export class InvalidTestPathError extends Error {
  public constructor(path: string, reason: string) {
    super(`Invalid test path "${path}": ${reason}`);
    this.name = 'InvalidTestPathError';
  }
}
