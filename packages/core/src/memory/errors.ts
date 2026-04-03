/**
 * Typed error classes for Memory service
 * @devagents/core
 */

export class MemoryDatabaseError extends Error {
  name = "MemoryDatabaseError";
  cause?: unknown;

  constructor(public readonly reason: string, cause?: unknown) {
    super(`Memory database error: ${reason}`);
    this.cause = cause;
  }
}

export class MemoryNotFoundError extends Error {
  name = "MemoryNotFoundError";

  constructor(public readonly key: string) {
    super(`Memory entry not found: ${key}`);
  }
}
