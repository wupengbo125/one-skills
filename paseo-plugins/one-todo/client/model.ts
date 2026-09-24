import type { AgentRef, Todo } from "../shared/todo";

export type SourceFilter = "todo" | "issue";

export type RunDraft = {
  id: string;
  title: string;
  prompt: string;
  agents: AgentRef[];
  projectId: string;
  projectName: string;
  projectPath: string;
  isolation: "local" | "worktree";
  baseBranch: string;
  newBranch: string;
  skills: string[];
  workspaceId: string;
  workspaceName: string;
  source?: "todo" | "issue";
  issueRef?: string;
  issueUrl?: string;
};

export type Picker =
  | null
  | {
      kind: "agent";
      step: "provider" | "model";
      index: number;
      provider: string;
    }
  | { kind: "project" }
  | { kind: "workspace" }
  | { kind: "skills" };

export type PickItem = {
  id: string;
  label: string;
  sub?: string;
  selected: boolean;
};

export type LiveIssue = {
  repo: string;
  number: number;
  title: string;
  url: string;
  state: string;
  updatedAt?: string;
  body?: string;
  projectPath?: string;
  projectName?: string;
  projectId?: string;
};

export function agentLabel(a?: AgentRef): string {
  if (!a?.provider) return "选择 Provider";
  return a.model ? `${a.provider} / ${a.model}` : `${a.provider} / 默认`;
}

export function emptyRun(id: string, title: string, prompt: string): RunDraft {
  return {
    id,
    title,
    prompt,
    agents: [],
    projectId: "",
    projectName: "",
    projectPath: "",
    isolation: "local",
    baseBranch: "main",
    newBranch: "",
    skills: [],
    workspaceId: "",
    workspaceName: "",
  };
}

export function metaLine(t: Todo): string {
  const agents = t.agents?.filter((a) => a.provider) ?? [];
  const agentText =
    agents.length > 1
      ? `${agents.length} Agent`
      : agents[0]
        ? agentLabel(agents[0])
        : "";
  const parts = agentText ? [agentText] : [];
  if (t.source === "issue" && t.issueRef) parts.push(t.issueRef);
  if (t.workspaceName) parts.push(t.workspaceName);
  else if (t.projectName || t.projectPath) {
    const iso = t.isolation === "worktree" ? "worktree" : "local";
    parts.push(`${t.projectName || t.projectPath} · ${iso}`);
  } else if (t.cwd) parts.push(t.cwd);
  if (t.status === "running") parts.push("运行中");
  if (t.status === "done") parts.push("完成");
  if (t.status === "failed") parts.push("失败");
  return parts.join("  ·  ");
}

export function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
