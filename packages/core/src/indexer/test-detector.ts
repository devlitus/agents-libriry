import { readFile } from "fs/promises";
import { join } from "path";

export type TestFramework =
  | "jest"
  | "vitest"
  | "mocha"
  | "pytest"
  | "rust-builtin"
  | "generic";

export interface TestDetection {
  framework: TestFramework;
  testFilePattern: string;
  testDirectory: string;
}

const TEST_PATTERNS: Record<string, TestFramework> = {
  jest: "jest",
  vitest: "vitest",
  mocha: "mocha",
  pytest: "pytest",
};

export class TestDetectorError extends Error {
  name = "TestDetectorError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export async function detectTestFramework(
  rootDir: string,
  configFiles: string[],
  existingFiles: string[]
): Promise<TestDetection> {
  const detection: TestDetection = {
    framework: "generic",
    testFilePattern: "*.test.*",
    testDirectory: "__tests__",
  };

  // Check package.json for Jest, Vitest, Mocha
  if (configFiles.includes("package.json")) {
    const pkgPath = join(rootDir, "package.json");
    try {
      const content = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if ("jest" in deps || "jest-cli" in deps) {
        detection.framework = "jest";
        detection.testFilePattern = "*.test.*";
        detection.testDirectory = findTestDirectory(existingFiles, ["__tests__", "tests", "test"]);
        return detection;
      }

      if ("vitest" in deps) {
        detection.framework = "vitest";
        detection.testFilePattern = "*.test.*";
        detection.testDirectory = findTestDirectory(existingFiles, ["__tests__", "tests", "test"]);
        return detection;
      }

      if ("mocha" in deps) {
        detection.framework = "mocha";
        detection.testFilePattern = "*.test.*";
        detection.testDirectory = findTestDirectory(existingFiles, ["__tests__", "tests", "test"]);
        return detection;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check Python files for pytest
  if (
    configFiles.includes("pyproject.toml") ||
    configFiles.includes("requirements.txt") ||
    configFiles.includes("setup.py")
  ) {
    const configPath = configFiles.includes("pyproject.toml")
      ? join(rootDir, "pyproject.toml")
      : configFiles.includes("requirements.txt")
        ? join(rootDir, "requirements.txt")
        : join(rootDir, "setup.py");

    try {
      const content = await readFile(configPath, "utf-8");
      if (content.includes("pytest")) {
        detection.framework = "pytest";
        detection.testFilePattern = "test_*.py";
        detection.testDirectory = "tests";
        return detection;
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check Rust files for built-in testing
  if (configFiles.includes("Cargo.toml")) {
    const cargoPath = join(rootDir, "Cargo.toml");
    try {
      const content = await readFile(cargoPath, "utf-8");
      // Rust has built-in #[cfg(test)] so no extra dependency needed
      detection.framework = "rust-builtin";
      detection.testFilePattern = "*.rs";
      detection.testDirectory = "tests";
      return detection;
    } catch {
      // Ignore read errors
    }
  }

  // Check for existing test files to infer pattern
  const testFiles = existingFiles.filter((f) => {
    const lower = f.toLowerCase();
    return (
      lower.includes(".test.") ||
      lower.includes(".spec.") ||
      lower.includes("test_") ||
      lower.includes("_test.") ||
      lower.includes("__tests__")
    );
  });

  if (testFiles.length > 0) {
    // Infer pattern from existing files
    const sampleFile = testFiles[0];
    const ext = sampleFile.split(".").pop() ?? "";
    const baseName = sampleFile.replace(`.${ext}`, "");

    if (baseName.endsWith(".test")) {
      detection.testFilePattern = "*.test.*";
    } else if (baseName.endsWith(".spec")) {
      detection.testFilePattern = "*.spec.*";
    } else if (baseName.startsWith("test_")) {
      detection.testFilePattern = "test_*.*";
    } else if (baseName.endsWith("_test")) {
      detection.testFilePattern = "*_test.*";
    }

    const parentDir = testFiles[0].split("/").slice(0, -1).join("/");
    if (parentDir && parentDir !== ".") {
      detection.testDirectory = parentDir;
    }
  }

  return detection;
}

function findTestDirectory(files: string[], candidates: string[]): string {
  for (const candidate of candidates) {
    if (files.some((f) => f.startsWith(candidate))) {
      return candidate;
    }
  }
  return candidates[0];
}
