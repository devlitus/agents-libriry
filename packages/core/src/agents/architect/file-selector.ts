import type { DetectedProject, FileTreeNode } from "../../indexer/types.js";
import type { LlmClient } from "../../llm/types.js";

function extractAllFiles(nodes: FileTreeNode[], prefix = ""): string[] {
  let result: string[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      result.push(node.path);
    } else if (node.type === "directory" && node.children) {
      result = result.concat(extractAllFiles(node.children, node.path));
    }
  }
  return result;
}

const TYPE_MAPPINGS: Record<string, string[]> = {
  endpoint: ["route", "api", "controller", "handler"],
  routes: ["route", "api"],
  component: ["component", "view", "page", "ui"],
  model: ["model", "entity", "schema", "type"],
  util: ["util", "helper", "lib"],
  test: ["test", "spec"],
};

export async function selectRelevantFiles(
  prompt: string,
  projectIndex: DetectedProject,
  llm: LlmClient,
  maxFiles = 20
): Promise<string[]> {
  const allFiles = extractAllFiles(projectIndex.fileTree);
  const selected = new Set<string>();
  const normalizedPrompt = prompt.toLowerCase();

  for (const file of allFiles) {
    const fileName = file.split("/").pop()?.toLowerCase();
    if (fileName && normalizedPrompt.includes(fileName)) {
      selected.add(file);
    }
  }

  for (const [key, keywords] of Object.entries(TYPE_MAPPINGS)) {
    if (normalizedPrompt.includes(key)) {
      for (const file of allFiles) {
        const lowerPath = file.toLowerCase();
        for (const keyword of keywords) {
          if (lowerPath.includes(keyword)) {
            selected.add(file);
          }
        }
      }
    }
  }

  if (selected.size === 0) {
    const fileList = allFiles.join("\n");
    const llmPrompt = `Given the task: "${prompt}"\n\nSelect up to ${maxFiles} most relevant files from this project to help complete the task.\n\nProject files:\n${fileList}\n\nRespond ONLY with a JSON array of string file paths.`;
    
    try {
      const response = (await llm.complete(llmPrompt));
      const parsed = JSON.parse(response) as string[];
      if (Array.isArray(parsed)) {
        for (const file of parsed) {
          if (allFiles.includes(file)) {
            selected.add(file);
          }
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  return Array.from(selected).slice(0, maxFiles);
}
