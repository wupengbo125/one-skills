import type { RpcInput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  branchFromTitle,
  primaryAgent,
  startTodoRpc,
  type AgentRef,
  type Todo,
} from "../shared/todo";
import { getTodo, listTodos, saveTodo } from "./store";
import { savePreferences } from "./preferences";
import { handleUpdateTodo } from "./todo";
import { deleteBranches } from "./worktree";

async function resolveProviderField(
  paseo: PluginHandlerContext["paseo"],
  provider: string,
  model?: string,
): Promise<string> {
  const actual =
    provider.trim().toLowerCase() === "antigravity acp"
      ? "antigravity"
      : provider;
  if (model) {
    if (model.startsWith(actual + "/")) return model;
    return `${actual}/${model}`;
  }
  try {
    const res = await paseo.providers.listModels(actual);
    const selectable = (res.models ?? []).filter(
      (m) => m.isSelectable !== false,
    );
    const def = selectable.find((m) => m.isDefault) ?? selectable[0];
    if (def) return `${provider}/${def.id}`;
  } catch {
    // fall through
  }
  throw new Error(`Provider ${provider} 没有可用默认模型，请选一个模型`);
}

function todoAgents(todo: Todo): AgentRef[] {
  return (todo.agents ?? []).filter((a) => a.provider);
}

async function workspaceIsActive(
  paseo: PluginHandlerContext["paseo"],
  workspaceId: string,
): Promise<boolean> {
  try {
    const res = await paseo.workspaces.list();
    return (res.entries ?? []).some((w) => w.id === workspaceId);
  } catch {
    return false;
  }
}

