import type { RpcInput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  branchFromTitle,
  finishTodoRpc,
  horseBySession,
  initialKindOf,
  isTerminalProvider,
  primaryAgent,
  resetTodoRpc,
  startTodoRpc,
  type AgentRef,
  type Todo,
} from "../shared/todo";
import { getTodo, listTodos, saveTodo } from "./store";
import { savePreferences } from "./preferences";
import { handleUpdateTodo } from "./todo";
import { deleteBranches } from "./worktree";
import { readOrSeedTemplateRaw, type TplKind } from "./review";
import { taskDocPath } from "./taskdoc";

function formatInitialPrompt(
  basePrompt: string,
  wsId: string,
  kind: TplKind,
  members: string,
  skills: string[],
): string {
  let initial = "";
  try {
    initial = readOrSeedTemplateRaw(kind) || "";
  } catch {
    initial = "";
  }
  if (!initial.trim()) return basePrompt;
  const docPath = taskDocPath(wsId);
  const skillText = skills.join(", ");
  let tpl = initial
    .replace(/\{\{(docPath|taskDocPath)\}\}/g, docPath)
    .replace(/\{\{(id|workspaceId)\}\}/g, wsId)
    .replace(/\{\{members\}\}/g, members);
  if (skillText) {
    tpl = tpl.replace(/\{\{Skills\}\}/g, skillText);
  } else {
    // 没选技能：含 {{Skills}} 的那行整行丢掉，别剩「使用技能: 。」
    tpl = tpl
      .split("\n")
      .filter((line) => !line.includes("{{Skills}}"))
      .join("\n");
  }
  const extraText = tpl.trim();
  return extraText ? `${extraText}\n\n${basePrompt}` : basePrompt;
}

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

