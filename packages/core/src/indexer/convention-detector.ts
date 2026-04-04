import { readFile } from "fs/promises";
import { join } from "path";
import type { ProjectConventions, NamingStyle, ImportStyle } from "./types.js";

const MAX_FILES_TO_ANALYZE = 10;

export class ConventionDetectorError extends Error {
  name = "ConventionDetectorError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export async function detectConventions(
  rootDir: string,
  filePaths: string[]
): Promise<ProjectConventions> {
  const codeFiles = filterCodeFiles(filePaths).slice(0, MAX_FILES_TO_ANALYZE);

  if (codeFiles.length === 0) {
    return getDefaultConventions();
  }

  const conventions: ProjectConventions = {
    namingStyle: "camelCase",
    testFilePattern: "*.test.*",
    testDirectory: "__tests__",
    importStyle: "named",
    indentation: "spaces",
    indentSize: 2,
    semicolons: true,
    quotes: "double",
  };

  const namingStyles: Record<NamingStyle, number> = {
    camelCase: 0,
    snake_case: 0,
    PascalCase: 0,
    "kebab-case": 0,
  };

  const importStyles: Record<ImportStyle, number> = {
    named: 0,
    default: 0,
    mixed: 0,
  };

  let tabsCount = 0;
  let spacesCount = 0;
  let semicolonsYes = 0;
  let semicolonsNo = 0;
  let singleQuotes = 0;
  let doubleQuotes = 0;

  for (const filePath of codeFiles) {
    try {
      const fullPath = join(rootDir, filePath);
      const content = await readFile(fullPath, "utf-8");
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

      // Detect naming style
      const identifiers = extractIdentifiers(content, ext);
      for (const id of identifiers) {
        if (isCamelCase(id)) namingStyles.camelCase++;
        else if (isSnakeCase(id)) namingStyles.snake_case++;
        else if (isPascalCase(id)) namingStyles.PascalCase++;
        else if (isKebabCase(id)) namingStyles["kebab-case"]++;
      }

      // Detect import style
      if (ext === "js" || ext === "jsx" || ext === "ts" || ext === "tsx") {
        const { named, default: def, mixed } = detectImportStyle(content);
        importStyles.named += named;
        importStyles.default += def;
        importStyles.mixed += mixed;

        // Detect indentation
        if (content.includes("\t")) tabsCount++;
        else spacesCount++;

        // Detect semicolons
        const semiMatches = content.match(/;/g);
        if (semiMatches) semicolonsYes += semiMatches.length;
        const noSemiMatches = content.match(/[^;]\s*$/gm);
        if (noSemiMatches) semicolonsNo += noSemiMatches.length;

        // Detect quotes
        const singleQuoteMatches = content.match(/'/g);
        const doubleQuoteMatches = content.match(/"/g);
        if (singleQuoteMatches) singleQuotes += singleQuoteMatches.length;
        if (doubleQuoteMatches) doubleQuotes += doubleQuoteMatches.length;
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Determine most frequent patterns
  const maxNaming = Math.max(...Object.values(namingStyles));
  const namingEntry = Object.entries(namingStyles).find(([, v]) => v === maxNaming);
  if (namingEntry && maxNaming > 0) {
    conventions.namingStyle = namingEntry[0] as NamingStyle;
  }

  const maxImport = Math.max(...Object.values(importStyles));
  const importEntry = Object.entries(importStyles).find(([, v]) => v === maxImport);
  if (importEntry && maxImport > 0) {
    conventions.importStyle = importEntry[0] as ImportStyle;
  }

  conventions.indentation = tabsCount > spacesCount ? "tabs" : "spaces";

  if (semicolonsYes > semicolonsNo) {
    conventions.semicolons = true;
  } else if (semicolonsNo > semicolonsYes) {
    conventions.semicolons = false;
  }

  if (doubleQuotes > singleQuotes) {
    conventions.quotes = "double";
  } else if (singleQuotes > doubleQuotes) {
    conventions.quotes = "single";
  }

  return conventions;
}

function getDefaultConventions(): ProjectConventions {
  return {
    namingStyle: "camelCase",
    testFilePattern: "*.test.*",
    testDirectory: "__tests__",
    importStyle: "named",
    indentation: "spaces",
    indentSize: 2,
    semicolons: true,
    quotes: "double",
  };
}

function filterCodeFiles(filePaths: string[]): string[] {
  const codeExtensions = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "rs",
    "go",
    "java",
    "kt",
    "php",
  ];

  return filePaths.filter((path) => {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return codeExtensions.includes(ext);
  });
}

function extractIdentifiers(content: string, ext: string): string[] {
  const identifiers: string[] = [];

  if (ext === "py") {
    const matches = content.match(/[a-z_][a-z0-9_]*/gi);
    if (matches) identifiers.push(...matches);
  } else {
    const matches = content.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
    if (matches) identifiers.push(...matches);
  }

  return [...new Set(identifiers)];
}

function isCamelCase(str: string): boolean {
  return /^[a-z][a-zA-Z0-9]+$/.test(str) && str.length > 1;
}

function isSnakeCase(str: string): boolean {
  return /^[a-z][a-z0-9_]+$/.test(str) && str.includes("_");
}

function isPascalCase(str: string): boolean {
  return /^[A-Z][a-zA-Z0-9]+$/.test(str) && str.length > 1;
}

function isKebabCase(str: string): boolean {
  return /^[a-z][a-z0-9-]+$/.test(str) && str.includes("-");
}

function detectImportStyle(
  content: string
): { named: number; default: number; mixed: number } {
  const named = (content.match(/^import\s*\{\s*[^}]+\}\s*from/gm) || []).length;
  const def = (content.match(/^import\s+[A-Z]\w*\s+from/gm) || []).length;
  const mixed = (content.match(/^import\s+[^,]+,\s*\{/gm) || []).length;

  return { named, default: def, mixed };
}
