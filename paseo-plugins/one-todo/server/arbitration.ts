import { execFile } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  arbitrationDirsRpc,
  arbitrationSendRpc,
  arbitrationStartRpc,
  arbitrationVerdictRpc,
  branchFromTitle,
  type AgentRef,
  type Todo,
} from "../shared/todo";
import { getTodo, listTodos, saveTodo } from "./store";
import { isAgy, launchAgentOrTerminal, todoAgents } from "./executor";
import { deleteBranches } from "./worktree";

const execFileAsync = promisify(execFile);

const VERDICT_DIR = join(homedir(), ".paseo", "plugin-data", "one-todo", "arbitrations");

function verdictPath(todoId: string): string {
  return join(VERDICT_DIR, `${todoId}.md`);
}

export type ArbKind = "arbitrate" | "review";

/** 结论首行：仲裁「胜者: <编号>」，审核「结论: 通过/不通过」（允许 # 标题前缀）。 */
function isValidVerdict(text: string, kind: ArbKind): boolean {
  const first = text.split("\n", 1)[0] ?? "";
  return kind === "review"
    ? /^\s*(?:#\s*)?结论\s*[:：]\s*(通过|不通过)/.test(first)
    : /^\s*(?:#\s*)?胜者\s*[:：]\s*\d/.test(first);
}

function readVerdictFile(
  todoId: string,
  kind: ArbKind,
): { text?: string; valid: boolean } {
  try {
    const file = verdictPath(todoId);
    if (!existsSync(file)) return { valid: false };
    const text = readFileSync(file, "utf8");
    return { text, valid: isValidVerdict(text, kind) };
  } catch {
    return { valid: false };
  }
}

export type Candidate = {
  workspaceId: string;
  branch: string;
  dir?: string;
  exists: boolean;
  label: string;
};

async function gitWorktreeDirs(repo: string): Promise<Map<string, string> | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", repo, "worktree", "list", "--porcelain"],
      { timeout: 15_000, maxBuffer: 1024 * 1024 },
    );
    const map = new Map<string, string>();
    let dir = "";
    for (const line of stdout.split("\n")) {
      if (line.startsWith("worktree ")) dir = line.slice("worktree ".length);
      else if (line.startsWith("branch refs/heads/") && dir) {
        map.set(line.slice("branch refs/heads/".length), dir);
      }
    }
    return map;
  } catch {
    // 非 git 仓库或 git 失败：返回 null 让上层走目录兜底
    return null;
  }
}

/**
 * 找赛马候选目录（插件的琐事）：
 * git worktree list 按分支（权威） → worktrees[].dir → workspace 目录。
 * 分支已不在 git worktree 列表里（worktree 被删/归档）即视为失效。
 */
async function resolveCandidates(
  todo: Todo,
  paseo: PluginHandlerContext["paseo"],
): Promise<Candidate[]> {
  const worktrees = todo.worktrees ?? [];
  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  const gitDirs = repo ? await gitWorktreeDirs(repo) : null;

  let wsDirs = new Map<string, string>();
  if (gitDirs === null && worktrees.some((w) => !w.dir)) {
    try {
      const res = await paseo.workspaces.list();
      for (const w of res.entries ?? []) {
        // 只信 workspaceDirectory；projectRootPath 是项目根不是 worktree 目录
        if (w.workspaceDirectory) wsDirs.set(w.id, w.workspaceDirectory);
      }
    } catch {
      // workspace 列表拿不到就只靠存的 dir
    }
  }

  const agents = (todo.agents ?? []).filter((a) => a.provider);
  return worktrees.map((w, i) => {
    const gdir = gitDirs?.get(w.branch);
    const dir = gdir ?? w.dir ?? wsDirs.get(w.workspaceId);
    const exists =
      gitDirs !== null
        ? Boolean(gdir && existsSync(gdir))
        : Boolean(dir && existsSync(dir));
    const agent = agents[i];
    return {
      workspaceId: w.workspaceId,
      branch: w.branch,
      dir,
      exists,
      label:
        worktrees.length === agents.length && agent
          ? `${i + 1}# ${agent.provider}${agent.model ? ` / ${agent.model}` : ""}`
          : `${i + 1}# ${w.branch}`,
    };
  });
}

