import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  addTodoRpc,
  createIssueRpc,
  fetchIssueRpc,
  listIssuesRpc,
  listModelsRpc,
  listProjectsRpc,
  listProvidersRpc,
  listTodosRpc,
  listWorkspacesRpc,
  removeTodoRpc,
  startTodoRpc,
  updateTodoRpc,
  type AgentRef,
  type Todo,
  type TodoSource,
} from "../shared/todo";
import {
  findTodoByIssueRef,
  getTodo,
  listTodos,
  removeTodo,
  saveTodo,
} from "./store";

const execFileAsync = promisify(execFile);

export function handleListTodos() {
  return { todos: listTodos() };
}

type PlacementInput = {
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  workspaceId?: string;
  workspaceName?: string;
  cwd?: string;
  isolation?: "local" | "worktree";
};

function pickPlacement(input: PlacementInput) {
  if (input.workspaceId) {
    return {
      projectId: undefined as string | undefined,
      projectName: undefined as string | undefined,
      projectPath: undefined as string | undefined,
      isolation: undefined as "local" | "worktree" | undefined,
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName?.trim() || undefined,
      cwd: undefined as string | undefined,
    };
  }
  const hasProject = Boolean(input.projectId || input.projectPath);
  return {
    projectId: input.projectId || undefined,
    projectName: hasProject
      ? input.projectName?.trim() || undefined
      : undefined,
    projectPath: input.projectPath || undefined,
    isolation: hasProject ? (input.isolation ?? "local") : undefined,
    workspaceId: undefined as string | undefined,
    workspaceName: undefined as string | undefined,
    cwd: hasProject ? undefined : input.cwd?.trim() || undefined,
  };
}

function primaryAgent(agents: AgentRef[]): AgentRef {
  return agents[0] ?? { provider: "" };
}

function defaultSource(source?: TodoSource): TodoSource {
  return source === "issue" ? "issue" : "todo";
}

export function handleAddTodo(input: RpcInput<typeof addTodoRpc>): {
  todo: Todo;
} {
  const now = new Date().toISOString();
  const source = defaultSource(input.source);
  const existing =
    source === "issue" && input.issueRef
      ? findTodoByIssueRef(input.issueRef)
      : undefined;
  if (existing) {
    const merged: Todo = {
      ...existing,
      title: input.title.trim() || existing.title,
      prompt: input.prompt ?? existing.prompt,
      issueUrl: input.issueUrl || existing.issueUrl,
      issueRef: input.issueRef || existing.issueRef,
    };
    return { todo: saveTodo(merged) };
  }
  const todo: Todo = {
    id: randomUUID(),
    title: input.title.trim(),
    prompt: input.prompt ?? "",
    provider: "",
    model: undefined,
    agents: [{ provider: "", model: "" }],
    source,
    issueRef: input.issueRef,
    issueUrl: input.issueUrl,
    status: "pending",
    createdAt: now,
  };
  return { todo: saveTodo(todo) };
}

