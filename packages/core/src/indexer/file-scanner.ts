import { readdir, stat } from "fs/promises";
import { join, relative, isAbsolute } from "path";
import type { FileTreeNode } from "./types.js";

const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".devagents",
  "coverage",
  "__pycache__",
  ".venv",
  "target",
  ".idea",
  ".vscode",
  ".DS_Store",
];

const MAX_DEPTH = 10;
const MAX_FILES = 5000;

export class FileScannerError extends Error {
  name = "FileScannerError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export interface ScanOptions {
  rootDir: string;
  ignore?: string[];
  maxDepth?: number;
  maxFiles?: number;
}

export async function scanDirectory(options: ScanOptions): Promise<FileTreeNode[]> {
  const {
    rootDir,
    ignore = [],
    maxDepth = MAX_DEPTH,
    maxFiles = MAX_FILES,
  } = options;

  const ignores = [...DEFAULT_IGNORES, ...ignore];
  const files: FileTreeNode[] = [];
  let fileCount = 0;

  async function traverse(
    dir: string,
    relativePath: string,
    depth: number
  ): Promise<FileTreeNode[]> {
    if (depth > maxDepth || fileCount >= maxFiles) {
      return [];
    }

    const nodes: FileTreeNode[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (ignores.includes(entry.name)) continue;

        const entryPath = join(dir, entry.name);
        const entryRelativePath = join(relativePath, entry.name);

        if (entry.isDirectory()) {
          const children = await traverse(entryPath, entryRelativePath, depth + 1);
          if (children.length > 0) {
            nodes.push({
              path: entryRelativePath,
              type: "directory",
              children,
            });
          }
        } else if (entry.isFile()) {
          fileCount++;
          nodes.push({
            path: entryRelativePath,
            type: "file",
          });
        }
      }
    } catch (error) {
      throw new FileScannerError(
        `Failed to scan directory: ${dir}`,
        error
      );
    }

    return nodes;
  }

  return traverse(rootDir, ".", 0);
}

export async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

export async function scanKeyFiles(
  rootDir: string,
  keyFiles: string[]
): Promise<Map<string, number>> {
  const mtimes = new Map<string, number>();

  for (const keyFile of keyFiles) {
    const fullPath = isAbsolute(keyFile)
      ? keyFile
      : join(rootDir, keyFile);

    const mtime = await getFileMtime(fullPath);
    if (mtime > 0) {
      mtimes.set(keyFile, mtime);
    }
  }

  return mtimes;
}
