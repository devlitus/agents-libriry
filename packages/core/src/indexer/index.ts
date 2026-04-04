export type {
  IndexerConfig,
  ProjectConventions,
  FileTreeNode,
  DetectedProject,
  NamingStyle,
  ImportStyle,
  KeyFileInfo,
} from "./types.js";

export {
  Indexer,
  IndexerError,
  createIndexer,
} from "./indexer.js";

export {
  FileScannerError,
  scanDirectory,
  scanKeyFiles,
  getFileMtime,
} from "./file-scanner.js";

export {
  LanguageDetectorError,
  detectLanguage,
  findConfigFiles,
  CONFIG_FILE_PATTERNS,
  type LanguageDetection,
  type Framework,
} from "./language-detector.js";

export {
  TestDetectorError,
  detectTestFramework,
  type TestFramework,
  type TestDetection,
} from "./test-detector.js";

export {
  ConventionDetectorError,
  detectConventions,
} from "./convention-detector.js";
