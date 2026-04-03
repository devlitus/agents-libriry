# Phase 0 — Monorepo Scaffolding

**Objective:** Create the monorepo structure, configure tooling, and leave everything ready so that subsequent phases only write business logic.

**Dependencies:** None (this is the first phase)

---

## Task 0.1 — Initialize monorepo with pnpm workspaces `[M]`

### 0.1.1 — Create root `package.json`
- Initialize with `pnpm init`
- Set `"private": true` (monorepo, not published)
- Add `"engines": { "node": ">=20" }`
- Add root scripts: `build`, `test`, `lint`, `clean`
- [ ] `package.json` exists at root with `private: true`
- [ ] Scripts `build`, `test`, `lint`, `clean` are defined

### 0.1.2 — Create `pnpm-workspace.yaml`
- Define the 4 packages: `packages/core`, `packages/acp`, `packages/mcp`, `packages/cli`
- [ ] `pnpm-workspace.yaml` lists the 4 packages
- [ ] `pnpm install` runs without errors

### 0.1.3 — Create empty directory structure
- Create the 4 packages with their `src/` folders
- Create core subdirectories according to the spec:
  - `packages/core/src/orchestrator/`
  - `packages/core/src/agents/`
  - `packages/core/src/indexer/`
  - `packages/core/src/memory/`
  - `packages/core/src/llm/`
  - `packages/core/src/tools/`
- [ ] All directories exist
- [ ] Structure matches section 3.1 of the spec

---

## Task 0.2 — Configure TypeScript `[M]`

### 0.2.1 — Create root `tsconfig.base.json`
- Target: `ES2022`
- Module: `NodeNext`
- `strict: true`
- `declaration: true`
- `declarationMap: true`
- `sourceMap: true`
- `esModuleInterop: true`
- `skipLibCheck: true`
- [ ] `tsconfig.base.json` exists with ES2022 target and strict mode

### 0.2.2 — Create `tsconfig.json` for each package
- Each package extends `tsconfig.base.json`
- Configure `rootDir`, `outDir`, `composite: true`
- Configure `references` between packages:
  - `acp` → references `core`
  - `mcp` → references `core`
  - `cli` → references `core`
- [ ] `tsc --build` compiles without errors from root
- [ ] References between packages are correct

---

## Task 0.3 — Configure build with tsup `[S]`

### 0.3.1 — Install tsup as root devDependency
- `pnpm add -Dw tsup`
- [ ] `tsup` appears in root `package.json` `devDependencies`

### 0.3.2 — Create `tsup.config.ts` for each package
- Format: `cjs` and `esm`
- Entry points per package:
  - `core`: `src/index.ts`
  - `acp`: `src/index.ts` (with `banner` for shebang `#!/usr/bin/env node`)
  - `mcp`: `src/index.ts` (with shebang)
  - `cli`: `src/index.ts` (with shebang)
- `dts: true` to generate declarations
- `clean: true` to clean before build
- [ ] `pnpm -r build` compiles all packages without errors
- [ ] `acp`, `mcp`, and `cli` binaries have shebang

---

## Task 0.4 — Configure `package.json` for each package `[M]`

### 0.4.1 — `packages/core/package.json`
- Name: `@devagents/core`
- `main`, `module`, `types` pointing to `dist/`
- `exports` with `import`, `require`, `types` conditions
- `peerDependencies`: `better-sqlite3`, LLM SDKs
- `dependencies`: `better-sqlite3`, `@anthropic-ai/sdk`, `openai`, `ollama`, `diff`, `chalk`
- [ ] `@devagents/core` resolves correctly from other workspace packages

### 0.4.2 — `packages/acp/package.json`
- Name: `@devagents/acp`
- `bin: { "devagents-acp": "./dist/index.cjs" }`
- `dependencies: { "@devagents/core": "workspace:*" }`
- `dependencies: { "@agentclientprotocol/sdk": "..." }`
- [ ] `npx devagents-acp` is executable (may fail due to missing logic, but binary exists)

