import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.resolve(__dirname, "../SKILL.md");

interface AgentStartEvent {
  systemPrompt?: string;
}

interface ToolCallEvent {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
}

interface ToolResultContent {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ToolResultEvent {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  content: ToolResultContent[];
  details?: unknown;
  isError?: boolean;
  usage?: unknown;
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

const HARNESS_REMINDER =
  "\n\n[Harness Light 提醒] 文件已修改。请牢记轻量审查流程：改动完成后切勿直接 commit，必须派全新 Sub-agent 传入用户原始需求与 `git diff HEAD` 进行等号审查，通过后判断是否更新活蓝图再提交。";

export default function harnessLightExtension(pi: ExtensionAPI): void {
  // 1. 每轮对话前动态将 Harness Light 准则注入 systemPrompt
  pi.on("before_agent_start", async (event: unknown) => {
    try {
      const raw = await fs.readFile(RULES_PATH, "utf-8");
      const rules = raw.replace(/^---[\s\S]*?---\n*/, "").trim();
      if (!rules) return;
      const agentEvent = event as AgentStartEvent | undefined;
      const base = agentEvent?.systemPrompt ? `${agentEvent.systemPrompt}\n\n` : "";
      return { systemPrompt: `${base}${rules}` };
    } catch {
      return;
    }
  });

  // 2. 当 Agent 准备修改文件 (edit / write) 时，UI 发出通知提示进入审查追踪
  pi.on("tool_call", async (event: unknown, ctx: unknown) => {
    const e = event as ToolCallEvent;
    if (e.toolName === "edit" || e.toolName === "write") {
      const commandCtx = ctx as CommandContext | undefined;
      commandCtx?.ui?.notify?.("【Harness Light】检测到文件修改操作，已激活审查追踪", "info");
    }
  });

  // 3. 文件修改成功后，在 tool_result 中动态追加提示，确保 Agent 在当前上下文中看到审查铁律
  pi.on("tool_result", async (event: unknown) => {
    const e = event as ToolResultEvent;
    if ((e.toolName === "edit" || e.toolName === "write") && !e.isError) {
      const originalContent = Array.isArray(e.content) ? e.content : [];
      return {
        content: [
          ...originalContent,
          {
            type: "text",
            text: HARNESS_REMINDER,
          },
        ],
      };
    }
  });

  // 4. 注册 /harness 命令，支持查看状态
  pi.registerCommand("harness", {
    description: "Harness Light 轻量审查状态与指引",
    handler: async (_args: string, ctx: CommandContext) => {
      ctx?.ui?.notify?.("Harness Light 插件处于激活状态：改动文件后将强制 Sub-agent 等号审查", "info");
    },
  });
}
