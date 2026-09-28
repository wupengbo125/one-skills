import { isTerminalProvider, type Todo } from "../shared/todo";

type LegacyWorktree = {
  workspaceId: string;
  branch: string;
  dir?: string;
  agentId?: string;
  terminalId?: string;
};

type LegacyTodo = Todo & {
  provider?: string;
  model?: string;
  agentId?: string;
  // 旧记录：会话号存在几条平行名单里，分支工作区另存一张表
  agentIds?: string[];
  terminalIds?: string[];
  pendingAgentIds?: string[];
  worktrees?: LegacyWorktree[];
};

/**
 * 老记录搬家：会话号原来在三条平行名单里、分支工作区另存一张表，搬回每匹马自己身上再删旧字段。
 * 老数据不一定都标过"跑过"，所以：先按"会话 / 终端"分别对号（旧代码就是这么分开记的），
 * 分支工作区按会话号认，认不出的给还没记住处的马；能认出来的马就算跑过。
 */
function moveLegacyHorseFields(t: Todo, legacy: LegacyTodo): void {
  const oldAgentIds = legacy.agentIds ?? [];
  const oldTerminalIds = legacy.terminalIds ?? [];
  const oldWorktrees = legacy.worktrees ?? [];
  const all = t.agents ?? [];
  // 标过跑过的排前面，其余按名单顺序补
  const pool = [
    ...all.filter((a) => a.spawnedAt),
    ...all.filter((a) => !a.spawnedAt),
  ];

  // 1. 会话号：旧代码按"会话 / 终端"分开 push，所以也分开对号
  const free = pool.filter((a) => !a.agentId && !a.terminalId);
  const sessionHorses = free.filter((a) => !isTerminalProvider(a.provider));
  const terminalHorses = free.filter((a) => isTerminalProvider(a.provider));
  sessionHorses.forEach((a, i) => {
    if (oldAgentIds[i]) a.agentId = oldAgentIds[i];
  });
  terminalHorses.forEach((a, i) => {
    if (oldTerminalIds[i]) a.terminalId = oldTerminalIds[i];
  });

  // 2. 分支工作区：先按会话号认（最准），再按旧分支名里的号（＝当年名单上的位置），
  //    都认不出才给还没记住处的马
  const ran = pool.filter((a) => a.agentId || a.terminalId || a.spawnedAt);
  const suffixNo = (branch?: string) => {
    const n = Number(/-a(\d+)$/.exec(branch ?? "")?.[1] ?? 0);
    return n > 0 ? n : 0;
  };
  for (const w of oldWorktrees) {
    const session = w.agentId ?? w.terminalId;
    const byPosition = all[suffixNo(w.branch) - 1];
    const usable =
      byPosition &&
      !byPosition.workspaceId &&
      (byPosition.agentId || byPosition.terminalId || byPosition.spawnedAt)
        ? byPosition
        : undefined;
    const horse =
      (session
        ? ran.find((a) => a.agentId === session || a.terminalId === session)
        : undefined) ??
      usable ??
      ran.find((a) => !a.workspaceId);
    if (!horse) continue;
    horse.workspaceId = horse.workspaceId ?? w.workspaceId;
    horse.branch = horse.branch ?? w.branch;
    horse.dir = horse.dir ?? w.dir;
  }

  // 3. 号：老分支名里的号能用就沿用（免得以后发新号撞上旧分支名），用不了才补空号
  const used = new Set<number>();
  for (const a of ran) {
    if (a.no) used.add(a.no);
  }
  let fill = 0;
  for (const a of ran) {
    if (a.no) continue;
    const fromBranch = suffixNo(a.branch);
    if (fromBranch && !used.has(fromBranch)) {
      a.no = fromBranch;
    } else {
      do {
        fill += 1;
      } while (used.has(fill));
      a.no = fill;
    }
    used.add(a.no);
  }
  let maxNo = t.nextNo ?? 0;
  for (const a of ran) maxNo = Math.max(maxNo, a.no ?? 0, suffixNo(a.branch));

  // 4. 有会话或分支就算跑过；住处还没记住就住待办自己的主工作区
  const ranAt = t.startedAt ?? t.createdAt ?? new Date().toISOString();
  for (const a of ran) {
    if ((a.agentId || a.terminalId || a.branch) && !a.spawnedAt) {
      a.spawnedAt = ranAt;
    }
    if (!a.workspaceId && t.workspaceId) a.workspaceId = t.workspaceId;
    maxNo = Math.max(maxNo, suffixNo(a.branch));
  }
  if (maxNo > 0) t.nextNo = maxNo;

  delete legacy.agentIds;
  delete legacy.terminalIds;
  delete legacy.pendingAgentIds;
  delete legacy.worktrees;
}

export function normalizeTodo(raw: Todo): Todo {
  const t = { ...raw } as Todo & { source?: string };
  // 老记录：评审那块以前叫 arbitration，字段叫 judge，kind 叫 arbitrate/review
  const legacyReview = (t as unknown as {
    arbitration?: {
      kind?: string;
      judge?: unknown;
      [k: string]: unknown;
    };
  }).arbitration;
  if (legacyReview && !t.review) {
    const { kind, judge, ...rest } = legacyReview;
    t.review = {
      ...(rest as NonNullable<Todo["review"]>),
      kind:
        kind === "arbitrate" ? "multi" : kind === "review" ? "single" : undefined,
      reviewer: judge as NonNullable<Todo["review"]>["reviewer"],
    };
  }
  delete (t as unknown as { arbitration?: unknown }).arbitration;
  if (t.source === ("manual" as Todo["source"])) t.source = "todo";
  if (!t.source) t.source = "todo";

  // 老记录：provider/model 并进 agents[]
  const legacy = t as LegacyTodo;
  if (!Array.isArray(t.agents) || t.agents.length === 0) {
    t.agents = legacy.provider
      ? [{ provider: legacy.provider, model: legacy.model }]
      : [];
  }
  if (t.agents.length === 0) t.agents = [{ provider: "", model: "" }];
  delete legacy.provider;
  delete legacy.model;
  delete legacy.agentId;
  moveLegacyHorseFields(t, legacy);

  if (!Array.isArray(t.skills)) t.skills = [];
  if (t.prompt == null) t.prompt = "";
  for (const k of Object.keys(t) as Array<keyof Todo>) {
    if (t[k] === null) {
      delete t[k];
    }
  }
  return t as Todo;
}
