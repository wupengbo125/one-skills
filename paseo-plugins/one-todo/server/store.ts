import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Todo } from "../shared/todo";

const DATA_DIR = join(homedir(), ".paseo", "plugin-data", "one-todo");
const DATA_FILE = join(DATA_DIR, "todos.json");

let cache: Todo[] | null = null;

function normalizeTodo(raw: Todo): Todo {
  const t = { ...raw } as Todo & { source?: string };
  if (t.source === ("manual" as Todo["source"])) t.source = "todo";
  if (!t.source) t.source = "todo";
  if (!Array.isArray(t.agents) || t.agents.length === 0) {
    t.agents = t.provider ? [{ provider: t.provider, model: t.model }] : [];
  }
  if (t.agents.length === 0) t.agents = [{ provider: "", model: "" }];
  if (!t.agentIds) t.agentIds = t.agentId ? [t.agentId] : [];
  if (!t.pendingAgentIds) {
    t.pendingAgentIds = t.status === "running" ? [...t.agentIds] : [];
  }
  if (t.prompt == null) t.prompt = "";
  return t as Todo;
}

function ensureLoaded(): Todo[] {
  if (cache) return cache;
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      cache = Array.isArray(parsed)
        ? (parsed as Todo[]).map(normalizeTodo)
        : [];
    } else {
      cache = [];
    }
  } catch {
    cache = [];
  }
  return cache;
}

function persist(todos: Todo[]): void {
  cache = todos;
  mkdirSync(DATA_FILE ? dirname(DATA_FILE) : DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), "utf8");
}

export function listTodos(): Todo[] {
  return [...ensureLoaded()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getTodo(id: string): Todo | undefined {
  return ensureLoaded().find((t) => t.id === id);
}

export function saveTodo(todo: Todo): Todo {
  const todos = ensureLoaded();
  const normalized = normalizeTodo(todo);
  const idx = todos.findIndex((t) => t.id === normalized.id);
  if (idx >= 0) todos[idx] = normalized;
  else todos.push(normalized);
  persist(todos);
  return normalized;
}

export function removeTodo(id: string): boolean {
  const todos = ensureLoaded();
  const next = todos.filter((t) => t.id !== id);
  if (next.length === todos.length) return false;
  persist(next);
  return true;
}

export function findTodoByIssueRef(issueRef: string): Todo | undefined {
  return ensureLoaded().find((t) => t.issueRef === issueRef);
}
