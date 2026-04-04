import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type Framework =
  | "express"
  | "react"
  | "next"
  | "nestjs"
  | "fastapi"
  | "django"
  | "flask"
  | "axum"
  | "actix"
  | "gin"
  | "echo"
  | "spring"
  | "laravel"
  | null;

export interface LanguageDetection {
  language: string;
  framework: Framework;
  configFiles: string[];
}

/**
 * Handler that extracts language + framework from config file content.
 */
type ConfigFileHandler = (content: string) => { language?: string; framework: Framework };

const HANDLERS: Record<string, ConfigFileHandler> = {
  "package.json": (content: string) => {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(content);
    } catch {
      // Malformed JSON — treat as generic JS project
      return { language: "javascript", framework: null };
    }
    const deps = { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.devDependencies as Record<string, string> ?? {}) };
    let framework: Framework = null;

    if ("express" in deps) framework = "express";
    else if ("react-scripts" in deps) framework = "react";
    else if ("next" in deps) framework = "next";
    else if ("@nestjs/core" in deps) framework = "nestjs";

    const language = "typescript" in deps || "@types/node" in deps ? "typescript" : "javascript";
    return { language, framework };
  },

  "pyproject.toml": (content: string) => {
    let framework: Framework = null;
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("fastapi")) { framework = "fastapi"; break; }
      if (line.includes("django")) { framework = "django"; break; }
      if (line.includes("flask")) { framework = "flask"; break; }
    }

    return { language: "python", framework };
  },

  "requirements.txt": (content: string) => {
    let framework: Framework = null;
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("fastapi")) { framework = "fastapi"; break; }
      if (line.includes("django")) { framework = "django"; break; }
      if (line.includes("flask")) { framework = "flask"; break; }
    }

    return { language: "python", framework };
  },

  "Cargo.toml": (content: string) => {
    let framework: Framework = null;
    const lines = content.split("\n");

    for (const line of lines) {
      // Normalize: "axum", 'axum', or axum
      const normalized = line.replace(/^(\s*)"([^"]+)".*$/, (_, __, name) => name)
        .replace(/^(\s*)'([^']+)'.*$/, (_, __, name) => name)
        .replace(/^(\s*)([a-zA-Z0-9_-]+)\s*=.*$/, (_, __, name) => name)
        .trim();

      if (normalized === "axum") { framework = "axum"; break; }
      if (normalized === "actix-web") { framework = "actix"; break; }
    }

    return { language: "rust", framework };
  },

  "go.mod": (content: string) => {
    let framework: Framework = null;
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("github.com/gin-gonic/gin")) { framework = "gin"; break; }
      if (line.includes("github.com/labstack/echo")) { framework = "echo"; break; }
    }

    return { language: "go", framework };
  },

  "pom.xml": (content: string) => {
    let framework: Framework = null;
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("org.springframework.boot")) { framework = "spring"; break; }
    }

    return { language: "java", framework };
  },

  "build.gradle": (content: string) => {
    let framework: Framework = null;
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.includes("org.springframework.boot")) { framework = "spring"; break; }
    }

    return { language: "kotlin", framework };
  },

  "composer.json": (content: string) => {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(content);
    } catch {
      // Malformed JSON — treat as PHP project without framework
      return { language: "php", framework: null };
    }
    const deps = { ...(pkg.require as Record<string, string> ?? {}), ...(pkg["require-dev"] as Record<string, string> ?? {}) };
    let framework: Framework = null;

    if ("laravel/framework" in deps) framework = "laravel";

    return { language: "php", framework };
  },
};

export class LanguageDetectorError extends Error {
  name = "LanguageDetectorError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export async function detectLanguage(
  rootDir: string,
  configFiles: string[]
): Promise<LanguageDetection> {
  const detected: LanguageDetection = {
    language: "generic",
    framework: null,
    configFiles: [],
  };

  for (const configFile of configFiles) {
    const fullPath = join(rootDir, configFile);
    let content: string;

    try {
      content = await readFile(fullPath, "utf-8");
    } catch {
      continue;
    }

    detected.configFiles.push(configFile);

    const handler = HANDLERS[configFile];
    if (handler) {
      const result = handler(content);
      if (result.language && detected.language === "generic") {
        detected.language = result.language;
      }
      if (result.framework) {
        detected.framework = result.framework;
      }
    }
  }

  return detected;
}

export const CONFIG_FILE_PATTERNS = [
  "package.json",
  "tsconfig.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  ".gitignore",
  ".env.example",
  "jest.config.js",
  "vitest.config.ts",
  "mocha.opts",
  "pytest.ini",
  "setup.cfg",
];

export async function findConfigFiles(rootDir: string): Promise<string[]> {
  const configs: string[] = [];

  for (const pattern of CONFIG_FILE_PATTERNS) {
    try {
      const fullPath = join(rootDir, pattern);
      const { stat } = await import("fs/promises");
      await stat(fullPath);
      configs.push(pattern);
    } catch {
      // File doesn't exist
    }
  }

  return configs;
}
