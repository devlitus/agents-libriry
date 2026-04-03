# Implementation Plan — @devagents v1

Based on [devagents-spec-final.md](../devagents-spec-final.md)

---

## Summary of phases

| Phase | File | Tasks | Subtasks | Description |
|:-----:|------|:-----:|:---------:|-------------|
| 0 | [fase-0-scaffolding.md](fase-0-scaffolding.md) | 8 | 23 | Monorepo, tooling, configs, entry points |
| 1 | [fase-1-core-fundamentos.md](fase-1-core-fundamentos.md) | 5 | 26 | LLM abstraction, SQLite memory, Indexer |
| 2 | [fase-2-agentes.md](fase-2-agentes.md) | 8 | 37 | Orchestrator + Architect + Coder + Tester + Reviewer |
| 3 | [fase-3-transportes.md](fase-3-transportes.md) | 3 | 18 | ACP (Zed/JetBrains/VS Code) + MCP (Claude Code/Cursor) |
| 4 | [fase-4-cli-y-pulido.md](fase-4-cli-y-pulido.md) | 9 | 34 | CLI setup/check, IDE configs, errors, docs, publication |
| **Total** | | **33** | **138** | |

---

## Dependency diagram between phases

```
Phase 0 (scaffolding)
  └──▶ Phase 1 (LLM + Memory + Indexer)
         └──▶ Phase 2 (Orchestrator + 4 agents)
                └──▶ Phase 3 (ACP + MCP)
                       └──▶ Phase 4 (CLI + polish + publication)
```

Phases are strictly sequential. Within each phase, many tasks can run in parallel (indicated in each file).

---

## Parallelizable tasks within each phase

### Phase 0
- 0.1 (monorepo) + 0.2 (TypeScript) + 0.7 (config files) → in parallel
- 0.3 (tsup) + 0.4 (package.json) + 0.5 (vitest) → after 0.1 and 0.2

### Phase 1
- 1.1 (LLM) + 1.2 (Memory) + 1.3 (Indexer) → in parallel (independent)
- 1.4 (types) → can run in parallel with the 3 above
- 1.5 (barrel export) → at end, after everything

### Phase 2
- 2.1 (agent base) → first
- 2.2 (Orchestrator) → after 2.1
- 2.3 (Architect) + 2.4 (Coder) + 2.5 (Tester) + 2.6 (Reviewer) → in parallel after 2.1
- 2.7 (integration) → after all agents + orchestrator
- 2.8 (exports) → at end

### Phase 3
- 3.1 (ACP) + 3.2 (MCP) → in parallel
- 3.3 (cross tests) → after both transports

### Phase 4
- 4.1 (setup) + 4.2 (check) + 4.6 (logging) → in parallel
- 4.4 (IDEs) + 4.5 (errors) → in parallel after transports
- 4.7 (docs) + 4.8 (npm) → at end
- 4.9 (acceptance tests) → last

---

## Complexity distribution

| Complexity | Tasks | % |
|:-----------:|:-----:|:-:|
| S | 12 | 36% |
| M | 11 | 33% |
| L | 7 | 21% |
| XL | 3 | 9% |

The 3 XL tasks are: Orchestrator (2.2), Coder (2.4), and both transports (3.1, 3.2).
