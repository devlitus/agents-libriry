import type { AgentContext } from "./types.js";
import type { ArchitectPlan } from "./architect/types.js";

export function buildArchitectPrompt(context: AgentContext): string {
  const { projectIndex, prompt } = context;
  const { language, framework, conventions } = projectIndex;

  return `You are the Architect agent for a ${language} project${framework ? ` using ${framework}` : ""}.

Your task: ${prompt}

Project conventions:
- Naming: ${conventions.namingStyle}
- Import style: ${conventions.importStyle}
- Indentation: ${conventions.indentSize} ${conventions.indentation}
- ${conventions.semicolons ? "Semicolons required" : "No semicolons"}
- Quotes: ${conventions.quotes}

Output your plan as a JSON object with this structure:
{
  "filesToCreate": [{"path": "src/file.ts", "description": "what this file does", "template": "optional template"}],
  "filesToModify": [{"path": "existing/file.ts", "currentContent": "current content", "change": "what to change"}],
  "conventions": {copy from project},
  "notes": ["additional notes"]
}

Respond ONLY with valid JSON.`;
}

export function buildCoderPrompt(context: AgentContext, plan: ArchitectPlan): string {
  const { projectIndex, prompt: taskPrompt } = context;
  const { language, framework, conventions } = projectIndex;

  let prompt = `You are the Coder agent for a ${language} project${framework ? ` using ${framework}` : ""}.

Task/Context:
${taskPrompt}

`;

  if (plan.filesToCreate.length > 0) {
    prompt += "Files to create:\n";
    for (const file of plan.filesToCreate) {
      prompt += `- ${file.path}: ${file.description}\n`;
      if (file.template) {
        prompt += `  Template: ${file.template}\n`;
      }
    }
    prompt += "\n";
  }

  if (plan.filesToModify.length > 0) {
    prompt += "Files to modify:\n";
    for (const file of plan.filesToModify) {
      prompt += `- ${file.path}\n`;
      prompt += `  Current: ${file.currentContent}\n`;
      prompt += `  Change: ${file.change}\n`;
    }
    prompt += "\n";
  }

  prompt += `Conventions:
- Naming: ${conventions.namingStyle}
- Import style: ${conventions.importStyle}
- Indentation: ${conventions.indentSize} ${conventions.indentation}
- ${conventions.semicolons ? "Semicolons required" : "No semicolons"}
- Quotes: ${conventions.quotes}

Output your work as JSON:
{
  "filesWritten": [{"path": "file.ts", "content": "file content", "isNew": true}],
  "dependenciesInstalled": ["package-name"],
  "messages": ["status messages"]
}

Respond ONLY with valid JSON.`;
  return prompt;
}

export function buildTesterPrompt(context: AgentContext, filesWritten: string[]): string {
  const { projectIndex } = context;
  const { testFramework, conventions } = projectIndex;

  return `You are the Tester agent.

Generate tests for these files: ${filesWritten.join(", ")}

Test framework: ${testFramework || "generic"}
Test file pattern: ${conventions.testFilePattern}
Test directory: ${conventions.testDirectory}

Output as JSON:
{
  "testFilesWritten": [{"path": "tests/file.test.ts", "content": "test content"}],
  "testCommand": "command to run tests",
  "messages": ["status messages"]
}

Respond ONLY with valid JSON.`;
}

export function buildReviewerPrompt(
  context: AgentContext,
  filesWritten: string[],
  plan: ArchitectPlan
): string {
  const { projectIndex } = context;
  const { conventions } = projectIndex;

  return `You are the Reviewer agent.

Review these files: ${filesWritten.join(", ")}

Original plan files:
${plan.filesToCreate.map((f) => `- ${f.path}: ${f.description}`).join("\n")}
${plan.filesToModify.map((f) => `- ${f.path}: ${f.change}`).join("\n")}

Conventions to check against:
- Naming: ${conventions.namingStyle}
- Import style: ${conventions.importStyle}

Output as JSON:
{
  "observations": [{"severity": "error|warning|suggestion", "file": "path", "line": 1, "message": "issue", "suggestion": "fix"}],
  "overallAssessment": "pass|warnings|issues",
  "messages": ["status messages"]
}

Respond ONLY with valid JSON.`;
}