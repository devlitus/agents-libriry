/**
 * @devagents/cli
 * CLI entry point
 */

import { runSetup } from "./setup.js";
import { runChecks, formatCheckOutput, getExitCode } from "./check.js";
import { initIde } from "./init-ide.js";

const VERSION = "0.1.0";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "setup") {
    await runSetup();
    return;
  }

  if (command === "check") {
    const results = await runChecks();
    const output = formatCheckOutput(results);
    console.log(output);
    process.exit(getExitCode(results));
    return;
  }

  if (command === "init-ide") {
    await initIde();
    return;
  }

  if (command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(`devagents CLI v${VERSION}`);
    return;
  }

  showHelp();
}

function showHelp(): void {
  console.log(`devagents CLI v${VERSION}

Usage: devagents <command>

Commands:
  setup     Run the interactive setup wizard
  check     Verify your development environment
  init-ide  Configure an IDE to use devagents
  --help    Show this help message
  --version Show version number

Examples:
  npx devagents setup
  npx devagents check
  npx devagents init-ide
`);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