export async function handleArbitrationDirs(
  input: RpcInput<typeof arbitrationDirsRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof arbitrationDirsRpc>> {
  const todo = getTodo(input.id);
  if (!todo) return { candidates: [], error: "待办不存在" };
  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  const baseBranch = todo.baseBranch?.trim() || "main";
  const candidates = await resolveCandidates(todo, paseo);
  let reviewDir: string | undefined;
  if (!candidates.some((c) => c.exists)) {
    reviewDir = await resolveReviewDir(todo, paseo, candidates);
  }
  if (candidates.length === 0 && !reviewDir) {
    return { candidates: [], error: "该待办没有可审核的目录" };
  }
  return { repo, baseBranch, candidates, reviewDir };
}

/**
 * 审核目标目录（单马/本地直跑没有可用候选时）：
 * 单个活 worktree → projectPath → cwd → workspace 查表。
 */
async function resolveReviewDir(
  todo: Todo,
  paseo: PluginHandlerContext["paseo"],
  candidates: Candidate[],
): Promise<string | undefined> {
  const live = candidates.find((c) => c.exists && c.dir);
  if (live?.dir) return live.dir;
  if (todo.projectPath) return todo.projectPath;
  if (todo.cwd) return todo.cwd;
  if (todo.workspaceId) {
    try {
      const res = await paseo.workspaces.list();
      const hit = (res.entries ?? []).find((w) => w.id === todo.workspaceId);
      if (hit?.workspaceDirectory) return hit.workspaceDirectory;
    } catch {
      // 查不到就算了
    }
  }
  return undefined;
}

function buildPrompt(
  criteria: string,
  candidates: Candidate[],
  repo: string,
  base: string,
  todoId: string,
  taskTitle: string,
  taskPrompt: string,
): string {
  const list = candidates
    .map((c) => `${c.label} — 分支 ${c.branch} — 目录 ${c.dir}`)
    .join("\n");
  const file = verdictPath(todoId);
  return `任务（需求原文，以此为准）：
标题：《${taskTitle}》
内容：
${taskPrompt || "（无）"}

判定标准：
${criteria}

你是仲裁者。同一需求由多匹马分别在不同 worktree 独立完成（很可能都改了同一处），请判定哪份实现更好。

候选：
${list}

硬规则：
1. 对候选目录只读：禁止修改/删除其中任何文件，禁止在候选目录内 commit/checkout/stash/checkout-index；只允许读文件和只读 git 命令（status/diff/log/show）。
2. 候选改动可能未提交：先 git -C <候选目录> status，再 git -C <候选目录> diff（含未提交改动），并可与基线分支 ${base} 对比。
3. 需要跑测试/构建等可能产生写操作时，先导出候选改动为 patch，在你自己的工作目录 apply 后再跑，绝不弄脏候选目录。
4. 先按任务需求判断各候选是否做对（多做/少做/做偏都扣分），再按判定标准逐条评估，横向对比。
5. 结论必须写入文件 ${file}（目录不存在先 mkdir -p），Markdown，分四节：第一行「胜者: <候选编号>」；一、逐候选审核（每个候选是否满足需求、评分与理由）；二、综合报告（把各候选的优点集中起来）；三、修改建议（在胜者那一份上继续改、具体怎么改）。
6. 结论文件写完后，在回复里给一句话总结。`;
}

function buildReviewPrompt(
  criteria: string,
  target: Candidate,
  base: string,
  todoId: string,
  taskTitle: string,
  taskPrompt: string,
): string {
  const file = verdictPath(todoId);
  return `任务（需求原文，以此为准）：
标题：《${taskTitle}》
内容：
${taskPrompt || "（无）"}

判定标准：
${criteria}

你是检察官。对下面这份实现做一次审核。

审核目标：
${target.label} — 分支 ${target.branch} — 目录 ${target.dir}

硬规则：
1. 对审核目标只读：禁止修改/删除其中任何文件，禁止在目标目录内 commit/checkout/stash/checkout-index；只允许读文件和只读 git 命令（status/diff/log/show）。
2. 改动可能未提交：先 git -C <目标目录> status，再 git -C <目标目录> diff（含未提交改动），并可与基线分支 ${base} 对比。
3. 需要跑测试/构建等可能产生写操作时，先导出改动为 patch，在你自己的工作目录 apply 后再跑，绝不弄脏目标目录。
4. 按任务需求逐项核对实现（多做/少做/做偏都要指出），再按判定标准评估，并评估代码质量与风险。
5. 结论必须写入文件 ${file}（目录不存在先 mkdir -p），Markdown：第一行「结论: 通过」或「结论: 不通过」，随后问题清单（分阻塞/建议两级）、理由与关键差异。
6. 结论文件写完后，在回复里给一句话总结。`;
}

export async function handleArbitrationStart(
  input: RpcInput<typeof arbitrationStartRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof arbitrationStartRpc>> {
  const todo = getTodo(input.id);
  if (!todo) return { ok: false, todo: null, error: "待办不存在" };
  if (todo.arbitration?.status === "running") {
    return {
      ok: false,
      todo,
      error: input.kind === "review" ? "审核进行中" : "仲裁进行中",
    };
  }
  const kind: ArbKind = input.kind;

  const candidates = await resolveCandidates(todo, paseo);
  const live = candidates.filter((c) => c.exists);
  if (kind === "arbitrate" && live.length < 2) {
    return {
      ok: false,
      todo,
      error: `可仲裁的 worktree 不足 2 个（找到 ${live.length} 个），可能已被归档`,
    };
  }
  let targets = live;
  if (kind === "review" && live.length === 0) {
    const reviewDir = await resolveReviewDir(todo, paseo, candidates);
    if (!reviewDir) {
      return { ok: false, todo, error: "找不到可审核的目录" };
    }
    targets = [
      {
        workspaceId: "",
        branch: todo.baseBranch?.trim() || "main",
        dir: reviewDir,
        exists: true,
        label: "本地目录",
      },
    ];
  }
  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  if (!repo) return { ok: false, todo, error: "找不到仓库路径" };

  const now = new Date().toISOString();
  // 时间戳后缀：重复开庭不撞旧分支；slug 由我们拼，避开 branchFromTitle 截 20 字丢 -judge
  const stamp = Date.now().toString(36);
  const branchName = `${branchFromTitle(todo.title)}-judge-${stamp}`;
  const worktreeSlug = `${branchFromTitle(todo.title).slice(0, 16)}-judge-${stamp}`.replace(
    /^[-.]+|[-.]+$/g,
    "",
  );
  const title = kind === "review" ? `🔍 审核《${todo.title}》` : `⚖ 仲裁《${todo.title}》`;
  let workspaceId: string;
  try {
    const ws = await paseo.workspaces.create({
      source: {
        kind: "worktree",
        cwd: repo,
        ...(todo.projectId ? { projectId: todo.projectId } : {}),
        action: "branch-off",
        baseBranch: todo.baseBranch?.trim() || "main",
        branchName,
        worktreeSlug,
      },
      title,
    });
    workspaceId = ws.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, todo, error: `创建仲裁工作区失败: ${message}` };
  }

  const prompt =
    kind === "review"
      ? buildReviewPrompt(
          input.prompt.trim(),
          targets[0],
          todo.baseBranch?.trim() || "main",
          todo.id,
          todo.title,
          todo.prompt ?? "",
        )
      : buildPrompt(
          input.prompt.trim(),
          targets,
          repo,
          todo.baseBranch?.trim() || "main",
          todo.id,
          todo.title,
          todo.prompt ?? "",
        );
  rmSync(verdictPath(todo.id), { force: true });

  try {
    const launched = await launchAgentOrTerminal(
      paseo,
      paseo.workspaces.ref(workspaceId),
      input.judge,
      title,
      prompt,
    );
    const next: Todo = {
      ...todo,
      arbitration: {
        kind,
        prompt: input.prompt.trim(),
        judge: input.judge as AgentRef,
        agentId: launched.agentId,
        terminalId: launched.terminalId,
        workspaceId,
        branch: branchName,
        status: "running",
        startedAt: now,
      },
    };
    return { ok: true, todo: saveTodo(next) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const next: Todo = {
      ...todo,
      arbitration: {
        kind,
        prompt: input.prompt.trim(),
        judge: input.judge as AgentRef,
        workspaceId,
        branch: branchName,
        status: "failed",
        error: message,
        startedAt: now,
        finishedAt: new Date().toISOString(),
      },
    };
    return { ok: false, todo: saveTodo(next), error: message };
  }
}

export async function handleArbitrationVerdict(
  input: RpcInput<typeof arbitrationVerdictRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof arbitrationVerdictRpc>> {
  const todo = getTodo(input.id);
  const arb = todo?.arbitration;
  const kind: ArbKind = arb?.kind ?? "arbitrate";
  const needFirstLine = kind === "review" ? "「结论:」" : "「胜者:」";
  if (todo && arb?.status === "running") {
    const file = readVerdictFile(todo.id, kind);
    if (file.valid && file.text) {
      saveTodo({
        ...todo,
        arbitration: {
          ...arb,
          status: "done",
          error: undefined,
          finishedAt: new Date().toISOString(),
        },
      });
      return { verdict: file.text };
    }
    // agy 终端判官没有 turn_ended：终端没了 + 没有效结论 = 判官失败
    if (arb.terminalId && arb.workspaceId) {
      let terminalAlive = true;
      let checkFails = arb.terminalCheckFails ?? 0;
      try {
        const list = await paseo.terminals.list({ workspaceId: arb.workspaceId });
        terminalAlive = (list.entries ?? []).some((t) => t.id === arb.terminalId);
        checkFails = 0;
      } catch {
        //  daemon 抖动：记次，连续 3 次查不到才判失败，避免误杀
        checkFails += 1;
      }
      if (!terminalAlive || checkFails >= 3) {
        saveTodo({
          ...todo,
          arbitration: {
            ...arb,
            status: "failed",
            error: terminalAlive
              ? "判官终端状态连续查不到，请检查 Paseo 连接后重开"
              : `判官会话已结束，但未写出有效结论（缺${needFirstLine}首行）`,
            finishedAt: new Date().toISOString(),
          },
        });
        return { error: "判官会话已结束，但未写出有效结论" };
      }
      if (checkFails !== (arb.terminalCheckFails ?? 0)) {
        saveTodo({
          ...todo,
          arbitration: { ...arb, terminalCheckFails: checkFails },
        });
      }
      return {};
    }
    return {};
  }
  if (!todo) return {};
  try {
    return { verdict: readFileSync(verdictPath(todo.id), "utf8") };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** 把结论意见发给干活的会话：审核发给那一匹，仲裁发给胜者那一匹。 */
export async function handleArbitrationSend(
  input: RpcInput<typeof arbitrationSendRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof arbitrationSendRpc>> {
  const todo = getTodo(input.id);
  const arb = todo?.arbitration;
  if (!todo || !arb) return { ok: false, error: "没有仲裁记录" };
  if (arb.status === "running") return { ok: false, error: "判官还没写完" };
  const kind: ArbKind = arb.kind ?? "arbitrate";
  const file = readVerdictFile(todo.id, kind);
  if (!file.valid || !file.text) return { ok: false, error: "还没有有效结论，发不了" };

  // 定目标马：仲裁从「胜者: N」取下标，审核取唯一的活候选（无 worktree 时取第一匹）
  const refs = todoAgents(todo);
  const worktrees = todo.worktrees ?? [];
  let refIdx = 0;
  if (kind === "arbitrate") {
    const m = /^\s*(?:#\s*)?胜者\s*[:：]\s*(\d+)/.exec(
      file.text.split("\n", 1)[0] ?? "",
    );
    const n = m ? parseInt(m[1], 10) : NaN;
    if (!n || n < 1 || n > worktrees.length) {
      return { ok: false, error: "结论里找不到胜者编号" };
    }
    refIdx = n - 1;
  } else if (worktrees.length > 0) {
    const candidates = await resolveCandidates(todo, paseo);
    const liveIdx = candidates.findIndex((c) => c.exists);
    refIdx =
      liveIdx >= 0 && worktrees.length === refs.length ? liveIdx : 0;
  }
  // worktrees[i] ↔ refs[i]；agy 走终端、其余走 agent，按出现顺序对号
  let agentId: string | undefined;
  let terminalId: string | undefined;
  {
    let a = 0;
    let t = 0;
    for (let k = 0; k < refs.length; k++) {
      if (isAgy(refs[k].provider)) {
        if (k === refIdx) terminalId = todo.terminalIds?.[t];
        t++;
      } else {
        if (k === refIdx) agentId = todo.agentIds?.[a];
        a++;
      }
    }
  }
  if (!agentId && !terminalId) {
    return { ok: false, error: "目标会话找不到了（可能已归档）" };
  }

  const role = kind === "review" ? "检察官" : "判官";
  const text = `【${role}意见】请据此继续修改，改完我会再审：\n\n${file.text}`;
  try {
    if (agentId) {
      await paseo.agents.ref(agentId).send(text);
      return { ok: true, target: `会话 ${agentId.slice(0, 8)}` };
    }
    const term = paseo.terminals.ref(terminalId!);
    term.write(text);
    term.sendKeys(["Enter"]);
    return { ok: true, target: `终端 ${terminalId!.slice(0, 8)}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `发送失败: ${message}` };
  }
}

/** 判官 turn 结束：只翻仲裁状态，不动待办本身。返回是否命中判官。 */
export function completeArbitration(
  agentId: string,
  outcome: "completed" | "failed" | "canceled",
  errorMessage?: string,
): boolean {
  for (const t of listTodos()) {
    const arb = t.arbitration;
    if (!arb || arb.status !== "running" || arb.agentId !== agentId) continue;
    let error: string | undefined;
    let finalStatus: "done" | "failed" = "done";
    if (outcome !== "completed") {
      finalStatus = "failed";
      error =
        errorMessage ||
        (outcome === "canceled" ? "判官会话已取消" : "判官 turn failed");
    } else {
      // 完成也必须有有效结论，否则算失败
      const kind: ArbKind = arb.kind ?? "arbitrate";
      const file = readVerdictFile(t.id, kind);
      if (!file.valid) {
        finalStatus = "failed";
        error =
          kind === "review"
            ? "判官结束了，但未写出有效结论（缺「结论: 通过/不通过」首行）"
            : "判官结束了，但未写出有效结论（缺「胜者: <候选>」首行）";
      }
    }
    saveTodo({
      ...t,
      arbitration: {
        ...arb,
        status: finalStatus,
        error,
        finishedAt: new Date().toISOString(),
      },
    });
    return true;
  }
  return false;
}

/** 仲裁工作区归档：标失败（若还在跑）并删掉判官分支（目录由 Paseo 清）。 */
export async function cleanupArbitrationBranch(
  workspaceId: string,
): Promise<void> {
  for (const t of listTodos()) {
    const arb = t.arbitration;
    if (!arb || arb.workspaceId !== workspaceId || !arb.branch) continue;
    if (arb.status === "running") {
      saveTodo({
        ...t,
        arbitration: {
          ...arb,
          status: "failed",
          error: "判官工作区已归档",
          finishedAt: new Date().toISOString(),
        },
      });
    }
    const repo = t.worktreeRepo || t.projectPath || t.cwd;
    if (repo) await deleteBranches(repo, [arb.branch]);
  }
}
