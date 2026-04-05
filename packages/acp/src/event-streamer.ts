import type { AgentSideConnection } from "@agentclientprotocol/sdk";
import type { OrchestratorEvent } from "@devlitusp/core";

export class EventStreamer {
  private readonly connection: AgentSideConnection;
  private readonly sessionId: string;

  constructor(connection: AgentSideConnection, sessionId: string) {
    this.connection = connection;
    this.sessionId = sessionId;
  }

  async stream(event: OrchestratorEvent): Promise<void> {
    switch (event.type) {
      case "indexing_start":
        await this.sendMessage("🔍 Indexing project files...");
        break;

      case "indexing_complete":
        await this.sendMessage("✅ Indexing complete.");
        break;

      case "plan_ready":
        await this.sendMessage(`📋 **Plan:** ${event.plan.summary}`);
        for (const step of event.plan.steps) {
          await this.sendMessage(`  ${step.agent}: ${step.action}`);
        }
        break;

      case "plan_confirmed":
        await this.sendMessage("▶️ Plan confirmed. Starting execution...");
        break;

      case "plan_rejected":
        await this.sendMessage("❌ Plan rejected.");
        break;

      case "agent_start":
        await this.sendMessage(`🚀 **${event.agent}** starting...`);
        break;

      case "agent_progress":
        await this.sendMessage(`  → ${event.message}`);
        break;

      case "agent_complete":
        if (event.result.success) {
          await this.sendMessage(
            `✅ **${event.agent}** completed successfully.`
          );
        } else {
          await this.sendMessage(
            `⚠️ **${event.agent}** completed with issues.`
          );
        }
        break;

      case "confirm_file":
        await this.sendMessage(
          `📝 Confirm file write: ${event.path}\n\`\`\`\n${event.diff}\n\`\`\``
        );
        break;

      case "confirm_command":
        await this.sendMessage(`⚡ Confirm command: \`${event.command}\``);
        break;

      case "session_complete":
        if (event.success) {
          await this.sendMessage("🎉 Session completed successfully!");
        } else {
          await this.sendMessage("⚠️ Session completed with errors.");
        }
        break;

      case "error":
        await this.sendMessage(`❌ Error: ${event.message}`);
        break;
    }
  }

  private async sendMessage(content: string): Promise<void> {
    await this.connection.sessionUpdate({
      sessionId: this.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: content },
      },
    });
  }
}
