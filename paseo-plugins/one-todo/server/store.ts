import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Todo, TodoPreferences } from "../shared/todo";

const DATA_DIR = join(homedir(), ".paseo", "plugin-data", "one-todo");
const DATA_FILE = join(DATA_DIR, "todos.json");
const PREF_FILE = join(DATA_DIR, "preferences.json");

let prefCache: TodoPreferences | null = null;

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
  if (!Array.isArray(t.skills)) t.skills = [];
  if (t.prompt == null) t.prompt = "";
  for (const k of Object.keys(t) as Array<keyof Todo>) {
    if (t[k] === null) {
      delete t[k];
    }
  }
  return t as Todo;
}

function ensureLoaded(): Todo[] {
  if (cache) return cache;
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      let items = Array.isArray(parsed)
        ? (parsed as Todo[]).map(normalizeTodo)
        : [];
      let maxSeq = items.reduce((max, t) => Math.max(max, t.seq ?? 0), 0);
      let changed = false;
      items = items.map((t) => {
        if (!t.seq) {
          maxSeq += 1;
          changed = true;
          return { ...t, seq: maxSeq };
        }
        return t;
      });
      cache = items;
      if (changed) {
        persist(items);
      }
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
  return [...ensureLoaded()].sort((a, b) => {
    const aPin = a.pinned ? 1 : 0;
    const bPin = b.pinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getTodo(id: string): Todo | undefined {
  return ensureLoaded().find((t) => t.id === id);
}

export function saveTodo(todo: Todo): Todo {
  const todos = ensureLoaded();
  const normalized = normalizeTodo(todo);
  const idx = todos.findIndex((t) => t.id === normalized.id);
  if (idx >= 0) {
    if (!normalized.seq) normalized.seq = todos[idx].seq;
    todos[idx] = normalized;
  } else {
    if (!normalized.seq) {
      const maxSeq = todos.reduce((max, t) => Math.max(max, t.seq ?? 0), 0);
      normalized.seq = maxSeq + 1;
    }
    todos.push(normalized);
  }
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

export function getPreferences(): TodoPreferences {
  if (prefCache) return prefCache;
  try {
    if (existsSync(PREF_FILE)) {
      const raw = readFileSync(PREF_FILE, "utf8");
      prefCache = JSON.parse(raw);
    } else {
      prefCache = {};
    }
  } catch {
    prefCache = {};
  }
  return prefCache ?? {};
}

export function savePreferences(patch: Partial<TodoPreferences>): TodoPreferences {
  const current = getPreferences();
  const next: TodoPreferences = { ...current, ...patch };
  prefCache = next;
  try {
    mkdirSync(dirname(PREF_FILE), { recursive: true });
    writeFileSync(PREF_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // ignore write error
  }
  return next;
}
