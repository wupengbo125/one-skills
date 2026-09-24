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

async function resolveProviderField(
  paseo: PluginHandlerContext["paseo"],
  provider: string,
  model?: string,
): Promise<string> {
  if (model) {
    if (model.startsWith(provider + "/")) return model;
    return `${provider}/${model}`;
  }
  try {
    const res = await paseo.providers.listModels(provider);
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
  if (!todo.prompt.trim()) {
    return { ok: false, todo, error: "提示词为空，先填提示词" };
  }

  const title = todo.title;
  const skillPrefix =
    todo.skills && todo.skills.length > 0
      ? `[使用技能: ${todo.skills.join(", ")}。若未安装或未找到上述技能，必须立即向我反馈，不得擅自执行]\n\n`
      : "";
  const prompt = skillPrefix + (todo.prompt || todo.title);
  const now = new Date().toISOString();
  const multi = refs.length > 1;

  try {
    const configs: string[] = [];
    for (const ref of refs) {
      configs.push(await resolveProviderField(paseo, ref.provider, ref.model));
    }

    let workspaceId = todo.workspaceId;
    let workspaceName = todo.workspaceName;
    let projectPath = todo.projectPath;
    let projectId = todo.projectId;
    const agentIds: string[] = [];

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
      for (let i = 0; i < configs.length; i++) {
        const handle = await ws.agents.create({
          config: { provider: configs[i] },
          title: multi ? `${title} #${i + 1}` : title,
          prompt,
        });
        agentIds.push(handle.id);
      }
      workspaceName = workspaceName ?? todo.workspaceName;
    } else if (projectPath) {
      const isWorktree = (todo.isolation ?? "local") === "worktree";

      if (isWorktree && multi) {
        for (let i = 0; i < configs.length; i++) {
          const branchName = todo.newBranch?.trim()
            ? `${branchFromTitle(todo.newBranch)}-a${i + 1}`
            : `${branchFromTitle(title)}-a${i + 1}`;
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
          if (i === 0) {
            workspaceId = ws.id;
            workspaceName = ws.name || title;
            projectId = ws.projectId || projectId;
            projectPath = ws.directory || projectPath;
          }
          const handle = await ws.agents.create({
            config: { provider: configs[i] },
            title: multi ? `${title} #${i + 1}` : title,
            prompt,
          });
          agentIds.push(handle.id);
        }
      } else {
        const source = isWorktree
          ? {
              kind: "worktree" as const,
              cwd: projectPath,
              ...(projectId ? { projectId } : {}),
              branchName: todo.newBranch?.trim() || branchFromTitle(title),
              worktreeSlug: branchFromTitle(todo.newBranch?.trim() || title),
            }
          : {
              kind: "directory" as const,
              path: projectPath,
              ...(projectId ? { projectId } : {}),
            };

        const ws = await paseo.workspaces.create({ source, title });
        workspaceId = ws.id;
        workspaceName = ws.name ?? title;
        projectId = ws.projectId ?? projectId;
        projectPath = ws.directory ?? projectPath;

        for (let i = 0; i < configs.length; i++) {
          const handle = await ws.agents.create({
            config: { provider: configs[i] },
            title: multi ? `${title} #${i + 1}` : title,
            prompt,
          });
          agentIds.push(handle.id);
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
      for (let i = 0; i < configs.length; i++) {
        const createOpts: Parameters<typeof paseo.agents.create>[0] = {
          config: { provider: configs[i] },
          cwd: todo.cwd,
          title: multi ? `${title} #${i + 1}` : title,
          prompt,
        };
        if (todo.newBranch && todo.baseBranch) {
          createOpts.worktree = {
            mode: "branch-off",
            newBranch:
              multi && i > 0
                ? `${branchFromTitle(todo.newBranch)}-a${i + 1}`
                : todo.newBranch,
            base: todo.baseBranch,
          };
        }
        const handle = await paseo.agents.create(createOpts);
        agentIds.push(handle.id);
        if (i === 0) workspaceId = handle.workspaceId || workspaceId;
      }
    }

    const next: Todo = {
      ...todo,
      status: "running",
      agentIds,
      pendingAgentIds: [...agentIds],
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
