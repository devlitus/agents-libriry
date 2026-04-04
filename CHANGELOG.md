# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-04

### Added

#### @devagents/core
- **Orchestrator**: Coordinates multi-agent workflows with event streaming
- **Architect Agent**: Analyzes codebase and creates implementation plans
- **Coder Agent**: Implements code with diff generation and confirmation flow
- **Tester Agent**: Generates tests matching the project's test framework
- **Reviewer Agent**: Checks code quality, security, and consistency
- **LLM Abstraction**: Support for Ollama (development), Anthropic, and OpenAI
- **Memory Service**: SQLite-based persistence with project index, agent memory, and session history
- **Indexer**: Automatic language/framework detection and convention discovery
- **Structured Logging**: Configurable log levels with JSON output in production

#### @devagents/acp
- ACP transport for Zed, JetBrains, and VS Code
- Agent registration with capabilities negotiation
- Event streaming for real-time agent progress
- File write and terminal command confirmations

#### @devagents/mcp
- MCP transport for Claude Code, Cursor, and Copilot
- 7 tools: orchestrate, architect, coder, tester, reviewer, plan, status
- 3 resources: project://index, project://sessions, project://config
- Structured result formatting

#### @devagents/cli
- `devagents setup`: Interactive wizard for environment configuration
- `devagents check`: Verify LLM, binaries, SQLite, and config
- `devagents init-ide`: IDE-specific configuration generator
- Support for Zed, JetBrains, VS Code (ACP), VS Code (MCP), Claude Code, Cursor

### Features

- Multi-language support: TypeScript, Python, Rust, Go, Java, PHP
- Automatic test framework detection: Jest, Vitest, Mocha, pytest
- Project-specific conventions (naming, imports, indentation)
- Session history with configurable retention
- Security checks for credentials and SQL injection
- Confirmation gates for all file writes and terminal commands

### Infrastructure

- TypeScript strict mode
- pnpm workspaces monorepo
- tsup for builds (CJS + ESM)
- vitest for testing
- changesets for versioning

## [0.0.1] - 2024 (Initial scaffolding)

Initial monorepo setup with Phase 0-3 completed.
