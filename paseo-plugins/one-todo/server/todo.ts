import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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
  listSkillsRpc,
  listTodosRpc,
  listWorkspacesRpc,
  removeTodoRpc,
  startTodoRpc,
  updateTodoRpc,
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
import { getPreferences } from "./preferences";
import { toPlacement, type PlacementInput } from "./placement";

export function handleListTodos() {
  return { todos: listTodos(), preferences: getPreferences() };
}

export function handleListSkills(): { skills: string[] } {
  const dirs = [
    join(homedir(), ".agents", "skills"),
    join(homedir(), ".claude", "skills"),
  ];
  const skillNames = new Set<string>();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      const names = readdirSync(dir);
      for (const name of names) {
        if (name.startsWith(".")) continue;
        try {
          const fullPath = join(dir, name);
          if (statSync(fullPath).isDirectory()) {
            skillNames.add(name);
          }
        } catch {
          // skip broken symlinks
        }
      }
    } catch {
      // ignore
    }
  }
  return { skills: Array.from(skillNames).sort((a, b) => a.localeCompare(b)) };
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
  const placement = toPlacement({
    projectId: input.projectId,
    projectName: input.projectName,
    projectPath: input.projectPath,
    isolation: input.isolation,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    cwd: input.cwd,
  });
  const todo: Todo = {
    id: randomUUID(),
    title: input.title.trim(),
    prompt: input.prompt ?? "",
    skills: input.skills ?? [],
    agents: input.agents?.length ? input.agents : [{ provider: "", model: "" }],
    source,
    issueRef: input.issueRef,
    issueUrl: input.issueUrl,
    ...placement,
    baseBranch: input.baseBranch?.trim() || undefined,
    newBranch: input.newBranch?.trim() || undefined,
    pinned: input.pinned,
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
  }
  if (p.skills !== undefined) next.skills = p.skills;
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
    const placement = toPlacement({
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
  if (p.pinned !== undefined) next.pinned = p.pinned;
  if (p.status !== undefined) {
    next.status = p.status;
    if (p.status === "running") {
      next.error = undefined;
      next.finishedAt = undefined;
    }
    if (p.status === "pending") {
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

const AGY_MODELS = [
  { id: "gemini-3.8-flash-high", label: "Gemini 3.8 Flash (High)" },
  { id: "gemini-3.8-flash-medium", label: "Gemini 3.8 Flash (Medium)", isDefault: true },
  { id: "gemini-3.8-flash-low", label: "Gemini 3.8 Flash (Low)" },
  { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
  { id: "gemini-3.7-flash-medium", label: "Gemini 3.7 Flash (Medium)" },
  { id: "gemini-3.7-flash-low", label: "Gemini 3.7 Flash (Low)" },
  { id: "gemini-3.6-flash-high", label: "Gemini 3.6 Flash (High)" },
  { id: "gemini-3.6-flash-medium", label: "Gemini 3.6 Flash (Medium)" },
  { id: "gemini-3.6-flash-low", label: "Gemini 3.6 Flash (Low)" },
  { id: "gemini-3.1-pro-high", label: "Gemini 3.1 Pro (High)" },
  { id: "gemini-3.1-pro-low", label: "Gemini 3.1 Pro (Low)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
  { id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" },
];

export async function handleListProviders({ paseo }: PluginHandlerContext) {
  try {
    const res = await paseo.providers.listAvailable();
    const providers = (res.providers ?? [])
      .filter((p) => p.available)
      .map((p) => ({ id: p.provider, available: p.available }));
    if (!providers.some((p) => p.id === "agy")) {
      providers.push({ id: "agy", available: true });
    }
    return { providers };
  } catch {
    return { providers: [{ id: "agy", available: true }] };
  }
}

export async function handleListModels(
  input: RpcInput<typeof listModelsRpc>,
  { paseo }: PluginHandlerContext,
) {
  if (input.provider.toLowerCase() === "agy") {
    return { models: AGY_MODELS };
  }
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

export {
  addTodoRpc,
  createIssueRpc,
  fetchIssueRpc,
  listIssuesRpc,
  listModelsRpc,
  listProjectsRpc,
  listProvidersRpc,
  listSkillsRpc,
  listTodosRpc,
  listWorkspacesRpc,
  removeTodoRpc,
  startTodoRpc,
  updateTodoRpc,
};
