// LLM module exports
export type {
  LlmClient,
  CompletionOptions,
  LlmProvider,
  LlmResponse,
  OllamaOptions,
  AnthropicOptions,
  OpenAIOptions,
} from "./llm/types.js";

export {
  OllamaClient,
  OllamaError,
} from "./llm/ollama-client.js";

export {
  AnthropicClient,
  AnthropicError,
} from "./llm/anthropic-client.js";

export {
  OpenAIClient,
  OpenAIError,
} from "./llm/openai-client.js";

export {
  createClient,
  detectProvider,
  NoProviderError,
} from "./llm/create-client.js";

export {
  LLMProviderNotAvailableError,
  LLMTimeoutError,
  LLMConfigurationError,
} from "./llm/errors.js";

// Memory module exports
export type {
  ProjectIndex,
  AgentMemoryEntry,
  SessionHistoryEntry,
  MemoryService,
  UserConfirmation,
  AgentResult,
  DevAgentsConfig,
} from "./memory/types.js";

export type {
  AgentName,
} from "./types.js";

export {
  SqliteMemoryService,
  SqliteMemoryError,
  createMemoryService,
} from "./memory/sqlite-memory.js";

export {
  MemoryDatabaseError,
  MemoryNotFoundError,
} from "./memory/errors.js";

// Indexer module exports
export type {
  IndexerConfig,
  ProjectConventions,
  FileTreeNode,
  DetectedProject,
  NamingStyle,
  ImportStyle,
  KeyFileInfo,
} from "./indexer/types.js";

export {
  Indexer,
  IndexerError,
  createIndexer,
} from "./indexer/indexer.js";

export {
  FileScannerError,
  scanDirectory,
  scanKeyFiles,
  getFileMtime,
} from "./indexer/file-scanner.js";

export {
  LanguageDetectorError,
  detectLanguage,
  findConfigFiles,
  CONFIG_FILE_PATTERNS,
  type LanguageDetection,
  type Framework,
} from "./indexer/language-detector.js";

export {
  TestDetectorError,
  detectTestFramework,
  type TestFramework,
  type TestDetection,
} from "./indexer/test-detector.js";

export {
  ConventionDetectorError,
  detectConventions,
} from "./indexer/convention-detector.js";

// Config loader exports
export {
  loadConfig,
  getDefaultConfig,
  getEnvConfig,
  ConfigLoaderError,
} from "./config-loader.js";

// Orchestrator exports
export { Orchestrator } from "./orchestrator/orchestrator.js";
export type { OrchestratorOptions } from "./orchestrator/orchestrator.js";
export { NoOpConfirmationHandler } from "./orchestrator/confirmation.js";
export { parseCommand } from "./orchestrator/command-parser.js";
export { selectAgentsForPrompt } from "./orchestrator/agent-selector.js";
export { generatePlan, formatPlanForDisplay } from "./orchestrator/plan-generator.js";

// Agent types exports
export type {
  ToolProvider,
  CommandResult,
} from "./agents/tool-provider.js";

export type {
  OrchestratorEvent,
  PlanDefinition,
  PlanStep,
  ConfirmationHandler,
} from "./agents/orchestrator-types.js";

export type {
  Agent,
  AgentContext,
  AgentExecutionResult,
} from "./agents/types.js";

// Agent exports
export { ArchitectAgent } from "./agents/architect/architect.js";
export { CoderAgent } from "./agents/coder/coder.js";
export { TesterAgent } from "./agents/tester/tester.js";
export { ReviewerAgent } from "./agents/reviewer/reviewer.js";

export const VERSION = "0.0.1";
