/**
 * IDE configuration generator for @devagents
 * @devagents/cli
 */

import { intro, outro, select } from "@clack/prompts";
import { writeFile, mkdir, access, constants } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export type IdeType = "zed" | "jetbrains" | "vscode-acp" | "vscode-mcp" | "claude-code" | "cursor";

export interface IdeConfig {
  name: string;
  configFiles: { path: string; content: string }[];
  instructions?: string;
}

const ZED_CONFIG = {
  path: ".zed/settings.json",
  content: `{
  "agent": {
    "agents": [
      {
        "name": "Dev Team",
        "command": "./node_modules/.bin/devagents-acp"
      }
    ]
  }
}
`,
};

const JETBRAINS_INSTRUCTIONS = `
## JetBrains Configuration

1. Open your JetBrains IDE (IntelliJ IDEA, WebStorm, etc.)
2. Go to **AI Assistant → Settings → External Agents**
3. Click **Add**
4. Configure:
   - **Name:** \`Dev Team\`
   - **Command:** \`./node_modules/.bin/devagents-acp\`
   - **Description:** \`@devagents coding agent team\`
5. Click **OK** to save

The agent will appear in the AI Assistant panel.
`;

const VSCODE_ACP_CONFIG = {
  path: ".vscode/settings.json",
  content: `{
  "acp.agents": [
    {
      "name": "Dev Team",
      "command": "./node_modules/.bin/devagents-acp"
    }
  ]
}
`,
};

const VSCODE_MCP_CONFIG = {
  path: ".vscode/mcp.json",
  content: `{
  "servers": {
    "devagents": {
      "type": "stdio",
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
`,
};

const CLAUDE_CODE_CONFIG = {
  path: ".claude/settings.json",
  content: `{
  "mcpServers": {
    "devagents": {
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
`,
};

const CURSOR_CONFIG = {
  path: ".cursor/mcp.json",
  content: `{
  "mcpServers": {
    "devagents": {
      "command": "./node_modules/.bin/devagents-mcp"
    }
  }
}
`,
};

const VSCODE_ACP_INSTRUCTIONS = `
## VS Code Configuration (ACP)

1. Install the **ACP Client** extension in VS Code
   - Search for "vscode-acp" in the Extensions marketplace
2. The settings are already configured in .vscode/settings.json
3. Reload VS Code
4. Open the ACP Client panel to see the Dev Team agent
`;

const VSCODE_MCP_INSTRUCTIONS = `
## VS Code Configuration (MCP/Copilot)

1. The MCP settings are already configured in .vscode/mcp.json
2. Make sure you have the **Copilot** or **Copilot Chat** extension installed
3. Reload VS Code
4. The devagents tools will appear in the Copilot Chat tool palette
`;

const CLAUDE_CODE_INSTRUCTIONS = `
## Claude Code Configuration

1. The MCP settings are already configured in .claude/settings.json
2. Restart Claude Code if it's already running
3. The devagents tools will be available via the MCP protocol
`;

const CURSOR_INSTRUCTIONS = `
## Cursor Configuration

1. The MCP settings are already configured in .cursor/mcp.json
2. Restart Cursor if it's already running
3. The devagents tools will appear in the AI panel
`;

/**
 * Generate IDE configuration files
 */
export async function initIde(projectRoot?: string): Promise<void> {
  const root = projectRoot ?? process.cwd();

  intro("devagents init-ide");

  const ideType = (await select({
    message: "Which IDE do you want to configure?",
    options: [
      { value: "zed", label: "Zed" },
      { value: "jetbrains", label: "JetBrains (IntelliJ, WebStorm, etc.)" },
      { value: "vscode-acp", label: "VS Code (via ACP)" },
      { value: "vscode-mcp", label: "VS Code (via MCP/Copilot)" },
      { value: "claude-code", label: "Claude Code" },
      { value: "cursor", label: "Cursor" },
    ],
  })) as IdeType;

  let config: IdeConfig;

  switch (ideType) {
    case "zed":
      config = {
        name: "Zed",
        configFiles: [ZED_CONFIG],
      };
      break;
    case "jetbrains":
      config = {
        name: "JetBrains",
        configFiles: [],
        instructions: JETBRAINS_INSTRUCTIONS,
      };
      break;
    case "vscode-acp":
      config = {
        name: "VS Code (ACP)",
        configFiles: [VSCODE_ACP_CONFIG],
        instructions: VSCODE_ACP_INSTRUCTIONS,
      };
      break;
    case "vscode-mcp":
      config = {
        name: "VS Code (MCP)",
        configFiles: [VSCODE_MCP_CONFIG],
        instructions: VSCODE_MCP_INSTRUCTIONS,
      };
      break;
    case "claude-code":
      config = {
        name: "Claude Code",
        configFiles: [CLAUDE_CODE_CONFIG],
        instructions: CLAUDE_CODE_INSTRUCTIONS,
      };
      break;
    case "cursor":
      config = {
        name: "Cursor",
        configFiles: [CURSOR_CONFIG],
        instructions: CURSOR_INSTRUCTIONS,
      };
      break;
    default:
      outro("Unknown IDE type");
      return;
  }

  // Create config files
  for (const file of config.configFiles) {
    const dir = join(root, file.path.split("/")[0]);
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    const filePath = join(root, file.path);
    const exists = existsSync(filePath);

    await writeFile(filePath, file.content, "utf-8");
    console.log(`${exists ? "Updated" : "Created"} ${file.path}`);
  }

  if (config.instructions) {
    console.log(config.instructions);
  }

  outro(`IDE configuration for ${config.name} complete!`);
}

/**
 * Get configuration for a specific IDE without interactive prompt
 */
export function getIdeConfig(ideType: IdeType): IdeConfig {
  switch (ideType) {
    case "zed":
      return { name: "Zed", configFiles: [ZED_CONFIG] };
    case "jetbrains":
      return { name: "JetBrains", configFiles: [], instructions: JETBRAINS_INSTRUCTIONS };
    case "vscode-acp":
      return { name: "VS Code (ACP)", configFiles: [VSCODE_ACP_CONFIG], instructions: VSCODE_ACP_INSTRUCTIONS };
    case "vscode-mcp":
      return { name: "VS Code (MCP)", configFiles: [VSCODE_MCP_CONFIG], instructions: VSCODE_MCP_INSTRUCTIONS };
    case "claude-code":
      return { name: "Claude Code", configFiles: [CLAUDE_CODE_CONFIG], instructions: CLAUDE_CODE_INSTRUCTIONS };
    case "cursor":
      return { name: "Cursor", configFiles: [CURSOR_CONFIG], instructions: CURSOR_INSTRUCTIONS };
  }
}
