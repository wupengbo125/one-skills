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
  // 赛马模式：进弹层时按待办定，跑过之后不能改
  race?: boolean;
  // 委员会模式：只一匹马，另指定两个派生成员
  committee?: boolean;
  committeeMembers?: AgentRef[];
  source?: "todo" | "issue";
  issueRef?: string;
  issueUrl?: string;
  extraPrompt?: string;
};

export type Picker =
  | null
  | {
      kind: "agent";
      step: "provider" | "model";
      index: number;
      provider: string;
      // 选的是哪一栏：放马（agents，默认）还是委员会成员（members）
      target?: "agents" | "members";
    }
  | { kind: "project" }
  | { kind: "workspace" }
  | { kind: "skills" }
  | { kind: "reviewer"; step: "provider" | "model"; provider: string };

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
    extraPrompt: "",
    race: false,
    committee: false,
    committeeMembers: [],
  };
}

// 委员会两位委员的默认值兜底：全局没记过时，取最近一张存了完整两位的委员会单
export function lastCommitteePair(todos: Todo[]): AgentRef[] | undefined {
  const full = todos
    .filter((t) => t.committeeMode)
    .filter(
      (t) =>
        (t.committeeMembers ?? []).filter((m) => m.provider.trim()).length === 2,
    );
  full.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return full[0]?.committeeMembers;
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
