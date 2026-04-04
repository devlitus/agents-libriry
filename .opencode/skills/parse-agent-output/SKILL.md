---
name: parse-agent-output
description: Protocol for extracting file content from sub-agent task() responses and writing files to disk. Load after receiving output from tester or coder sub-agents.
---

## Why this is needed

Sub-agents invoked via `task()` run in an isolated context — their `write`/`edit` calls do not persist to the project filesystem. You (the orchestrator) are the only agent that writes files to disk. Sub-agents return file content as structured text; you extract and write it.

## Expected sub-agent output format

Sub-agents (tester, coder) format their file content like this:

````
### FILE: packages/core/src/agents/coder-agent.ts
```ts
// full file content here
```

### FILE: packages/core/src/agents/coder-agent.test.ts
```ts
// full test file content here
```
````

## Extraction and write protocol

For each `### FILE: <path>` block in the sub-agent's response:

1. Extract the exact file path from the `### FILE:` line
2. Extract the full content from the code fence that follows
3. Write the file using your `write` tool at the exact path
4. Do not modify the content — write exactly what the sub-agent returned

## Verification after writing

After writing all files, verify they exist:
```bash
find packages -name "*.ts" -not -path "*/node_modules/*" -newer .git/index
```

Confirm with the user:
```
Files written to disk:
  ✓ packages/core/src/agents/coder-agent.ts
  ✓ packages/core/src/agents/coder-agent.test.ts
```

## If a file block is truncated or malformed

Ask the sub-agent for the specific file again with:
```
The output for <path> was truncated. Please return only that file's complete content.
```

Do not write partial files to disk.
