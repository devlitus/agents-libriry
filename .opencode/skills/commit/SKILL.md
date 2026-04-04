---
name: commit
description: Creates a git commit following Conventional Commits standard. Call this when you are ready to commit staged or unstaged changes.
---

## Standard to follow

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) v1.0.0.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types allowed

| Type       | When to use |
|------------|-------------|
| `feat`     | New feature or capability |
| `fix`      | Bug fix |
| `chore`    | Maintenance, tooling, deps — no production code change |
| `docs`     | Documentation only |
| `test`     | Adding or fixing tests — no production code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement |
| `ci`       | CI/CD config changes |
| `build`    | Build system or external dependencies |
| `revert`   | Reverts a previous commit |

### Scope (optional but encouraged)

Use the package or module name:
- `core`, `acp`, `mcp`, `cli` — for monorepo packages
- `llm`, `memory`, `indexer`, `config` — for submodules within core
- `agents`, `skills` — for opencode configuration

### Subject rules

- Imperative mood: "add X", not "added X" or "adds X"
- Lowercase first letter
- No period at the end
- Max 72 characters total (type + scope + subject)

### Body (when needed)

- Separate from subject with a blank line
- Explain *why*, not *what* — the diff shows what
- Wrap at 72 characters

### Footer

- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Closes #123`, `Refs #456`

---

## How to commit

### 1. Check current state
```bash
git status
git diff --staged
```

If nothing is staged, check unstaged:
```bash
git diff
```

### 2. Stage what belongs to this commit
Stage only files relevant to one logical change.
Do not mix unrelated changes in a single commit.

```bash
git add <specific-files>
# or
git add -p   # interactive, for partial staging
```

### 3. Build the commit message

From the staged diff, determine:
- **type**: what kind of change is this?
- **scope**: which package/module is affected?
- **subject**: what does this commit do? (imperative, lowercase, ≤72 chars)

### 4. Commit

```bash
git commit -m "<type>(<scope>): <subject>"
```

For multi-line messages use a heredoc:
```bash
git commit -m "$(cat <<'EOF'
feat(core): add OllamaClient with streaming support

Implements the LlmClient interface for local Ollama models.
Supports both single-completion and streaming via async generators.

Closes #12
EOF
)"
```

---

## Examples

```
feat(core): add SqliteMemoryService with CRUD operations
fix(llm): handle timeout errors in AnthropicClient
chore(deps): upgrade vitest to v2.1.0
test(indexer): add integration tests for convention-detector
refactor(memory): extract query builder into separate helper
docs(readme): document monorepo package structure
ci: add pnpm cache step to build workflow
build(core): switch from tsc to tsup for dual CJS/ESM output
```

---

## Rules to never break

- Never use `git add .` or `git add -A` — always be explicit about what you stage
- Never commit secrets, `.env` files, or credentials
- Never amend a commit that has already been pushed
- Never skip hooks with `--no-verify` unless explicitly asked
- One logical change per commit — split unrelated changes into separate commits
- If `pnpm test` or `pnpm build` fail, fix them before committing
