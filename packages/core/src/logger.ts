/**
 * Structured logging for @devagents
 * Logs go to stderr to avoid contaminating stdout (used by ACP/MCP)
 * @devagents/core
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_ORDER = process.env.NODE_ENV === "production" ? "info" : "debug";

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  args: unknown[]
): string {
  const timestamp = formatTimestamp();
  const formattedArgs =
    args.length > 0 ? " " + args.map((a) => stringifyArg(a)).join(" ") : "";

  if (process.env.NODE_ENV !== "production") {
    const coloredLevel = colorizeLevel(level);
    const coloredModule = chalk.cyan(`[${module}]`);
    return `${timestamp} ${coloredLevel} ${coloredModule} ${message}${formattedArgs}`;
  }

  // Production: JSON lines
  return JSON.stringify({
    timestamp,
    level,
    module,
    message,
    args: args.length > 0 ? args : undefined,
  });
}

function colorizeLevel(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    debug: chalk.gray("[DEBUG]"),
    info: chalk.blue("[INFO]"),
    warn: chalk.yellow("[WARN]"),
    error: chalk.red("[ERROR]"),
  };
  return colors[level];
}

/** Keys that should be redacted from logs */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwd",
  "secret",
  "api_key",
  "apiKey",
  "apikey",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "bearer",
  "credential",
  "private_key",
  "privatekey",
]);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    SENSITIVE_KEYS.has(lower) ||
    lower.includes("password") ||
    lower.includes("secret") ||
    lower.includes("token")
  );
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.message;
  try {
    return JSON.stringify(arg, (key, value) => {
      if (isSensitiveKey(key)) {
        return "[REDACTED]";
      }
      return value;
    });
  } catch {
    return String(arg);
  }
}

function createNoOpChalk() {
  return {
    cyan: (s: string) => s,
    gray: (s: string) => s,
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
  };
}

function createChalk() {
  return {
    cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
    gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
    blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
    red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  };
}

// Chalk import for colors (lazy load to avoid issues in non-TTY environments)
const chalk = process.env.NODE_ENV !== "production" ? createChalk() : createNoOpChalk();

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

class LoggerImpl implements Logger {
  constructor(private readonly module: string) {}

  debug(message: string, ...args: unknown[]): void {
    if (!shouldLog("debug")) return;
    const formatted = formatMessage("debug", this.module, message, args);
    console.error(formatted); // eslint-disable-line no-console
  }

  info(message: string, ...args: unknown[]): void {
    if (!shouldLog("info")) return;
    const formatted = formatMessage("info", this.module, message, args);
    console.error(formatted); // eslint-disable-line no-console
  }

  warn(message: string, ...args: unknown[]): void {
    if (!shouldLog("warn")) return;
    const formatted = formatMessage("warn", this.module, message, args);
    console.error(formatted); // eslint-disable-line no-console
  }

  error(message: string, ...args: unknown[]): void {
    if (!shouldLog("error")) return;
    const formatted = formatMessage("error", this.module, message, args);
    console.error(formatted); // eslint-disable-line no-console
  }
}

// Module-level logger cache
const loggerCache = new Map<string, Logger>();

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string): Logger {
  const cached = loggerCache.get(module);
  if (cached) return cached;

  const logger = new LoggerImpl(module);
  loggerCache.set(module, logger);
  return logger;
}

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
  if (!LOG_LEVELS[level]) {
    throw new Error(`Invalid log level: ${level}`);
  }
  currentLevel = level;
}

/**
 * Get the current global log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Get a logger for a module (convenience function)
 */
export function getLogger(module: string): Logger {
  return createLogger(module);
}
