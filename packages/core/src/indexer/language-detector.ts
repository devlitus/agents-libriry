import { readFile } from "fs/promises";
import { join } from "path";

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

const FRAMEWORK_PATTERNS: Record<string, Record<string, Framework>> = {
  "package.json": {
    express: "express",
    "react-scripts": "react",
    next: "next",
    "@nestjs/core": "nestjs",
  },
  "pyproject.toml": {
    fastapi: "fastapi",
    django: "django",
    flask: "flask",
  },
  "requirements.txt": {
    fastapi: "fastapi",
    django: "django",
    flask: "flask",
  },
  "Cargo.toml": {
    axum: "axum",
    actix: "actix",
  },
  "go.mod": {
    "github.com/gin-gonic/gin": "gin",
    "github.com/labstack/echo": "echo",
  },
  "pom.xml": {
    "spring-boot": "spring",
  },
  "build.gradle": {
    "org.springframework.boot": "spring",
  },
  "composer.json": {
    laravel: "laravel",
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

    if (configFile === "package.json") {
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check for framework first
      for (const [dep, framework] of Object.entries(FRAMEWORK_PATTERNS[configFile])) {
        if (dep in deps) {
          detected.framework = framework;
          break;
        }
      }

      // Detect language based on dependencies
      if ("typescript" in deps || "@types/node" in deps) {
        detected.language = "typescript";
      } else {
        detected.language = "javascript";
      }
    } else if (configFile === "pyproject.toml" || configFile === "requirements.txt") {
      detected.language = "python";
      const lines = content.split("\n");

      for (const line of lines) {
        for (const [dep, framework] of Object.entries(FRAMEWORK_PATTERNS[configFile])) {
          if (line.startsWith(dep) || line.startsWith(`"${dep}`) || line.startsWith(`'${dep}`)) {
            detected.framework = framework;
            break;
          }
        }
        if (detected.framework) break;
      }
    } else if (configFile === "Cargo.toml") {
      detected.language = "rust";
      const lines = content.split("\n");

      for (const line of lines) {
        for (const [dep, framework] of Object.entries(FRAMEWORK_PATTERNS[configFile])) {
          if (line.startsWith(`"${dep}`) || line.startsWith(`'${dep}`)) {
            detected.framework = framework;
            break;
          }
        }
        if (detected.framework) break;
      }
    } else if (configFile === "go.mod") {
      detected.language = "go";
      const lines = content.split("\n");

      for (const line of lines) {
        for (const [dep, framework] of Object.entries(FRAMEWORK_PATTERNS[configFile])) {
          if (line.includes(dep)) {
            detected.framework = framework;
            break;
          }
        }
        if (detected.framework) break;
      }
    } else if (configFile === "pom.xml" || configFile === "build.gradle") {
      detected.language = configFile === "pom.xml" ? "java" : "kotlin";
      const lines = content.split("\n");

      for (const line of lines) {
        for (const [dep, framework] of Object.entries(FRAMEWORK_PATTERNS[configFile])) {
          if (line.includes(dep)) {
            detected.framework = framework;
            break;
          }
        }
        if (detected.framework) break;
      }
    } else if (configFile === "composer.json") {
      detected.language = "php";
      const pkg = JSON.parse(content);
      const deps = { ...pkg.require, ...pkg["require-dev"] };

      for (const [dep, framework] of Object.entries(FRAMEWORK_PATTERNS[configFile])) {
        if (dep in deps) {
          detected.framework = framework;
          break;
        }
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