async function resolveProjectPath(
  paseo: PluginHandlerContext["paseo"],
  projectId: string,
): Promise<string | undefined> {
  try {
    const res = await paseo.projects.list();
    return (
      res.projects?.find((p) => p.projectId === projectId)?.projectRootPath ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export async function handleStartTodo(
  input: RpcInput<typeof startTodoRpc>,
  { paseo }: PluginHandlerContext,
): Promise<{ ok: boolean; todo: Todo | null; error?: string }> {
  const base = getTodo(input.id);
  if (!base) return { ok: false, todo: null, error: "待办不存在" };

  const placementPatch = {
    projectId: input.projectId,
    projectName: input.projectName,
    projectPath: input.projectPath,
    isolation: input.isolation,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    cwd: input.cwd,
    baseBranch: input.baseBranch,
    newBranch: input.newBranch,
  };
  const hasPlacementPatch = Object.values(placementPatch).some(
    (v) => v !== undefined,
  );
  let todo = base;
  if (
    input.agents ||
    input.prompt !== undefined ||
    input.skills !== undefined ||
    hasPlacementPatch
  ) {
    const updated = handleUpdateTodo({
      id: base.id,
      patch: {
        ...(input.agents ? { agents: input.agents } : {}),
        ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
        ...(input.skills !== undefined ? { skills: input.skills } : {}),
        ...(hasPlacementPatch ? placementPatch : {}),
      },
    });
    if (!updated.todo) {
      return { ok: false, todo: null, error: "待办不存在" };
    }
    todo = updated.todo;
  }

  if (todo.status === "running") {
    return { ok: false, todo, error: "已在运行中" };
  }

  const refs = todoAgents(todo);
  if (refs.length === 0) {
    return { ok: false, todo, error: "先选至少一个 Provider" };
  }
  if (!todo.title.trim() && !todo.prompt.trim()) {
    return { ok: false, todo, error: "标题或内容至少填一项" };
  }

  const title = todo.title.trim();
  const skillPrefix =
    todo.skills && todo.skills.length > 0
      ? `[使用技能: ${todo.skills.join(", ")}。若未安装或未找到上述技能，必须立即向我反馈，不得擅自执行]\n\n`
      : "";
  const body = todo.prompt.trim()
    ? (title ? `${title}\n\n${todo.prompt.trim()}` : todo.prompt.trim())
    : title;
  const prompt = skillPrefix + body;
  const now = new Date().toISOString();
  const multi = refs.length > 1;

  try {
function isAgy(provider: string): boolean {
  const p = provider.trim().toLowerCase();
  return p === "antigravity cli" || p === "agy";
}

async function launchAgentOrTerminal(
  paseo: PluginHandlerContext["paseo"],
  ws: ReturnType<PluginHandlerContext["paseo"]["workspaces"]["ref"]>,
  ref: AgentRef,
  title: string,
  prompt: string,
): Promise<{ agentId?: string; terminalId?: string }> {
  if (isAgy(ref.provider)) {
    const args = ["--dangerously-skip-permissions"];
    if (ref.model) {
      args.push("--model", ref.model);
    }
    args.push("-i", prompt);
    const term = await ws.terminals.create({
      name: title,
      command: "agy",
      args,
    });
    return { terminalId: term.id };
  }
  const config = await resolveProviderField(paseo, ref.provider, ref.model);
  const handle = await ws.agents.create({
    config: { provider: config },
    title,
    prompt,
  });
  return { agentId: handle.id };
}

    let workspaceId = todo.workspaceId;
    let workspaceName = todo.workspaceName;
    let projectPath = todo.projectPath;
    let projectId = todo.projectId;
    const agentIds: string[] = [];
    const terminalIds: string[] = [];
    const wtWorkspaces: Array<{ workspaceId: string; branch: string }> = [];
    let wtRepo: string | undefined;

    let staleWorkspace = false;
    if (workspaceId && !(await workspaceIsActive(paseo, workspaceId))) {
      workspaceId = undefined;
      workspaceName = undefined;
      staleWorkspace = true;
    }
    if (!projectPath && projectId) {
      projectPath = await resolveProjectPath(paseo, projectId);
    }
    if (staleWorkspace && !projectPath) {
      return {
        ok: false,
        todo,
        error: "该任务的工作目录已失效，请重新选择项目目录",
      };
    }

    if (workspaceId) {
      const ws = paseo.workspaces.ref(workspaceId);
      for (let i = 0; i < refs.length; i++) {
        const launched = await launchAgentOrTerminal(
          paseo,
          ws,
          refs[i],
          multi ? `${title} #${i + 1}` : title,
          prompt,
        );
        if (launched.agentId) agentIds.push(launched.agentId);
        if (launched.terminalId) terminalIds.push(launched.terminalId);
      }
      workspaceName = workspaceName ?? todo.workspaceName;
    } else if (projectPath) {
      const isWorktree = (todo.isolation ?? "local") === "worktree";
      // Local 选多个 Provider（赛马）时，也建一个 worktree 把会话都放进去
      const makeWorktree = isWorktree || multi;
      const srcRepo = projectPath;

      if (isWorktree && multi) {
        for (let i = 0; i < refs.length; i++) {
          const branchName = todo.newBranch?.trim()
            ? `${branchFromTitle(todo.newBranch)}-a${i + 1}`
            : `${branchFromTitle(title)}-a${i + 1}`;
          wtRepo = srcRepo;
          const ws = await paseo.workspaces.create({
            source: {
              kind: "worktree",
              cwd: projectPath,
              ...(projectId ? { projectId } : {}),
              action: "branch-off",
              baseBranch: todo.baseBranch?.trim() || "main",
              branchName,
              worktreeSlug: branchFromTitle(branchName),
            },
            title: multi ? `${title} #${i + 1}` : title,
          });
          wtWorkspaces.push({ workspaceId: ws.id, branch: branchName });
          if (i === 0) {
            workspaceId = ws.id;
            workspaceName = ws.name || title;
            projectId = ws.projectId || projectId;
            projectPath = ws.directory || projectPath;
          }
          const launched = await launchAgentOrTerminal(
            paseo,
            ws,
            refs[i],
            multi ? `${title} #${i + 1}` : title,
            prompt,
          );
          if (launched.agentId) agentIds.push(launched.agentId);
          if (launched.terminalId) terminalIds.push(launched.terminalId);
        }
      } else {
        const singleBranch = todo.newBranch?.trim() || branchFromTitle(title);
        if (makeWorktree) {
          wtRepo = srcRepo;
        }
        const source = makeWorktree
          ? {
              kind: "worktree" as const,
              cwd: projectPath,
              ...(projectId ? { projectId } : {}),
              branchName: singleBranch,
              worktreeSlug: branchFromTitle(todo.newBranch?.trim() || title),
            }
          : {
              kind: "directory" as const,
              path: projectPath,
              ...(projectId ? { projectId } : {}),
            };

        const ws = await paseo.workspaces.create({ source, title });
        if (makeWorktree) {
          wtWorkspaces.push({ workspaceId: ws.id, branch: singleBranch });
        }
        workspaceId = ws.id;
        workspaceName = ws.name ?? title;
        projectId = ws.projectId ?? projectId;
        projectPath = ws.directory ?? projectPath;

        for (let i = 0; i < refs.length; i++) {
          const launched = await launchAgentOrTerminal(
            paseo,
            ws,
            refs[i],
            multi ? `${title} #${i + 1}` : title,
            prompt,
          );
          if (launched.agentId) agentIds.push(launched.agentId);
          if (launched.terminalId) terminalIds.push(launched.terminalId);
        }
      }
    } else {
      if (!todo.cwd) {
        return {
          ok: false,
          todo,
          error: "未选项目/Workspace，也未填仓库路径 cwd",
        };
      }
      const isWorktree = (todo.isolation ?? "local") === "worktree";
      const source =
        isWorktree && todo.newBranch && todo.baseBranch
          ? {
              kind: "worktree" as const,
              cwd: todo.cwd,
              action: "branch-off" as const,
              baseBranch: todo.baseBranch.trim() || "main",
              branchName: todo.newBranch.trim(),
              worktreeSlug: branchFromTitle(todo.newBranch.trim()),
            }
          : {
              kind: "directory" as const,
              path: todo.cwd,
            };
      const ws = await paseo.workspaces.create({ source, title });
      workspaceId = ws.id;
      workspaceName = ws.name ?? title;
      if (source.kind === "worktree") {
        wtRepo = todo.cwd;
        wtWorkspaces.push({
          workspaceId: ws.id,
          branch: todo.newBranch!.trim(),
        });
      }
      for (let i = 0; i < refs.length; i++) {
        const launched = await launchAgentOrTerminal(
          paseo,
          ws,
          refs[i],
          multi ? `${title} #${i + 1}` : title,
          prompt,
        );
        if (launched.agentId) agentIds.push(launched.agentId);
        if (launched.terminalId) terminalIds.push(launched.terminalId);
      }
    }

    const next: Todo = {
      ...todo,
      status: "running",
      agentIds,
      terminalIds: terminalIds.length ? terminalIds : undefined,
      pendingAgentIds: [...agentIds],
      worktreeRepo: wtRepo,
      worktrees: wtWorkspaces.length ? wtWorkspaces : undefined,
      workspaceId: workspaceId || undefined,
      workspaceName: workspaceName || undefined,
      projectId: projectId || undefined,
      projectPath: projectPath || undefined,
      startedAt: now,
      finishedAt: undefined,
      error: undefined,
    };
    const firstAgent = primaryAgent(todoAgents(todo));
    savePreferences({
      lastProvider: firstAgent.provider || undefined,
      lastModel: firstAgent.model || undefined,
      lastProjectId: todo.projectId,
      lastProjectName: todo.projectName,
      lastProjectPath: todo.projectPath,
      lastIsolation: todo.isolation,
      lastSkills: todo.skills,
    });
    return { ok: true, todo: saveTodo(next) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const next: Todo = {
      ...todo,
      status: "failed",
      error: message,
      finishedAt: new Date().toISOString(),
    };
    return { ok: false, todo: saveTodo(next), error: message };
  }
}

export function completeByAgentId(
  agentId: string,
  outcome: "completed" | "failed" | "canceled",
  errorMessage?: string,
): Todo | null {
  const todos = listTodos();
  const todo = todos.find(
    (t) => t.status === "running" && (t.agentIds ?? []).includes(agentId),
  );
  if (!todo) return null;
  const now = new Date().toISOString();

  if (outcome === "failed" || outcome === "canceled") {
    return saveTodo({
      ...todo,
      status: "failed",
      finishedAt: now,
      pendingAgentIds: [],
      error:
        errorMessage ||
        (outcome === "canceled" ? "会话已取消" : "agent turn failed"),
    });
  }

  const pool = (todo.pendingAgentIds ?? todo.agentIds ?? []).filter(
    (id) => id !== agentId,
  );
  if (pool.length === 0) {
    return saveTodo({
      ...todo,
      status: "done",
      finishedAt: now,
      pendingAgentIds: [],
      error: undefined,
    });
  }
  return saveTodo({ ...todo, pendingAgentIds: pool });
}

export function stashWorkspaceProject(
  workspaceId: string,
  projectId?: string,
): void {
  if (!projectId) return;
  for (const t of listTodos()) {
    if (t.workspaceId !== workspaceId || t.projectId) continue;
    saveTodo({ ...t, projectId });
  }
}

/**
 * workspace 归档时，删掉该任务开跑时创建的分支（工作目录已由 Paseo 删）。
 * 归档即用户确认，未合并的改动会一并丢弃。
 */
export async function cleanupWorkspaceBranches(
  workspaceId: string,
): Promise<void> {
  for (const t of listTodos()) {
    const hit = (t.worktrees ?? []).filter((w) => w.workspaceId === workspaceId);
    if (hit.length === 0) continue;
    const repo = t.worktreeRepo;
    if (!repo) continue;
    await deleteBranches(
      repo,
      hit.map((w) => w.branch),
    );
    saveTodo({
      ...t,
      worktrees: (t.worktrees ?? []).filter((w) => w.workspaceId !== workspaceId),
    });
  }
}

export function completeByWorkspaceId(
  workspaceId: string,
  archivedAt?: string,
): Todo[] {
  const now = archivedAt ?? new Date().toISOString();
  return listTodos()
    .filter((t) => t.status === "running" && t.workspaceId === workspaceId)
    .map((t) =>
      saveTodo({
        ...t,
        status: "done",
        finishedAt: now,
        pendingAgentIds: [],
        error: undefined,
      }),
    );
}