export function handleUpdateTodo(input: RpcInput<typeof updateTodoRpc>): {
  todo: Todo | null;
} {
  const existing = getTodo(input.id);
  if (!existing) return { todo: null };
  const next: Todo = { ...existing };
  const p = input.patch;
  if (p.title !== undefined) next.title = p.title.trim();
  if (p.prompt !== undefined) next.prompt = p.prompt;
  if (p.agents !== undefined) {
    next.agents = p.agents;
    const first = primaryAgent(p.agents);
    next.provider = first.provider;
    next.model = first.model;
  }
  if (p.source !== undefined) next.source = defaultSource(p.source);
  if (p.issueRef !== undefined) next.issueRef = p.issueRef || undefined;
  if (p.issueUrl !== undefined) next.issueUrl = p.issueUrl || undefined;

  const placementTouched =
    p.projectId !== undefined ||
    p.projectPath !== undefined ||
    p.projectName !== undefined ||
    p.workspaceId !== undefined ||
    p.workspaceName !== undefined ||
    p.cwd !== undefined ||
    p.isolation !== undefined;
  if (placementTouched) {
    const placement = pickPlacement({
      projectId: p.projectId !== undefined ? p.projectId : next.projectId,
      projectName:
        p.projectName !== undefined ? p.projectName : next.projectName,
      projectPath:
        p.projectPath !== undefined ? p.projectPath : next.projectPath,
      workspaceId:
        p.workspaceId !== undefined ? p.workspaceId : next.workspaceId,
      workspaceName:
        p.workspaceName !== undefined ? p.workspaceName : next.workspaceName,
      cwd: p.cwd !== undefined ? p.cwd : next.cwd,
      isolation: p.isolation !== undefined ? p.isolation : next.isolation,
    });
    next.projectId = placement.projectId;
    next.projectName = placement.projectName;
    next.projectPath = placement.projectPath;
    next.isolation = placement.isolation;
    next.workspaceId = placement.workspaceId;
    next.workspaceName = placement.workspaceName;
    next.cwd = placement.cwd;
  }
  if (p.baseBranch !== undefined)
    next.baseBranch = p.baseBranch.trim() || undefined;
  if (p.newBranch !== undefined)
    next.newBranch = p.newBranch.trim() || undefined;
  if (p.status !== undefined) {
    next.status = p.status;
    if (p.status === "pending") {
      next.agentId = undefined;
      next.agentIds = [];
      next.pendingAgentIds = [];
      next.startedAt = undefined;
      next.finishedAt = undefined;
      next.error = undefined;
    }
    if (p.status === "done") {
      next.finishedAt = new Date().toISOString();
      next.error = undefined;
    }
    if (p.status === "failed") {
      next.finishedAt = new Date().toISOString();
    }
  }
  return { todo: saveTodo(next) };
}

export function handleRemoveTodo(input: RpcInput<typeof removeTodoRpc>) {
  return { ok: removeTodo(input.id) };
}

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

