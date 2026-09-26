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
import { taskDocHint } from "./taskdoc";
import { handleUpdateTodo } from "./todo";
import { deleteBranches } from "./worktree";

export async function resolveProviderField(
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

export function todoAgents(todo: Todo): AgentRef[] {
  return (todo.agents ?? []).filter((a) => a.provider);
}

export function isAgy(provider: string): boolean {
  const p = provider.trim().toLowerCase();
  return p === "antigravity cli" || p === "agy";
}

export async function launchAgentOrTerminal(
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
    let workspaceId = todo.workspaceId;
    let workspaceName = todo.workspaceName;
    let projectPath = todo.projectPath;
    let projectId = todo.projectId;
    const agentIds: string[] = [];
    const terminalIds: string[] = [];
    const wtWorkspaces: Array<{
      workspaceId: string;
      branch: string;
      dir?: string;
      agentId?: string;
      terminalId?: string;
      provider?: string;
      model?: string;
    }> = [];
    // 名单越加越长：新马的分支序号接在已有名单后面，不会和老的撞名
    const seqBase = todo.worktrees?.length ?? 0;
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
          `${prompt}\n\n${taskDocHint(ws.id)}`,
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
            ? `${branchFromTitle(todo.newBranch)}-a${seqBase + i + 1}`
            : `${branchFromTitle(title)}-a${seqBase + i + 1}`;
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
          wtWorkspaces.push({
            workspaceId: ws.id,
            branch: branchName,
            dir: ws.directory || undefined,
          });
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
            `${prompt}\n\n${taskDocHint(ws.id)}`,
          );
          if (launched.agentId) agentIds.push(launched.agentId);
          if (launched.terminalId) terminalIds.push(launched.terminalId);
          const entry = wtWorkspaces[wtWorkspaces.length - 1];
          entry.agentId = launched.agentId;
          entry.terminalId = launched.terminalId;
          entry.provider = refs[i].provider || undefined;
          entry.model = refs[i].model || undefined;
        }
      } else {
        // 单马/共享 worktree：首次沿用原分支名，之后再发要加序号避撞
        const singleBranch =
          seqBase === 0
            ? todo.newBranch?.trim() || branchFromTitle(title)
            : `${branchFromTitle(todo.newBranch?.trim() || title)}-a${seqBase + 1}`;
        if (makeWorktree) {
          wtRepo = srcRepo;
        }
        const source = makeWorktree
          ? {
              kind: "worktree" as const,
              cwd: projectPath,
              ...(projectId ? { projectId } : {}),
              branchName: singleBranch,
              worktreeSlug: branchFromTitle(singleBranch),
            }
          : {
              kind: "directory" as const,
              path: projectPath,
              ...(projectId ? { projectId } : {}),
            };

        const ws = await paseo.workspaces.create({ source, title });
        if (makeWorktree) {
          wtWorkspaces.push({
            workspaceId: ws.id,
            branch: singleBranch,
            dir: ws.directory || undefined,
          });
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
            `${prompt}\n\n${taskDocHint(ws.id)}`,
          );
          if (launched.agentId) agentIds.push(launched.agentId);
          if (launched.terminalId) terminalIds.push(launched.terminalId);
          if (makeWorktree) {
            // 同一 worktree 里多匹马时只记第一个会话（与现有行为一致）
            const entry = wtWorkspaces[wtWorkspaces.length - 1];
            entry.agentId = entry.agentId ?? launched.agentId;
            entry.terminalId = entry.terminalId ?? launched.terminalId;
            entry.provider = entry.provider ?? (refs[i].provider || undefined);
            entry.model = entry.model ?? (refs[i].model || undefined);
          }
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
      // 之后再发要加序号避撞（首次沿用原分支名）
      const cwdBranch = todo.newBranch
        ? seqBase === 0
          ? todo.newBranch.trim()
          : `${branchFromTitle(todo.newBranch.trim())}-a${seqBase + 1}`
        : "";
      const isWorktree = (todo.isolation ?? "local") === "worktree";
      const source =
        isWorktree && todo.newBranch && todo.baseBranch
          ? {
              kind: "worktree" as const,
              cwd: todo.cwd,
              action: "branch-off" as const,
              baseBranch: todo.baseBranch.trim() || "main",
              branchName: cwdBranch,
              worktreeSlug: branchFromTitle(cwdBranch),
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
          branch: cwdBranch,
          dir: ws.directory || undefined,
        });
      }
      for (let i = 0; i < refs.length; i++) {
        const launched = await launchAgentOrTerminal(
          paseo,
          ws,
          refs[i],
          multi ? `${title} #${i + 1}` : title,
          `${prompt}\n\n${taskDocHint(ws.id)}`,
        );
        if (launched.agentId) agentIds.push(launched.agentId);
        if (launched.terminalId) terminalIds.push(launched.terminalId);
        if (source.kind === "worktree") {
          const entry = wtWorkspaces[wtWorkspaces.length - 1];
          entry.agentId = entry.agentId ?? launched.agentId;
          entry.terminalId = entry.terminalId ?? launched.terminalId;
          entry.provider = entry.provider ?? (refs[i].provider || undefined);
          entry.model = entry.model ?? (refs[i].model || undefined);
        }
      }
    }

    // 名单只有一份：新马追加进去，谁结束都认（不分批次）
    const allAgentIds = [...(todo.agentIds ?? []), ...agentIds];
    const allTerminalIds = [...(todo.terminalIds ?? []), ...terminalIds];
    const allWorktrees = [...(todo.worktrees ?? []), ...wtWorkspaces];
    const next: Todo = {
      ...todo,
      status: "running",
      agentIds: allAgentIds,
      terminalIds: allTerminalIds.length ? allTerminalIds : undefined,
      pendingAgentIds: [...(todo.pendingAgentIds ?? []), ...agentIds],
      worktreeRepo: wtRepo,
      worktrees: allWorktrees.length ? allWorktrees : undefined,
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
  const todo = listTodos().find(
    (t) =>
      (t.status === "running" || t.status === "failed") &&
      (t.agentIds ?? []).includes(agentId),
  );
  if (!todo) return null;
  const now = new Date().toISOString();

  if (outcome === "failed" || outcome === "canceled") {
    // 只标记失败，名单里的马原样留着：这个会话再跑起来就能自己恢复
    return saveTodo({
      ...todo,
      status: "failed",
      finishedAt: now,
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
  return saveTodo({
    ...todo,
    status: "running",
    finishedAt: undefined,
    error: undefined,
    pendingAgentIds: pool,
  });
}

/** 名单里的某个会话又开始跑了：上一次的失败作废，待办恢复进行中。 */
export function reviveByAgentId(agentId: string): Todo | null {
  const todo = listTodos().find(
    (t) => t.status === "failed" && (t.agentIds ?? []).includes(agentId),
  );
  if (!todo) return null;
  return saveTodo({
    ...todo,
    status: "running",
    finishedAt: undefined,
    error: undefined,
  });
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
    if (repo) {
      await deleteBranches(
        repo,
        hit.map((w) => w.branch),
      );
    }
    // 归档 = 把这匹马从名单里去掉；它的会话号也一并摘掉
    const gone = new Set(
      hit.flatMap((w) => [w.agentId, w.terminalId]).filter(Boolean) as string[],
    );
    const keep = (ids?: string[]) =>
      (ids ?? []).filter((id) => !gone.has(id));
    const agentIds = keep(t.agentIds);
    const terminalIds = keep(t.terminalIds);
    const pendingAgentIds = keep(t.pendingAgentIds);
    saveTodo({
      ...t,
      worktrees: (t.worktrees ?? []).filter(
        (w) => w.workspaceId !== workspaceId,
      ),
      agentIds,
      terminalIds: terminalIds.length ? terminalIds : undefined,
      pendingAgentIds,
      // 名单里没有还在跑的马了，这个待办才算完成
      ...(t.status === "running" && pendingAgentIds.length === 0
        ? {
            status: "done" as const,
            finishedAt: new Date().toISOString(),
            error: undefined,
          }
        : {}),
    });
  }
}

export function completeByWorkspaceId(
  workspaceId: string,
  archivedAt?: string,
): Todo[] {
  const now = archivedAt ?? new Date().toISOString();
  return listTodos()
    .filter(
      (t) =>
        t.status === "running" &&
        t.workspaceId === workspaceId &&
        (t.pendingAgentIds ?? []).length === 0,
    )
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