### 0.4.3 — `packages/mcp/package.json`
- Name: `@devagents/mcp`
- `bin: { "devagents-mcp": "./dist/index.cjs" }`
- `dependencies: { "@devagents/core": "workspace:*" }`
- `dependencies: { "@modelcontextprotocol/sdk": "..." }`
- [ ] `npx devagents-mcp` is executable (binary exists)

### 0.4.4 — `packages/cli/package.json`
- Name: `@devagents/cli`
- `bin: { "devagents": "./dist/index.cjs" }`
- `dependencies: { "@devagents/core": "workspace:*" }`
- `dependencies: { "@clack/prompts": "..." }`
- [ ] `npx devagents` is executable (binary exists)

---

## Task 0.5 — Configure testing with Vitest `[S]`

### 0.5.1 — Install vitest
- `pnpm add -Dw vitest`
- [ ] `vitest` in root `devDependencies`

### 0.5.2 — Create root `vitest.config.ts`
- Configure workspace mode for the 4 packages
- Configure `globals: true`
- Configure coverage with `@vitest/coverage-v8`
- [ ] `pnpm test` runs without errors (0 tests found, but does not fail)

### 0.5.3 — Create a placeholder test per package
- A `src/__tests__/smoke.test.ts` file in each package
- Each test simply verifies the module imports without errors
- [ ] `pnpm test` passes with 4 tests

---

## Task 0.6 — Configure Changesets `[S]`

### 0.6.1 — Initialize changesets
- `pnpm add -Dw @changesets/cli`
- `pnpm changeset init`
- Configure `access: "public"` in `.changeset/config.json`
- Configure `"linked"` groups if necessary (core + transports)
- [ ] `.changeset/config.json` exists with `access: "public"`
- [ ] `pnpm changeset` runs without errors

---

## Task 0.7 — Repo configuration files `[S]`

### 0.7.1 — Create `.gitignore`
- `node_modules/`, `dist/`, `.env`, `.devagents/`, `*.db`, `coverage/`, `.turbo/`
- [ ] `.gitignore` covers all necessary patterns

### 0.7.2 — Create `.npmrc`
- `shamefully-hoist=false`
- `strict-peer-dependencies=true`
- [ ] `.npmrc` exists

### 0.7.3 — Create minimal `LICENSE` and `README.md`
- MIT License
- README with one-line description and link to spec
- [ ] Both files exist

### 0.7.4 — Initialize git
- `git init`
- First commit: `chore: initial monorepo scaffolding`
- [ ] Git repository is initialized with a commit

---

## Task 0.8 — Create minimal entry (`index.ts`) files `[S]`

### 0.8.1 — `packages/core/src/index.ts`
- Empty export or with placeholder `export const VERSION = "0.0.1"`
- [ ] File exists and exports something importable

### 0.8.2 — `packages/acp/src/index.ts`
- Import from `@devagents/core`
- `console.log("devagents-acp starting...")` as placeholder
- [ ] Binary executes and shows the message

### 0.8.3 — `packages/mcp/src/index.ts`
- Import from `@devagents/core`
- Similar placeholder
- [ ] Binary executes and shows the message

### 0.8.4 — `packages/cli/src/index.ts`
- Import from `@devagents/core`
- Basic `process.argv` parsing for `setup` and `check`
- [ ] `npx devagents setup` shows "not implemented yet"
- [ ] `npx devagents check` shows "not implemented yet"

---

## Phase 0 Summary

| Task | Complexity | Subtasks |
|------|:----------:|:--------:|
| 0.1 pnpm Monorepo | M | 3 |
| 0.2 TypeScript | M | 2 |
| 0.3 tsup Build | S | 2 |
| 0.4 Package.json x4 | M | 4 |
| 0.5 Vitest | S | 3 |
| 0.6 Changesets | S | 1 |
| 0.7 Config files | S | 4 |
| 0.8 Entry points | S | 4 |
| **Total** | | **23 subtasks** |
