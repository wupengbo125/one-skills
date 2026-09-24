import type { Todo } from "../shared/todo";

type LegacyTodo = Todo & {
  provider?: string;
  model?: string;
  agentId?: string;
};

export function normalizeTodo(raw: Todo): Todo {
  const t = { ...raw } as Todo & { source?: string };
  if (t.source === ("manual" as Todo["source"])) t.source = "todo";
  if (!t.source) t.source = "todo";

  // migrate legacy provider/model/agentId onto agents[]/agentIds[]
  const legacy = t as LegacyTodo;
  if (!Array.isArray(t.agents) || t.agents.length === 0) {
    t.agents = legacy.provider
      ? [{ provider: legacy.provider, model: legacy.model }]
      : [];
  }
  if (t.agents.length === 0) t.agents = [{ provider: "", model: "" }];
  if (!t.agentIds) t.agentIds = legacy.agentId ? [legacy.agentId] : [];
  if (!t.pendingAgentIds) {
    t.pendingAgentIds = t.status === "running" ? [...t.agentIds] : [];
  }
  delete legacy.provider;
  delete legacy.model;
  delete legacy.agentId;

  if (!Array.isArray(t.skills)) t.skills = [];
  if (t.prompt == null) t.prompt = "";
  for (const k of Object.keys(t) as Array<keyof Todo>) {
    if (t[k] === null) {
      delete t[k];
    }
  }
  return t as Todo;
}