export async function launchAgentOrTerminal(
  paseo: PluginHandlerContext["paseo"],
  ws: ReturnType<PluginHandlerContext["paseo"]["workspaces"]["ref"]>,
  ref: AgentRef,
  title: string,
  prompt: string,
): Promise<{ agentId?: string; terminalId?: string }> {
  if (isTerminalProvider(ref.provider)) {
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

  // 赛马模式：第一次派马时按按钮定死，之后加马照它走，不能改
  const race = base.raceMode ?? Boolean(input.race);
  // 委员会模式：同上，只一匹马，成员由它照技能派生
  const committee = base.committeeMode ?? Boolean(input.committee);
  // 开场向导词三种模式各一份，按这一单的模式挑（跟界面走同一处判定）
  const initialKind = initialKindOf(race, committee);
  const placementPatch = {
    projectId: input.projectId,
    projectName: input.projectName,
    projectPath: input.projectPath,
    isolation: race ? "worktree" : input.isolation,
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
    (committee && input.committeeMembers !== undefined) ||
    hasPlacementPatch
  ) {
    const updated = handleUpdateTodo({
      id: base.id,
      patch: {
        ...(input.agents ? { agents: input.agents } : {}),
        ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
        ...(input.skills !== undefined ? { skills: input.skills } : {}),
        ...(input.extraPrompt !== undefined ? { extraPrompt: input.extraPrompt } : {}),
        // 委员会标记不在这里落库：只随成功收尾写（跟 raceMode 一致），
        // 启动失败的工作区失效/报错不能把模式段锁死。
        // 成员配置也只在委员会模式下写，普通待办不留空成员
        ...(committee && input.committeeMembers !== undefined
          ? { committeeMembers: input.committeeMembers }
          : {}),
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

  const members = (todo.committeeMembers ?? []).filter((m) => m.provider);
  if (committee) {
    if (refs.length !== 1) {
      return { ok: false, todo, error: "委员会只能一匹马" };
    }
    if (members.length !== 2) {
      return { ok: false, todo, error: "先给委员会指定两个成员（各选 Agent 和模型）" };
    }
    if ((todo.skills ?? []).length === 0) {
      return { ok: false, todo, error: "委员会模式要先选技能" };
    }
    // {{members}} 是两个成员唯一的通道：向导词里没有就明说，别让成员静默丢掉
    let committeeTpl = "";
    try {
      committeeTpl = readOrSeedTemplateRaw("initialCommittee");
    } catch {
      committeeTpl = "";
    }
    if (!committeeTpl.includes("{{members}}")) {
      return {
        ok: false,
        todo,
        error: "委员会开场向导词里缺 {{members}}，两个成员传不到技能，先加回去",
      };
    }
  }

  const title = todo.title.trim();
  // 技能就是界面技能框里选的那些，代码不替用户挑；开跑时只填进开场向导词的 {{Skills}} 空位，台词归向导词
  const skillList = todo.skills ?? [];
  // 委员会两个成员写在委员会开场向导词的 {{members}} 里；台词归向导词，代码不管
  const memberText = members
    .map((m) => (m.model ? `${m.provider} / ${m.model}` : `${m.provider} / 默认`))
    .join("、");
  const body = todo.prompt.trim()
    ? (title ? `${title}\n\n${todo.prompt.trim()}` : todo.prompt.trim())
    : title;
  const prompt = body;
  const now = new Date().toISOString();
  const multi = refs.length > 1;
  // 只派没跑过的马：老马（标过 spawnedAt）的会话和 worktree 都不动
  const freshPairs = refs
    .map((agent, index) => ({ agent, index }))
    .filter(({ agent }) => !agent.spawnedAt);
  const fresh = freshPairs.map((p) => p.agent);
  // 给这一批新马发号：只增不减，归档过马也不回收（分支名、评审编号都用它）
  let nextNo = todo.nextNo ?? 0;
  const nos = new Map<number, number>();
  for (const p of freshPairs) {
    nextNo += 1;
    nos.set(p.index, nextNo);
  }
  // 标题里的 #序号 用这匹马自己的号
  const noOf = (i: number) => nos.get(freshPairs[i].index) ?? freshPairs[i].index + 1;
  // 有没有马已经在分支上跑过（决定这条新分支要不要加序号）
  const hasBranch = (todo.agents ?? []).some((a) => a.branch);
  // 这一批开出来的会话和住处，按"它在名单里的位置"记下来，直接落到那匹马身上
  const sessions = new Map<number, { agentId?: string; terminalId?: string }>();
  const homes = new Map<
    number,
    { workspaceId?: string; branch?: string; dir?: string }
  >();
  const recordSession = (
    i: number,
    launched: { agentId?: string; terminalId?: string },
  ) => {
    sessions.set(freshPairs[i].index, launched);
  };
  const recordHome = (
    i: number,
    home: { workspaceId?: string; branch?: string; dir?: string },
  ) => {
    homes.set(freshPairs[i].index, home);
  };

  try {
    if (race && !multi) {
      return { ok: false, todo, error: "赛马至少 2 匹马" };
    }
    if (fresh.length === 0) {
      return { ok: false, todo, error: "没有新增的马，先加一匹再开跑" };
    }
    // 普通模式：主工作区就一个，有就继续用。赛马模式：主干（项目目录）复用，马各开 worktree
    let workspaceId = race ? undefined : todo.workspaceId;
    let workspaceName = race ? undefined : todo.workspaceName;
    let projectPath = todo.projectPath;
    let projectId = todo.projectId;
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
    if (race && !projectPath) {
      return { ok: false, todo, error: "赛马要先选项目（Worktree 需要仓库）" };
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
      // 这个工作区里已经住着的马记的是哪条分支，新来的照抄（同一单口径一致）
      const housemate = (todo.agents ?? []).find(
        (a) => a.workspaceId === ws.id && a.branch,
      );
      for (let i = 0; i < fresh.length; i++) {
        const launched = await launchAgentOrTerminal(
          paseo,
          ws,
          fresh[i],
          multi ? `${title} #${noOf(i)}` : title,
          formatInitialPrompt(prompt, ws.id, initialKind, memberText, skillList),
        );
        recordSession(i, launched);
        recordHome(i, {
          workspaceId: ws.id,
          branch: housemate?.branch,
          dir: housemate?.dir ?? todo.projectPath ?? todo.cwd ?? undefined,
        });
      }
      workspaceName = workspaceName ?? todo.workspaceName;
    } else if (projectPath) {
      const isWorktree = (todo.isolation ?? "local") === "worktree";
      const srcRepo = projectPath;

      if (race) {
        // 赛马：主干（项目目录）就是主工作区，复用已有的，没有才建；马各跑各的 worktree
        let mainId = todo.workspaceId;
        if (mainId && !(await workspaceIsActive(paseo, mainId))) {
          mainId = undefined;
        }
        if (!mainId) {
          const main = await paseo.workspaces.create({
            source: {
              kind: "directory",
              path: projectPath,
              ...(projectId ? { projectId } : {}),
            },
            title,
          });
          mainId = main.id;
          projectId = main.projectId ?? projectId;
          workspaceName = main.name ?? title;
        }
        workspaceId = mainId;
        workspaceName = workspaceName ?? todo.workspaceName;
        for (let i = 0; i < fresh.length; i++) {
          const branchName = todo.newBranch?.trim()
            ? `${branchFromTitle(todo.newBranch)}-a${noOf(i)}`
            : `${branchFromTitle(title)}-a${noOf(i)}`;
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
            title: multi ? `${title} #${noOf(i)}` : title,
          });
          const launched = await launchAgentOrTerminal(
            paseo,
            ws,
            fresh[i],
            multi ? `${title} #${noOf(i)}` : title,
            formatInitialPrompt(prompt, ws.id, initialKind, memberText, skillList),
          );
          recordSession(i, launched);
          // 这匹马住哪：它自己的分支工作区
          recordHome(i, {
            workspaceId: ws.id,
            branch: branchName,
            dir: ws.directory || undefined,
          });
        }
      } else {
        // 普通模式：只有这一个工作区（选 Worktree 就是那条 worktree，几匹马都挤在里面）
        // 第一条分支沿用原分支名，之后加马的分支带上自己的号（号只增不减，不撞名）
        const singleBranch = hasBranch
          ? `${branchFromTitle(todo.newBranch?.trim() || title)}-a${noOf(0)}`
          : todo.newBranch?.trim() || branchFromTitle(title);
        if (isWorktree) {
          wtRepo = srcRepo;
        }
        const source = isWorktree
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
        // 普通模式只有一个工作区，它本身就是主工作区
        workspaceId = ws.id;
        workspaceName = ws.name ?? title;
        projectId = ws.projectId ?? projectId;
        projectPath = ws.directory ?? projectPath;

        for (let i = 0; i < fresh.length; i++) {
          const launched = await launchAgentOrTerminal(
            paseo,
            ws,
            fresh[i],
            multi ? `${title} #${noOf(i)}` : title,
            formatInitialPrompt(prompt, ws.id, initialKind, memberText, skillList),
          );
          recordSession(i, launched);
          // 几匹马都住这一个工作区：选 Worktree 就是那条 worktree
          recordHome(i, {
            workspaceId: ws.id,
            branch: isWorktree ? singleBranch : undefined,
            dir: ws.directory || projectPath,
          });
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
        ? hasBranch
          ? `${branchFromTitle(todo.newBranch.trim())}-a${noOf(0)}`
          : todo.newBranch.trim()
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
      }
      for (let i = 0; i < fresh.length; i++) {
        const launched = await launchAgentOrTerminal(
          paseo,
          ws,
          fresh[i],
          multi ? `${title} #${noOf(i)}` : title,
          formatInitialPrompt(prompt, ws.id, initialKind, memberText, skillList),
        );
        recordSession(i, launched);
        recordHome(i, {
          workspaceId: ws.id,
          branch: source.kind === "worktree" ? cwdBranch : undefined,
          dir: ws.directory || todo.cwd,
        });
      }
    }

    // 名单只有一份：新马连自己的会话和住处一起落进去，谁结束都认（不分批次）
    const next: Todo = {
      ...todo,
      status: "running",
      raceMode: race,
      // 只在委员会这一单上留标记；普通 / 赛马成功启动不落 false 噪声
      ...(committee ? { committeeMode: true } : {}),
      // 这一批跑起来了：会话和住处记在那匹马自己身上，标上时间下次就知道是老马
      agents: refs.map((a, i) => {
        const launched = sessions.get(i);
        if (!launched) return a;
        return {
          ...a,
          no: nos.get(i),
          ...(launched.agentId ? { agentId: launched.agentId } : {}),
          ...(launched.terminalId ? { terminalId: launched.terminalId } : {}),
          ...homes.get(i),
          spawnedAt: now,
        };
      }),
      worktreeRepo: wtRepo,
      nextNo: nextNo || undefined,
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
    // 中途炸了：已经起来的马照标上（连会话和住处一起）；发号记录也要存，下次不许重发旧号
    const next: Todo = {
      ...todo,
      status: "failed",
      nextNo: nextNo || undefined,
      ...(sessions.size > 0
        ? {
            agents: refs.map((a, i) => {
              const launched = sessions.get(i);
              if (!launched) return a;
              return {
                ...a,
                no: nos.get(i),
                ...(launched.agentId ? { agentId: launched.agentId } : {}),
                ...(launched.terminalId ? { terminalId: launched.terminalId } : {}),
                ...homes.get(i),
                spawnedAt: now,
              };
            }),
          }
        : {}),
      error: message,
      finishedAt: new Date().toISOString(),
    };
    return { ok: false, todo: saveTodo(next), error: message };
  }
}

/** 这匹马跑崩了 / 被取消：只标失败，名单原样留着，它再跑起来自己会恢复。 */
export function completeByAgentId(
  agentId: string,
  outcome: "failed" | "canceled",
  errorMessage?: string,
): Todo | null {
  const todo = listTodos().find((t) => horseBySession(t.agents, agentId));
  if (!todo) return null;
  // 没跑起来的单子（未开始 / 已完成）不因一次报错翻车
  if (todo.status !== "running" && todo.status !== "failed") return null;
  return saveTodo({
    ...todo,
    status: "failed",
    finishedAt: new Date().toISOString(),
    error:
      errorMessage ||
      (outcome === "canceled" ? "会话已取消" : "agent turn failed"),
  });
}

/** 名单里的某个会话又开始跑了：上一次的失败作废，待办恢复进行中。 */
export function reviveByAgentId(agentId: string): Todo | null {
  const todo = listTodos().find(
    (t) => t.status === "failed" && horseBySession(t.agents, agentId),
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
 * workspace 归档时，只删掉该任务开跑时创建的分支（工作目录已由 Paseo 删）。
 * 归档即用户确认，未合并的改动会一并丢弃。任务本身一律不碰。
 */
export async function cleanupWorkspaceBranches(
  workspaceId: string,
): Promise<void> {
  for (const t of listTodos()) {
    const hit = (t.agents ?? []).filter((a) => a.workspaceId === workspaceId);
    if (hit.length === 0) continue;
    const repo = t.worktreeRepo;
    // 多匹马挤同一条分支时只删一次
    const branches = Array.from(
      new Set(hit.map((a) => a.branch).filter(Boolean) as string[]),
    );
    if (repo && branches.length > 0) {
      await deleteBranches(repo, branches);
    }
  }
}

/**
 * 人点完成：先关掉这个任务名下的所有工作区（Paseo 归档工作区会连带关掉
 * 里面的会话和终端），关完才标完成。关不掉的照样标完成，但要报回去。
 */
export async function handleFinishTodo(
  input: RpcInput<typeof finishTodoRpc>,
  { paseo }: PluginHandlerContext,
): Promise<{
  ok: boolean;
  todo: Todo | null;
  closed: number;
  failed: string[];
  error?: string;
}> {
  const todo = getTodo(input.id);
  if (!todo) {
    return { ok: false, todo: null, closed: 0, failed: [], error: "待办不存在" };
  }

  const ids = Array.from(
    new Set(
      [
        todo.workspaceId,
        ...(todo.agents ?? []).map((a) => a.workspaceId),
        todo.review?.workspaceId,
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  // 名字先抄一份，关掉之后 list 里就查不到了
  const names = new Map<string, string>();
  try {
    for (const w of (await paseo.workspaces.list()).entries ?? []) {
      names.set(w.id, w.title || w.name || w.id);
    }
  } catch {
    // 查不到名单就只用 id 报
  }

  let closed = 0;
  const failed: string[] = [];
  for (const id of ids) {
    // 名单查得到又不在名单里 = 已经归档过了，算关过了
    if (names.size > 0 && !names.has(id)) continue;
    try {
      await paseo.workspaces.ref(id).archive();
      closed += 1;
    } catch {
      failed.push(names.get(id) ?? id);
    }
  }

  const next = saveTodo({
    ...todo,
    status: "done",
    finishedAt: new Date().toISOString(),
    error: undefined,
  });
  return { ok: true, todo: next, closed, failed };
}

/**
 * 重置：把这单变回一个没跑过的待办。跑动痕迹全清（马名单、赛马模式、评审员、
 * 发号进度、这单用的仓库、主工作区、报错、起止时间），状态回未开始；建单时填的
 * 那份（标题、内容、项目、隔离、分支、技能、置顶、委员会成员）原样留着。
 * 这单名下还活着的工作区先关掉，关不掉的跳过。
 */
export async function handleResetTodo(
  input: RpcInput<typeof resetTodoRpc>,
  { paseo }: PluginHandlerContext,
): Promise<{
  ok: boolean;
  todo: Todo | null;
  closed: number;
  failed: string[];
  error?: string;
}> {
  const todo = getTodo(input.id);
  if (!todo) {
    return { ok: false, todo: null, closed: 0, failed: [], error: "待办不存在" };
  }

  const ids = Array.from(
    new Set(
      [
        todo.workspaceId,
        ...(todo.agents ?? []).map((a) => a.workspaceId),
        todo.review?.workspaceId,
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  // 名字先抄一份，关掉之后 list 里就查不到了
  const names = new Map<string, string>();
  try {
    for (const w of (await paseo.workspaces.list()).entries ?? []) {
      names.set(w.id, w.title || w.name || w.id);
    }
  } catch {
    // 查不到名单就只用 id 报
  }

  let closed = 0;
  const failed: string[] = [];
  for (const id of ids) {
    // 名单查得到又不在名单里 = 已经归档过了，算关过了
    if (names.size > 0 && !names.has(id)) continue;
    try {
      await paseo.workspaces.ref(id).archive();
      closed += 1;
    } catch {
      failed.push(names.get(id) ?? id);
    }
  }

  // worktree 模式跑过之后 projectPath 会被改成那条 worktree 的目录，重置要还原成仓库
  const projectPath =
    todo.projectPath && todo.isolation === "worktree"
      ? todo.worktreeRepo ?? todo.projectPath
      : todo.projectPath;

  const next = saveTodo({
    ...todo,
    status: "pending",
    agents: [{ provider: "", model: "" }],
    projectPath,
    raceMode: undefined,
    review: undefined,
    autoReview: undefined,
    nextNo: undefined,
    worktreeRepo: undefined,
    workspaceId: undefined,
    workspaceName: undefined,
    error: undefined,
    startedAt: undefined,
    finishedAt: undefined,
  });
  return { ok: true, todo: next, closed, failed };
}