function slugifyBranch(input: string): string {
  const cleaned = input
    .replace(/[^\w.-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return cleaned || `todo-${Date.now().toString(36)}`;
}

function todoAgents(todo: Todo): AgentRef[] {
  if (todo.agents?.length && todo.agents.some((a) => a.provider)) {
    return todo.agents.filter((a) => a.provider);
  }
  if (todo.provider) return [{ provider: todo.provider, model: todo.model }];
  return [];
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
  if (input.agents || input.prompt !== undefined || hasPlacementPatch) {
    const updated = handleUpdateTodo({
      id: base.id,
      patch: {
        ...(input.agents ? { agents: input.agents } : {}),
        ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
        ...(hasPlacementPatch ? placementPatch : {}),
      },
    });
    if (!updated.todo) return { ok: false, todo: null, error: "待办不存在" };
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
  const prompt = todo.prompt;
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

    if (todo.workspaceId) {
      const ws = paseo.workspaces.ref(todo.workspaceId);
      for (let i = 0; i < configs.length; i++) {
        const handle = await ws.agents.create({
          config: { provider: configs[i] },
          title: multi ? `${title} #${i + 1}` : title,
          prompt,
        });
        agentIds.push(handle.id);
      }
      workspaceName = workspaceName ?? todo.workspaceName;
    } else if (todo.projectPath) {
      const isWorktree = (todo.isolation ?? "local") === "worktree";

      if (isWorktree && multi) {
        for (let i = 0; i < configs.length; i++) {
          const branchName = todo.newBranch?.trim()
            ? `${slugifyBranch(todo.newBranch)}-a${i + 1}`
            : `${slugifyBranch(title)}-a${i + 1}`;
          const ws = await paseo.workspaces.create({
            source: {
              kind: "worktree",
              cwd: todo.projectPath,
              ...(todo.projectId ? { projectId: todo.projectId } : {}),
              action: "branch-off",
              baseBranch: todo.baseBranch?.trim() || "main",
              branchName,
              worktreeSlug: slugifyBranch(branchName),
            },
            title: multi ? `${title} #${i + 1}` : title,
          });
          if (i === 0) {
            workspaceId = ws.id;
            workspaceName = ws.name ?? title;
            projectId = ws.projectId ?? projectId;
            projectPath = ws.directory ?? projectPath;
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
              cwd: todo.projectPath,
              ...(todo.projectId ? { projectId: todo.projectId } : {}),
              action: "branch-off" as const,
              baseBranch: todo.baseBranch?.trim() || "main",
              branchName: todo.newBranch?.trim() || slugifyBranch(title),
              worktreeSlug: slugifyBranch(todo.newBranch?.trim() || title),
            }
          : {
              kind: "directory" as const,
              path: todo.projectPath,
              ...(todo.projectId ? { projectId: todo.projectId } : {}),
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
                ? `${slugifyBranch(todo.newBranch)}-a${i + 1}`
                : todo.newBranch,
            base: todo.baseBranch,
          };
        }
        const handle = await paseo.agents.create(createOpts);
        agentIds.push(handle.id);
        if (i === 0) workspaceId = handle.workspaceId ?? workspaceId;
      }
    }

    const next: Todo = {
      ...todo,
      status: "running",
      agentId: agentIds[0],
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
    (t) =>
      t.status === "running" &&
      ((t.agentIds ?? []).includes(agentId) || t.agentId === agentId),
  );
  if (!todo) return null;
  const now = new Date().toISOString();

  if (outcome === "failed") {
    return saveTodo({
      ...todo,
      status: "failed",
      finishedAt: now,
      pendingAgentIds: [],
      error: errorMessage || "agent turn failed",
    });
  }

  const pool = (
    todo.pendingAgentIds ??
    todo.agentIds ??
    (todo.agentId ? [todo.agentId] : [])
  ).filter((id) => id !== agentId);
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

export async function handleListProviders({ paseo }: PluginHandlerContext) {
  try {
    const res = await paseo.providers.listAvailable();
    return {
      providers: (res.providers ?? [])
        .filter((p) => p.available)
        .map((p) => ({ id: p.provider, available: p.available })),
    };
  } catch {
    return { providers: [] };
  }
}

export async function handleListModels(
  input: RpcInput<typeof listModelsRpc>,
  { paseo }: PluginHandlerContext,
) {
  try {
    const res = await paseo.providers.listModels(input.provider);
    const models = (res.models ?? [])
      .filter((m) => m.isSelectable !== false)
      .map((m) => ({
        id: m.id,
        label: m.label || m.id,
        isDefault: m.isDefault,
      }));
    return { models };
  } catch {
    return { models: [] };
  }
}

export async function handleListWorkspaces({ paseo }: PluginHandlerContext) {
  try {
    const res = await paseo.workspaces.list();
    return {
      workspaces: (res.entries ?? []).map((w) => ({
        id: w.id,
        name: w.title || w.name,
        title: w.title ?? undefined,
        directory: w.workspaceDirectory ?? w.projectRootPath ?? undefined,
        projectId: w.projectId ?? undefined,
      })),
    };
  } catch {
    return { workspaces: [] };
  }
}

export async function handleListProjects({ paseo }: PluginHandlerContext) {
  try {
    const res = await paseo.projects.list();
    const projects = (res.projects ?? []).map((p) => ({
      id: p.projectId,
      name: p.projectDisplayName || p.projectRootPath,
      path: p.projectRootPath,
      kind: p.projectKind,
    }));
    return { projects };
  } catch {
    return { projects: [] };
  }
}

function parseIssueRef(ref: string): { repo: string; number: number } | null {
  const s = ref.trim();
  const url = s.match(/github\.com\/([^/]+\/[^/#]+)\/(?:issues|pull)\/(\d+)/i);
  if (url) return { repo: url[1], number: Number(url[2]) };
  const hash = s.match(/^(.+?\/.+?)#(\d+)$/);
  if (hash) return { repo: hash[1], number: Number(hash[2]) };
  const space = s.match(/^(.+?\/.+?)\s+(\d+)$/);
  if (space) return { repo: space[1], number: Number(space[2]) };
  return null;
}

export async function handleCreateIssue(
  input: RpcInput<typeof createIssueRpc>,
): Promise<{ number: number; url: string; repo: string }> {
  const args = ["issue", "create", "-R", input.repo, "--title", input.title];
  const body = input.body?.trim();
  if (body) args.push("--body", body);
  const { stdout } = await execFileAsync("gh", args, {
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env },
  });
  const out = stdout.trim();
  const urlM = out.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/);
  if (!urlM) {
    const n = out.match(/(\d+)\s*$/);
    if (!n) throw new Error(out || "创建 Issue 失败");
    return {
      number: Number(n[1]),
      url: `https://github.com/${input.repo}/issues/${n[1]}`,
      repo: input.repo,
    };
  }
  return { number: Number(urlM[1]), url: urlM[0], repo: input.repo };
}

export async function handleFetchIssue(input: RpcInput<typeof fetchIssueRpc>) {
  const parsed = parseIssueRef(input.ref);
  if (!parsed) {
    throw new Error("无法识别。格式：owner/repo#123 或 GitHub Issue 链接");
  }
  const { stdout } = await execFileAsync(
    "gh",
    [
      "issue",
      "view",
      String(parsed.number),
      "-R",
      parsed.repo,
      "--json",
      "title,body,number,url",
    ],
    { timeout: 20_000, maxBuffer: 1024 * 1024, env: { ...process.env } },
  );
  const data = JSON.parse(stdout) as {
    title: string;
    body?: string | null;
    number: number;
    url: string;
  };
  return {
    title: data.title,
    body: (data.body ?? "").trim(),
    number: data.number,
    repo: parsed.repo,
    url: data.url,
  };
}

async function remoteRepo(path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", path, "remote", "get-url", "origin"],
      { timeout: 8_000, maxBuffer: 64 * 1024 },
    );
    const url = stdout.trim();
    if (!url) return null;
    const m =
      url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/) ||
      url.match(/git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function handleListIssues(
  input: RpcInput<typeof listIssuesRpc>,
  { paseo }: PluginHandlerContext,
) {
  let projectEntries: { path: string; name: string; id: string }[] = [];
  try {
    const res = await paseo.projects.list();
    projectEntries = (res.projects ?? []).map((p) => ({
      path: p.projectRootPath,
      name: p.projectDisplayName || p.projectRootPath,
      id: p.projectId,
    }));
  } catch {
    projectEntries = [];
  }
  let projectPaths = projectEntries.map((p) => p.path);
  if (input.projectPath) {
    projectPaths = projectPaths.filter((p) => p === input.projectPath);
    if (projectPaths.length === 0 && input.projectPath) {
      projectPaths = [input.projectPath];
    }
  }

  const pathByRepo = new Map<
    string,
    { path: string; name: string; id: string }
  >();
  const repos: string[] = [];
  const seen = new Set<string>();
  for (const entry of projectEntries) {
    if (input.projectPath && entry.path !== input.projectPath) continue;
    const repo = await remoteRepo(entry.path);
    if (repo && !seen.has(repo)) {
      seen.add(repo);
      repos.push(repo);
      pathByRepo.set(repo, entry);
    }
  }

  if (repos.length === 0) {
    return {
      issues: [],
      repos: [],
      error: "没有本地 GitHub 仓库。先在 Paseo 里 Add project。",
    };
  }

  const issues: {
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
  }[] = [];
  let lastErr: string | undefined;

  for (const repo of repos) {
    try {
      const { stdout } = await execFileAsync(
        "gh",
        [
          "issue",
          "list",
          "-R",
          repo,
          "--state",
          "open",
          "--limit",
          "30",
          "--json",
          "number,title,url,state,updatedAt",
        ],
        { timeout: 20_000, maxBuffer: 1024 * 1024, env: { ...process.env } },
      );
      const list = JSON.parse(stdout) as {
        number: number;
        title: string;
        url: string;
        state: string;
        updatedAt?: string;
      }[];
      const bound = pathByRepo.get(repo);
      for (const it of list) {
        issues.push({
          repo,
          number: it.number,
          title: it.title,
          url: it.url,
          state: it.state,
          updatedAt: it.updatedAt,
          projectPath: bound?.path,
          projectName: bound?.name,
          projectId: bound?.id,
        });
      }
    } catch (err: unknown) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }

  issues.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return {
    issues,
    repos,
    ...(issues.length === 0 && lastErr ? { error: lastErr } : {}),
  };
}

export {
  addTodoRpc,
  createIssueRpc,
  fetchIssueRpc,
  listIssuesRpc,
  listModelsRpc,
  listProjectsRpc,
  listProvidersRpc,
  listTodosRpc,
  listWorkspacesRpc,
  removeTodoRpc,
  startTodoRpc,
  updateTodoRpc,
};
