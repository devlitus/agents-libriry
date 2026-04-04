---
name: update-state
description: Updates PROJECT_STATE.md after completing a task. Call this at the end of every dev session to persist progress for the next session.
---

## When to call this skill

Call at the end of every completed task, before ending the session:
- After `pnpm build` and `pnpm test` pass
- After the reviewer approves (no blockers)

## What to update in PROJECT_STATE.md

Rewrite the file with accurate current state. Always update all sections:

### Current phase
Set to the phase currently being worked on. Format:
```
**Phase N — Name** (in progress | completed)
```

### Phase progress table
Update the status and completed tasks columns:
- `not started` → `in progress` → `completed`
- List completed task IDs: `0.1, 0.2, 0.3`

### Completed tasks
Append each finished task as:
```
- **[N.N]** TaskName — brief description of what was implemented
  Files: `path/to/file.ts`, `path/to/file.test.ts`
```

### In progress
List what is currently being worked on or what was left mid-session:
```
- **[N.N]** TaskName — what remains to do
```
Or `_Nothing in progress._` if the task completed cleanly.

### Files written so far
Running list of all source files that exist on disk. Append new files — never remove entries.
Format: `- \`path/to/file.ts\` — ExportName — one-line purpose`

### Last session summary
Replace with a 2-3 line summary of what happened in this session:
```
Implemented tasks 0.1 and 0.2: monorepo structure and TypeScript config.
pnpm install runs clean. tsc --build compiles without errors.
Next: tasks 0.3 (tsup), 0.4 (package.json per package), 0.5 (vitest).
```

### Known blockers
List anything that stopped progress or needs a decision:
```
- Task 1.3: unclear whether indexer should support binary files — needs decision.
```
Or `_None._`

## Important

- Never truncate the file — always write the complete updated content
- Keep the "Files written so far" section growing — it's the only cross-session record of what exists on disk
- The next session reads this file before doing anything — accuracy here saves redundant work
