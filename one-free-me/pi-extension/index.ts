import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.join(__dirname, "memory-rules.md");
const SCRIPT_PATH = path.join(__dirname, "../scripts/free_me.py");

interface AgentStartEvent {
  systemPrompt?: string;
}

interface CommandContext {
  isIdle?: () => boolean;
  ui?: {
    notify?: (message: string, level?: "info" | "warning" | "error") => void;
  };
}

interface ExtensionAPI {
  on: (event: string, handler: (event: unknown, ctx?: unknown) => Promise<unknown> | unknown) => void;
  registerCommand: (
    name: string,
    def: {
      description: string;
      handler: (args: string, ctx: CommandContext) => Promise<void> | void;
    }
  ) => void;
  sendUserMessage: (message: string, options?: { deliverAs?: string }) => void;
  exec: (command: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;
}

export default function hippocampusExtension(pi: ExtensionAPI): void {
  // 1. Hot-reload memory rules into system prompt before every turn
  pi.on("before_agent_start", async (event: unknown) => {
    try {
      const rules = await fs.readFile(RULES_PATH, "utf-8");
      if (!rules.trim()) return;
      const agentEvent = event as AgentStartEvent | undefined;
      const base = agentEvent?.systemPrompt ? `${agentEvent.systemPrompt}\n\n` : "";
      return { systemPrompt: `${base}${rules}` };
    } catch {
      return;
    }
  });

  // 2. /wrap: Trigger session wrap-up and hippocampus recording
  pi.registerCommand("wrap", {
    description: "Wrap up current session and record to hippocampus daily log",
    handler: async (args: string, ctx: CommandContext) => {
      const extra = typeof args === "string" && args.trim() ? `: ${args.trim()}` : "";
      const msg = `收工${extra}。请总结当前会话关键成果与决策，按规范追加至今日海马体流水并同步索引。`;
      if (ctx?.isIdle?.() === false) {
        pi.sendUserMessage(msg, { deliverAs: "followUp" });
      } else {
        pi.sendUserMessage(msg);
      }
      ctx?.ui?.notify?.("Triggered hippocampus session wrap-up", "info");
    },
  });

  // 3. /freeme: Memory utilities and status
  pi.registerCommand("freeme", {
    description: "Hippocampus memory utilities: /freeme status, /freeme sync",
    handler: async (args: string, ctx: CommandContext) => {
      const sub = typeof args === "string" ? args.trim().toLowerCase() : "";
      if (sub === "sync") {
        ctx?.ui?.notify?.("Rebuilding hippocampus index...", "info");
        try {
          const res = await pi.exec("python3", [SCRIPT_PATH, "rebuild"]);
          ctx?.ui?.notify?.(
            res.code === 0 ? "Hippocampus index synced" : "Index sync failed",
            res.code === 0 ? "info" : "error"
          );
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e);
          ctx?.ui?.notify?.(`Sync failed: ${errMsg}`, "error");
        }
        return;
      }
      ctx?.ui?.notify?.("Hippocampus extension active (rules: memory-rules.md)", "info");
    },
  });
}
