import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.join(__dirname, "memory-rules.md");
const SCRIPT_PATH = path.join(__dirname, "../scripts/memory.py");

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

function extractSessionId(event: unknown, ctx: unknown): string {
  const sessionManager = (ctx as { sessionManager?: { getSessionId?: () => unknown } } | null)?.sessionManager;
  const fromManager = sessionManager?.getSessionId?.();
  if (typeof fromManager === "string" && fromManager.trim()) return fromManager.trim();
  const e = event as Record<string, unknown> | undefined;
  if (typeof e?.sessionId === "string" && e.sessionId.trim()) return e.sessionId.trim();
  if (typeof e?.session_id === "string" && e.session_id.trim()) return e.session_id.trim();
  return "";
}

export default function hippocampusExtension(pi: ExtensionAPI): void {
  // 1. Hot-reload memory rules into system prompt before every turn, injecting current sessionId if available
  pi.on("before_agent_start", async (event: unknown, ctx: unknown) => {
    try {
      const raw = await fs.readFile(RULES_PATH, "utf-8");
      const rules = raw.trim();
      if (!rules) return;
      const sessionId = extractSessionId(event, ctx);
      const sessionNote = sessionId ? `\n\n当前会话ID：${sessionId}` : "";
      const agentEvent = event as AgentStartEvent | undefined;
      const base = agentEvent?.systemPrompt ? `${agentEvent.systemPrompt}\n\n` : "";
      return { systemPrompt: `${base}${rules}${sessionNote}` };
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

  // 3. /memory: Memory utilities and status
  pi.registerCommand("memory", {
    description: "Hippocampus memory utilities: /memory status, /memory sync",
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
      ctx?.ui?.notify?.("Hippocampus memory extension active (rules: memory-rules.md)", "info");
    },
  });
}
