import { join, isAbsolute } from "path";
import { scanDirectory, scanKeyFiles, getFileMtime } from "./file-scanner.js";
import { detectLanguage, findConfigFiles, CONFIG_FILE_PATTERNS } from "./language-detector.js";
import { detectTestFramework } from "./test-detector.js";
import { detectConventions } from "./convention-detector.js";
import type {
  IndexerConfig,
  DetectedProject,
  FileTreeNode,
  KeyFileInfo,
} from "./types.js";

export { FileScannerError } from "./file-scanner.js";
export { LanguageDetectorError, detectLanguage, findConfigFiles } from "./language-detector.js";
export { TestDetectorError, detectTestFramework } from "./test-detector.js";
export { ConventionDetectorError, detectConventions } from "./convention-detector.js";

const KEY_FILES = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "tsconfig.json",
  "jest.config.js",
  "vitest.config.ts",
];

export class IndexerError extends Error {
  name = "IndexerError";
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

export class Indexer {
  private readonly config: IndexerConfig;
  private cachedProject: DetectedProject | null = null;
  private lastIndexedAt: number = 0;

  constructor(config: IndexerConfig) {
    this.config = config;
  }

  async index(): Promise<DetectedProject> {
    const rootDir = this.config.rootDir;

    // Run detectors in parallel
    const [fileTree, configFiles, keyFilesMtimes] = await Promise.all([
      scanDirectory({
        rootDir,
        ignore: this.config.ignore,
      }),
      findConfigFiles(rootDir),
      scanKeyFiles(rootDir, KEY_FILES),
    ]);

    // Detect language and framework
    const languageDetection = await detectLanguage(rootDir, configFiles);

    // Detect test framework
    const filePaths = flattenFileTree(fileTree);
    const testDetection = await detectTestFramework(rootDir, configFiles, filePaths);

    // Detect conventions
    const conventions = await detectConventions(rootDir, filePaths);

    // Find entry points
    const entryPoints = findEntryPoints(fileTree, languageDetection.language);

    const project: DetectedProject = {
      language: languageDetection.language,
      framework: languageDetection.framework,
      testFramework: testDetection.framework,
      conventions: {
        ...conventions,
        testFilePattern: testDetection.testFilePattern,
        testDirectory: testDetection.testDirectory,
      },
      fileTree,
      configFiles: languageDetection.configFiles,
      entryPoints,
    };

    this.cachedProject = project;
    this.lastIndexedAt = Date.now();

    return project;
  }

  getCachedProject(): DetectedProject | null {
    return this.cachedProject;
  }

  getLastIndexedAt(): number {
    return this.lastIndexedAt;
  }

  async isIndexFresh(keyFilesMtimes?: Map<string, number>): Promise<boolean> {
    if (!this.cachedProject || !keyFilesMtimes) {
      return false;
    }

    for (const [keyFile, mtime] of keyFilesMtimes) {
      if (mtime > this.lastIndexedAt) {
        return false;
      }
    }

    return true;
  }

  async checkAndReindex(): Promise<{ project: DetectedProject; reindexed: boolean }> {
    const keyFilesMtimes = await scanKeyFiles(this.config.rootDir, KEY_FILES);
    const isFresh = await this.isIndexFresh(keyFilesMtimes);

    if (isFresh && this.cachedProject) {
      return { project: this.cachedProject, reindexed: false };
    }

    const project = await this.index();
    return { project, reindexed: true };
  }
}

function flattenFileTree(nodes: FileTreeNode[], basePath = ""): string[] {
  const files: string[] = [];

  for (const node of nodes) {
    const fullPath = basePath ? `${basePath}/${node.path}` : node.path;

    if (node.type === "file") {
      files.push(fullPath);
    } else if (node.children) {
      files.push(...flattenFileTree(node.children, fullPath));
    }
  }

  return files;
}

function findEntryPoints(fileTree: FileTreeNode[], language: string): string[] {
  const entryPatterns: Record<string, string[]> = {
    typescript: ["src/index.ts", "src/main.ts", "src/app.ts", "index.ts", "main.ts"],
    javascript: ["src/index.js", "src/main.js", "src/app.js", "index.js", "main.js"],
    python: ["main.py", "app.py", "src/__main__.py", "__main__.py"],
    rust: ["src/main.rs", "src/lib.rs", "main.rs", "lib.rs"],
    go: ["main.go", "cmd/main.go"],
    java: ["src/main/java/Main.java", "src/Main.java"],
    kotlin: ["src/main/kotlin/Main.kt", "src/Main.kt"],
    php: ["index.php", "public/index.php", "app/Http/Controllers/Controller.php"],
  };

  const patterns = entryPatterns[language] ?? entryPatterns.typescript;
  const files = flattenFileTree(fileTree);

  const entryPoints: string[] = [];
  for (const pattern of patterns) {
    if (files.includes(pattern) && !entryPoints.includes(pattern)) {
      entryPoints.push(pattern);
    }
  }

  return entryPoints;
}

export async function createIndexer(
  rootDir: string,
  ignore: string[] = [],
  alwaysRead: string[] = []
): Promise<Indexer> {
  const config: IndexerConfig = {
    rootDir: isAbsolute(rootDir) ? rootDir : join(process.cwd(), rootDir),
    ignore,
    alwaysRead,
  };

  return new Indexer(config);
}
