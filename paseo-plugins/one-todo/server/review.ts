import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  reviewDirsRpc,
  reviewAbortRpc,
  reviewContinueRpc,
  reviewSendRpc,
  reviewStartRpc,
  reviewVerdictRpc,
  branchFromTitle,
  reviewTemplateRpc,
  type AgentRef,
  type Todo,
} from "../shared/todo";
import { getTodo, listTodos, saveTodo } from "./store";
import { launchAgentOrTerminal, todoAgents } from "./executor";
import { primaryAgent } from "../shared/todo";
import { readTaskDoc } from "./taskdoc";

const execFileAsync = promisify(execFile);

// 评审结果只是缓存：放系统临时目录，系统自己回收，不进仓库也不进插件数据区
const VERDICT_DIR = join(tmpdir(), "one-todo", "reviews");

// 评审结果文件名：待办标题 + 评审。只有这一种命名，没有别的路
function verdictFileName(title: string): string {
  return `${branchFromTitle(title) || "待办"}-评审.md`;
}

function verdictPath(title: string, verdictFile?: string): string {
  const name = verdictFile ?? verdictFileName(title);
  const newPath = join(VERDICT_DIR, name);
  if (!existsSync(newPath)) {
    const oldPath = join(tmpdir(), "one-todo", "arbitrations", name);
    if (existsSync(oldPath)) return oldPath;
  }
  return newPath;
}

export type ReviewKind = "multi" | "single";

/** 结果首行：多匹马「胜者: <编号>」，一匹马「结论: 通过/不通过」（允许 # 标题前缀）。 */
function isValidVerdict(text: string, kind: ReviewKind): boolean {
  const first = text.split("\n", 1)[0] ?? "";
  return kind === "single"
    ? /^\s*(?:#\s*)?结论\s*[:：]\s*(通过|不通过)/.test(first)
    : /^\s*(?:#\s*)?胜者\s*[:：]\s*\d/.test(first);
}

function readVerdictFile(
  title: string,
  kind: ReviewKind,
  verdictFile?: string,
): { text?: string; valid: boolean } {
  try {
    const file = verdictPath(title, verdictFile);
    if (!existsSync(file)) return { valid: false };
    const text = readFileSync(file, "utf8");
    return { text, valid: isValidVerdict(text, kind) };
  } catch {
    return { valid: false };
  }
}

/** 结论文件多久没再动过（毫秒）。拿不到就当不动。 */
function verdictAgeMs(title: string, verdictFile?: string): number | undefined {
  try {
    return Date.now() - statSync(verdictPath(title, verdictFile)).mtimeMs;
  } catch {
    return undefined;
  }
}

export type Candidate = {
  workspaceId: string;
  branch: string;
  dir?: string;
  exists: boolean;
  label: string;
  // 这匹马写的需求清单内容（弹层「文档」按钮用）
  taskDoc?: string;
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

  const wsDirs = new Map<string, string>();
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

  // 名单是累积的（可以反复发起），不再拿它和本轮马匹数量做对号
  return worktrees.map((w, i) => {
    const gdir = gitDirs?.get(w.branch);
    const dir = gdir ?? w.dir ?? wsDirs.get(w.workspaceId);
    const exists =
      gitDirs !== null
        ? Boolean(gdir && existsSync(gdir))
        : Boolean(dir && existsSync(dir));
    return {
      workspaceId: w.workspaceId,
      branch: w.branch,
      dir,
      exists,
      label: `${i + 1}# ${w.model ? `${w.provider ?? ""} / ${w.model}` : w.provider || w.branch}`,
      taskDoc: readTaskDoc(w.workspaceId),
    };
  });
}

export async function handleReviewDirs(
  input: RpcInput<typeof reviewDirsRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof reviewDirsRpc>> {
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
    return { candidates: [], error: "该待办没有可评审的目录" };
  }
  return {
    repo,
    baseBranch,
    candidates,
    reviewDir,
    reviewTaskDoc: readTaskDoc(
      todo.workspaceId ?? todo.projectPath ?? todo.cwd,
    ),
  };
}

/**
 * 评审目标目录（一匹马/本地直跑没有可用候选时）：
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

// 提示词是插件资产，住在插件目录的 prompts/ 里，随仓库走（换机器也在）
// 插件运行时不提供 import.meta.url，就从 paseo 配置里认自己的目录（加载时先不算，避免加载失败）
const PLUGIN_ID = "one-todo";
const TEMPLATE_NAME = {
  multi: "评审-多马.md",
  single: "评审-单马.md",
  send: "发送提示词.md",
} as const;
export type TplKind = keyof typeof TEMPLATE_NAME;

let promptDirCache: string | undefined;

function promptDir(): string {
  if (promptDirCache) return promptDirCache;
  const tried: string[] = [];
  const metaUrl = (import.meta as { url?: string }).url;
  if (metaUrl) {
    const p = join(dirname(fileURLToPath(metaUrl)), "..", "prompts");
    tried.push(p);
    if (existsSync(p)) return (promptDirCache = p);
  }
  try {
    const cfg = JSON.parse(
      readFileSync(join(homedir(), ".paseo", "config.json"), "utf8"),
    ) as { plugins?: Record<string, { path?: string }> };
    const p = cfg.plugins?.[PLUGIN_ID]?.path;
    if (p) {
      const dir = join(p, "prompts");
      tried.push(dir);
      if (existsSync(dir)) return (promptDirCache = dir);
    }
  } catch {
    // 配置读不到就往下报错
  }
  throw new Error(`找不到插件提示词目录，找过：${tried.join(" / ")}`);
}

function templatePath(kind: TplKind): string {
  return join(promptDir(), TEMPLATE_NAME[kind]);
}

const DEFAULT_MULTI = `你是评审员。同一需求由多匹马在不同 worktree 独立完成：评审出最好的一份，把各家的好处揉成建议，指定一匹接着改到最好。

需求：
{{task}}

候选：
{{targets}}

规则：
1. 候选只读：只能看和用只读 git 命令，禁止任何改动。
2. 需求里写了起点提交 ID 的，本轮改动 = 从那次提交之后的一切（含未提交）；没写起点的，先看 status 再看 diff：没提交的都算本轮，已提交的看提交时间和提交信息判断哪些属于本轮，必要时和基线 {{base}} 比。
3. 要跑测试先导出 patch 到自己目录再跑。
4. 先按需求判对错，再按标准横向比。
5. 结果写入 {{verdictFile}}：首行「胜者: <编号>」，下面每匹马两三句点评+一句改进建议。写完把结果全文贴在回复里，全部控制在十五行以内。`;

const DEFAULT_SINGLE = `你是评审员。评审下面这份实现，指出问题并给出改进建议。

需求：
{{task}}

目标：
{{targets}}

规则：
1. 目标只读：只能看和用只读 git 命令，禁止任何改动。
2. 需求里写了起点提交 ID 的，本轮改动 = 从那次提交之后的一切（含未提交）；没写起点的，先看 status 再看 diff：没提交的都算本轮，已提交的看提交时间和提交信息判断哪些属于本轮，必要时和基线 {{base}} 比。
3. 要跑测试先导出 patch 到自己目录再跑。
4. 按需求逐项核对，再按标准看质量与风险。
5. 结果写入 {{verdictFile}}：首行「结论: 通过」或「结论: 不通过」，下面只列问题（标阻塞/建议）和一句话理由。写完把结果全文贴在回复里，全部控制在十五行以内。`;

const DEFAULT_SEND =
  "【评审反馈与整改建议】以下为审阅结论。请评估可行性并排查技术风险，涉及架构与关键逻辑变更须经确认后推进，依此落实修正。";

const DEFAULT_TPL = {
  multi: DEFAULT_MULTI,
  single: DEFAULT_SINGLE,
  send: DEFAULT_SEND,
} as const;

function readOrSeedTemplateRaw(kind: TplKind): string {
  const path = templatePath(kind);
  try {
    return readFileSync(path, "utf8");
  } catch {
    const raw = DEFAULT_TPL[kind];
    try {
      mkdirSync(promptDir(), { recursive: true });
      writeFileSync(path, raw, "utf8");
    } catch {
      // 建不出来就内存里用默认的，不影响使用
    }
    return raw;
  }
}

function checkTemplate(kind: TplKind, part: string): string | undefined {
  const name =
    kind === "multi" ? "多匹马评审" : kind === "single" ? "一匹马评审" : "发送提示词";
  if (!part.trim()) return `${name}不能为空`;
  if (kind === "send") return undefined;
  if (!part.includes("{{task}}")) return `${name}模板缺少 {{task}} 空位`;
  if (!part.includes("{{targets}}")) return `${name}模板缺少 {{targets}} 空位`;
  if (!part.includes("{{verdictFile}}")) {
    return `${name}模板缺少 {{verdictFile}} 空位`;
  }
  return undefined;
}

function loadReviewTemplate(kind: TplKind): string {
  const raw = readOrSeedTemplateRaw(kind);
  const bad = checkTemplate(kind, raw);
  if (bad) throw new Error(bad);
  return raw.trim();
}

export function handleReviewTemplate(
  input: RpcInput<typeof reviewTemplateRpc>,
): RpcOutput<typeof reviewTemplateRpc> {
  const kind: TplKind = input.kind;
  if (input.text === undefined) {
    try {
      return { text: readOrSeedTemplateRaw(kind) };
    } catch {
      return { error: "模板找不到了，请重试" };
    }
  }
  const text = input.text;
  if (!text.trim()) return { error: "模板不能为空" };
  const bad = checkTemplate(kind, text);
  if (bad) return { error: bad };
  try {
    writeFileSync(templatePath(kind), text, "utf8");
    return { text };
  } catch {
    return { error: "保存失败，请重试" };
  }
}

/** 发消息给某个会话：走 paseo CLI（agent 用 send，终端用 send-keys）。发不出去就报错。 */
async function sendToSession(
  agentId: string | undefined,
  terminalId: string | undefined,
  text: string,
): Promise<void> {
  if (agentId) {
    const dir = join(tmpdir(), "one-todo");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `send-${Date.now().toString(36)}.txt`);
    writeFileSync(file, text, "utf8");
    try {
      await execFileAsync("paseo", [
        "send",
        agentId,
        "--prompt-file",
        file,
        "--no-wait",
      ]);
    } finally {
      rmSync(file, { force: true });
    }
    return;
  }
  if (!terminalId) throw new Error("不知道发给谁");
  // 终端里换行常被当提交，压成一行只发一次
  await execFileAsync("paseo", [
    "terminal",
    "send-keys",
    terminalId,
    "-l",
    text.replace(/\s*\n\s*/g, " ").trim(),
  ]);
  await execFileAsync("paseo", ["terminal", "send-keys", terminalId, "Enter"]);
}

/** 评审员会话还在跑吗（走 CLI 名单）。查不到就当它不在跑了。 */
async function agentStillRunning(agentId: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("paseo", ["ls", "--json"]);
    const list = JSON.parse(stdout) as Array<{ id?: string; status?: string }>;
    return list.some((a) => a.id === agentId && a.status === "running");
  } catch {
    return false;
  }
}

function sendPromptText(): string {
  try {
    return readFileSync(templatePath("send"), "utf8").trim() || DEFAULT_SEND;
  } catch {
    return DEFAULT_SEND;
  }
}

/** 挑这轮评审要看的候选：多匹马给全部活着的；一匹马给指定的那匹（没指定给第一匹活着的）；都没有就用本地目录。 */
async function pickTargets(
  todo: Todo,
  paseo: PluginHandlerContext["paseo"],
  kind: ReviewKind,
  targetIndex?: number,
): Promise<{ targets: Candidate[]; error?: string }> {
  const candidates = await resolveCandidates(todo, paseo);
  const live = candidates.filter((c) => c.exists);
  if (kind === "multi") {
    if (live.length < 2) {
      return {
        targets: [],
        error: `可评审的 worktree 不足 2 个（找到 ${live.length} 个），可能已被归档`,
      };
    }
    return { targets: live };
  }
  if (targetIndex !== undefined) {
    const t = candidates[targetIndex];
    if (!t || !t.exists) {
      return { targets: [], error: "选中的那匹马目录已失效" };
    }
    return { targets: [t] };
  }
  if (live.length > 0) return { targets: [live[0]] };
  // 没有 worktree（主干 / 本地直跑）：就评项目目录本身
  const dir = await resolveReviewDir(todo, paseo, candidates);
  if (!dir) return { targets: [], error: "找不到可评审的目录" };
  return {
    targets: [
      {
        workspaceId: "",
        branch: todo.baseBranch?.trim() || "main",
        dir,
        exists: true,
        label: "本地目录",
      },
    ],
  };
}

/** 组装给评审员的那段话——新起会话和接着聊用的是同一段。 */
function assembleReviewPrompt(
  todo: Todo,
  kind: ReviewKind,
  task: string,
  targets: Candidate[],
): { prompt: string; verdictName: string } {
  const tpl = loadReviewTemplate(kind === "single" ? "single" : "multi");
  const list = targets
    .map((c) => `${c.label} — 分支 ${c.branch} — 目录 ${c.dir}`)
    .join("\n");
  const verdictName = verdictFileName(todo.title);
  const prompt = fillTemplate(tpl, {
    task,
    targets: list,
    base: todo.baseBranch?.trim() || "main",
    verdictFile: verdictPath(todo.title, verdictName),
  });
  return { prompt, verdictName };
}


/** ===== 自动评审：开着就替用户点「评审」和「发给它」，按规则停 ===== */

function verdictFirstLine(text: string): string {
  return (text.split("\n", 1)[0] ?? "").trim();
}

/** 首行之后还有没有正文（建议/问题清单） */
function verdictHasBody(text: string): boolean {
  return text.split("\n").slice(1).join("\n").trim().length > 0;
}

function verdictPassed(text: string): boolean {
  return /^#?\s*结论\s*[:：]\s*通过/.test(verdictFirstLine(text));
}

function stopAuto(todo: Todo, note: string): Todo {
  const auto = todo.autoReview;
  if (!auto) return todo;
  return saveTodo({
    ...todo,
    autoReview: { ...auto, maxRounds: 0, note },
  });
}

function noteAuto(todo: Todo, note: string, patch?: Partial<Todo["autoReview"]>): Todo {
  const auto = todo.autoReview;
  if (!auto) return todo;
  return saveTodo({ ...todo, autoReview: { ...auto, note, ...patch } });
}

/** 自动开着吗：轮数 0 = 关着，-1 = 不限，>0 = 有上限 */
function autoOn(todo: Todo): boolean {
  return (todo.autoReview?.maxRounds ?? 0) !== 0;
}

function autoRoundsLeft(todo: Todo): boolean {
  const auto = todo.autoReview;
  if (!auto) return false;
  return auto.maxRounds < 0 || auto.roundsUsed < auto.maxRounds;
}

function defaultReviewer(todo: Todo): AgentRef {
  const chosen = todo.review?.reviewer;
  if (chosen?.provider) return chosen;
  return primaryAgent(todoAgents(todo));
}

/** 马跑完了：开着自动就替用户发起评审（需求取目标马的需求清单）。 */
export async function autoStartReview(
  todoId: string,
  paseo: PluginHandlerContext["paseo"],
): Promise<void> {
  const todo = getTodo(todoId);
  const auto = todo?.autoReview;
  if (!todo || !auto || !autoOn(todo)) return;
  if (auto.phase === "reviewing") return;
  if (todo.status !== "done") return;
  if (todo.review?.status === "running") return;
  if (!autoRoundsLeft(todo)) {
    stopAuto(todo, `已自动跑满 ${auto.roundsUsed} 轮，停了`);
    return;
  }
  const candidates = await resolveCandidates(todo, paseo);
  const live = candidates.filter((c) => c.exists);
  const kind: ReviewKind = live.length >= 2 ? "multi" : "single";
  const docKey =
    (kind === "single" && todo.review?.targetIndex !== undefined
      ? candidates[todo.review.targetIndex]?.workspaceId
      : live[0]?.workspaceId) ?? todo.workspaceId;
  const task = readTaskDoc(docKey) ?? "";
  if (!task) {
    stopAuto(todo, "没有需求文档，自动停了，等你手动发起");
    return;
  }
  const res = await handleReviewStart(
    {
      id: todo.id,
      kind,
      task,
      reviewer: defaultReviewer(todo),
      ...(kind === "single" && todo.review?.targetIndex !== undefined
        ? { targetIndex: todo.review.targetIndex }
        : {}),
    },
    { paseo },
  );
  if (!res.ok) {
    stopAuto(getTodo(todo.id) ?? todo, res.error || "自动发起评审失败");
    return;
  }
  noteAuto(getTodo(todo.id) ?? todo, `自动发起第 ${auto.roundsUsed + 1} 轮评审`, {
    phase: "reviewing",
  });
}

/** 评审出结果了：自动决定发回还是收工。 */
export async function autoAdvanceReview(
  todoId: string,
  paseo: PluginHandlerContext["paseo"],
): Promise<void> {
  const todo = getTodo(todoId);
  const auto = todo?.autoReview;
  const rev = todo?.review;
  if (!todo || !auto || !autoOn(todo) || !rev || rev.status !== "done") return;
  const text = readVerdictFile(
    todo.title,
    rev.kind ?? "single",
    rev.verdictFile,
  )?.text;
  if (!text) {
    stopAuto(todo, "评审没有有效结果，自动停了");
    return;
  }
  const single = (rev.kind ?? "single") === "single";
  const passed = single && verdictPassed(text);
  const body = verdictHasBody(text);

  if (single && passed && !body) {
    stopAuto(todo, "评审通过、没有建议，自动停");
    return;
  }
  if (!autoRoundsLeft(todo)) {
    stopAuto(todo, `已自动跑满 ${auto.roundsUsed} 轮，停了`);
    return;
  }
  const sent = await handleReviewSend({ id: todo.id }, { paseo });
  const now = getTodo(todo.id) ?? todo;
  if (!sent.ok) {
    stopAuto(now, sent.error || "自动发回失败");
    return;
  }
  const used = auto.roundsUsed + 1;
  const 胜者 = /胜者\s*[:：]\s*(\d+)/.exec(verdictFirstLine(text));
  const patch: Partial<NonNullable<Todo["autoReview"]>> = {
    roundsUsed: used,
    phase: "horse",
  };
  // 通过但有建议：发回改完就停，不再自动评
  if (single && passed && body) patch.maxRounds = 0;
  if (patch.maxRounds !== 0 && auto.maxRounds > 0 && used >= auto.maxRounds) {
    patch.maxRounds = 0;
  }
  const stopNote =
    patch.maxRounds === 0
      ? single && passed && body
        ? "评审通过、建议已发回，改完就停"
        : `已自动跑满 ${used} 轮，停了`
      : `已自动发回第 ${used} 轮，等它改完再评`;
  saveTodo({
    ...now,
    // 赛马选出胜者后，后面就只评那一匹
    ...(胜者 && !single
      ? {
          review: {
            ...now.review!,
            kind: "single" as const,
            targetIndex: parseInt(胜者[1], 10) - 1,
          },
        }
      : {}),
    autoReview: { ...now.autoReview!, ...patch, note: stopNote },
  });
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/** 评审会话还在且有效吗（存在、未归档、未报错） */
async function isReviewSessionAlive(
  todo: Todo,
  paseo: PluginHandlerContext["paseo"],
): Promise<boolean> {
  const arb = todo.review;
  if (!arb) return false;
  if (arb.agentId) {
    try {
      const { stdout } = await execFileAsync("paseo", ["agent", "inspect", arb.agentId, "--json"]);
      const info = JSON.parse(stdout) as { Id?: string; Archived?: boolean; Status?: string };
      return Boolean(info.Id && !info.Archived && info.Status !== "error");
    } catch {
      return false;
    }
  }
  if (arb.terminalId && arb.workspaceId) {
    try {
      const list = await paseo.terminals.list({ workspaceId: arb.workspaceId });
      return (list.entries ?? []).some((t) => t.id === arb.terminalId);
    } catch {
      return false;
    }
  }
  return false;
}

export async function handleReviewStart(
  input: RpcInput<typeof reviewStartRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof reviewStartRpc>> {
  const todo = getTodo(input.id);
  if (!todo) return { ok: false, todo: null, error: "待办不存在" };
  if (todo.review?.status === "running") {
    return {
      ok: false,
      todo,
      error: "评审进行中",
    };
  }
  const arb = todo.review;
  const reviewerChanged =
    input.reviewer &&
    arb &&
    (arb.reviewer.provider !== input.reviewer.provider ||
      (arb.reviewer.model || "") !== (input.reviewer.model || ""));
  if (arb && !reviewerChanged && (await isReviewSessionAlive(todo, paseo))) {
    const contRes = await handleReviewContinue(
      { id: input.id, task: input.task },
      { paseo },
    );
    return {
      ok: contRes.ok,
      todo: getTodo(input.id) ?? todo,
      error: contRes.error,
    };
  }
  const kind: ReviewKind = input.kind;

  const picked = await pickTargets(todo, paseo, kind, input.targetIndex);
  if (picked.error) return { ok: false, todo, error: picked.error };
  const targets = picked.targets;
  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  if (!repo) return { ok: false, todo, error: "找不到仓库路径" };

  const now = new Date().toISOString();
  // 评审只读、不改代码：给它一个空目录当落脚点，不开分支、不动仓库
  const stamp = Date.now().toString(36);
  const title = `⚖ 评审《${todo.title}》`;
  const deskDir = join(
    tmpdir(),
    "one-todo",
    "评审员",
    `${branchFromTitle(todo.title) || "待办"}-${stamp}`,
  );
  let workspaceId: string;
  try {
    mkdirSync(deskDir, { recursive: true });
    const ws = await paseo.workspaces.create({
      source: {
        kind: "directory",
        path: deskDir,
        ...(todo.projectId ? { projectId: todo.projectId } : {}),
      },
      title,
    });
    workspaceId = ws.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, todo, error: `创建评审工作区失败: ${message}` };
  }

  let prompt: string;
  let verdictName: string;
  try {
    ({ prompt, verdictName } = assembleReviewPrompt(
      todo,
      kind,
      input.task?.trim() || "",
      targets,
    ));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    void discardReviewDesk(paseo, workspaceId);
    return { ok: false, todo, error: message };
  }
  try {
    // 建结果目录并清掉上一次的结果，免得评审员还没写就被当成旧结果读走
    mkdirSync(VERDICT_DIR, { recursive: true });
    rmSync(verdictPath(todo.title, verdictName), { force: true });
    const launched = await launchAgentOrTerminal(
      paseo,
      paseo.workspaces.ref(workspaceId),
      input.reviewer,
      title,
      prompt,
    );
    const next: Todo = {
      ...todo,
      review: {
        kind,
        reviewer: input.reviewer as AgentRef,
        agentId: launched.agentId,
        terminalId: launched.terminalId,
        workspaceId,
        status: "running",
        startedAt: now,
        verdictFile: verdictName,
        ...(input.targetIndex !== undefined
          ? { targetIndex: input.targetIndex }
          : {}),
      },
    };
    return { ok: true, todo: saveTodo(next) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    void discardReviewDesk(paseo, workspaceId);
    const next: Todo = {
      ...todo,
      review: {
        kind,
        reviewer: input.reviewer as AgentRef,
        workspaceId,
        status: "failed",
        verdictFile: verdictName,
        ...(input.targetIndex !== undefined
          ? { targetIndex: input.targetIndex }
          : {}),
        error: message,
        startedAt: now,
        finishedAt: new Date().toISOString(),
      },
    };
    return { ok: false, todo: saveTodo(next), error: message };
  }
}

export async function handleReviewVerdict(
  input: RpcInput<typeof reviewVerdictRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof reviewVerdictRpc>> {
  const todo = getTodo(input.id);
  const arb = todo?.review;
  const kind: ReviewKind = arb?.kind ?? "multi";
  const needFirstLine = kind === "single" ? "「结论:」" : "「胜者:」";
  if (todo && arb?.status === "running") {
    const file = readVerdictFile(todo.title, kind, arb.verdictFile);
    if (file.valid && file.text) {
      // 会话型评审员以 turn_ended 为准；万一漏了事件，它已经不在跑也算终稿
      if (arb.agentId) {
        if (await agentStillRunning(arb.agentId)) return {};
      }
      // 终端型评审员没有 turn 事件：文件连续 10 秒没再动，才算写完
      const ageMs = verdictAgeMs(todo.title, arb.verdictFile);
      if (ageMs === undefined || ageMs < 10000) return {};
      saveTodo({
        ...todo,
        review: {
          ...arb,
          status: "done",
          error: undefined,
          finishedAt: new Date().toISOString(),
        },
      });
      void autoAdvanceReview(todo.id, paseo);
      return { verdict: file.text };
    }
    // agy 终端评审员没有 turn_ended：终端没了 + 没有有效结果 = 评审失败
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
          review: {
            ...arb,
            status: "failed",
            error: terminalAlive
              ? "评审终端状态连续查不到，请检查 Paseo 连接后重开"
              : `评审会话已结束，但未写出有效结果（缺${needFirstLine}首行）`,
            finishedAt: new Date().toISOString(),
          },
        });
        return { error: "评审会话已结束，但未写出有效结果" };
      }
      if (checkFails !== (arb.terminalCheckFails ?? 0)) {
        saveTodo({
          ...todo,
          review: { ...arb, terminalCheckFails: checkFails },
        });
      }
      return {};
    }
    return {};
  }
  if (!todo) return {};
  // 结论文件是共用的，已结束的待办一律读自己身上存的那份
  try {
    return {
      verdict: readFileSync(verdictPath(todo.title, arb?.verdictFile), "utf8"),
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** 把评审意见发给干活的会话：一匹马发给那一匹，多匹马发给评审选中的那匹。 */
/** 卡在「评审中」时的人工出口：作废这次评审，评审工作区一并清掉。 */
export async function handleReviewAbort(
  input: RpcInput<typeof reviewAbortRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof reviewAbortRpc>> {
  const todo = getTodo(input.id);
  const arb = todo?.review;
  if (!todo || !arb) return { ok: false, todo: null, error: "还没有评审记录" };
  if (arb.status !== "running") {
    return { ok: false, todo, error: "当前没有在评审" };
  }
  const next: Todo = {
    ...todo,
    review: {
      ...arb,
      status: "failed",
      error: "已中止",
      finishedAt: new Date().toISOString(),
    },
  };
  const saved = saveTodo(next);
  if (arb.workspaceId) void discardReviewDesk(paseo, arb.workspaceId);
  return { ok: true, todo: saved };
}

/** 接着聊：复用上次那个评审员会话，让它看最新需求和最新代码重评一次。 */
export async function handleReviewContinue(
  input: RpcInput<typeof reviewContinueRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof reviewContinueRpc>> {
  const todo = getTodo(input.id);
  const arb = todo?.review;
  if (!todo || !arb) return { ok: false, error: "还没有评审记录" };
  if (arb.status === "running") return { ok: false, error: "评审还没结束" };
  const agentId = arb.agentId;
  const terminalId = arb.terminalId;
  if (!agentId && !terminalId) {
    return { ok: false, error: "上次的评审会话找不到了，只能开新评审" };
  }
  const picked = await pickTargets(
    todo,
    paseo,
    arb.kind ?? "multi",
    arb.targetIndex,
  );
  if (picked.error) return { ok: false, error: picked.error };
  const targets = picked.targets;
  const task = input.task?.trim() || "";
  if (!task) return { ok: false, error: "请先指定评审基准" };
  let prompt: string;
  let verdictName: string;
  try {
    ({ prompt, verdictName } = assembleReviewPrompt(
      todo,
      arb.kind ?? "multi",
      task,
      targets,
    ));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
  // 先发：发不出去就什么都不动（状态、旧结果都保持原样）
  try {
    await sendToSession(agentId, terminalId, prompt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `发不出去：${message}；可以点「复制」自己粘`,
    };
  }
  // 发出去了才清掉旧结果、翻「评审中」
  const file = verdictPath(todo.title, verdictName);
  try {
    mkdirSync(VERDICT_DIR, { recursive: true });
    rmSync(file, { force: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `准备评审结果文件失败：${message}` };
  }
  saveTodo({
    ...todo,
    review: {
      ...arb,
      status: "running",
      finishedAt: undefined,
      error: undefined,
      verdictFile: verdictName,
      startedAt: new Date().toISOString(),
    },
  });
  return { ok: true };
}

export async function handleReviewSend(
  input: RpcInput<typeof reviewSendRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof reviewSendRpc>> {
  const todo = getTodo(input.id);
  const arb = todo?.review;
  if (!todo || !arb) return { ok: false, error: "还没有评审记录" };
  if (arb.status === "running") return { ok: false, error: "评审员还没写完" };
  const kind: ReviewKind = arb.kind ?? "multi";
  const file = readVerdictFile(todo.title, kind, arb.verdictFile);
  if (!file.valid || !file.text) return { ok: false, error: "还没有有效结论，发不了" };

  // 定目标马：优先名单里有 worktree 的马；没有（主干/本地直跑）就用待办自己的会话
  const worktrees = todo.worktrees ?? [];
  const candidates = await resolveCandidates(todo, paseo);
  let agentId: string | undefined;
  let terminalId: string | undefined;
  if (worktrees.length > 0) {
    let idx = -1;
    if (kind === "multi") {
      const m = /^\s*(?:#\s*)?胜者\s*[:：]\s*(\d+)/.exec(
        file.text.split("\n", 1)[0] ?? "",
      );
      const n = m ? parseInt(m[1], 10) : NaN;
      if (!n || n < 1 || n > worktrees.length) {
        return { ok: false, error: "结论里找不到胜者编号" };
      }
      idx = n - 1;
    } else {
      // 一匹马：发起时指定了哪匹就发回哪匹，没指定就发回第一个还活着的
      idx =
        arb.targetIndex !== undefined
          ? arb.targetIndex
          : candidates.findIndex((c) => c.exists);
    }
    if (idx < 0) return { ok: false, error: "没有可发送的目标" };
    if (!candidates[idx]?.exists) {
      return { ok: false, error: "那匹马的目录已经不在了（可能已归档）" };
    }
    agentId = worktrees[idx]?.agentId;
    terminalId = worktrees[idx]?.terminalId;
  } else {
    // 主干/本地直跑：马就在待办自己的会话里，取最近派的那匹
    agentId = [...(todo.agentIds ?? [])].reverse().find(Boolean);
    terminalId = [...(todo.terminalIds ?? [])].reverse().find(Boolean);
    if (!agentId && !terminalId) {
      try {
        const { stdout } = await execFileAsync("paseo", ["ls", "--json"]);
        const list = JSON.parse(stdout) as Array<{ id?: string; status?: string }>;
        const hit = list.find((a) => a.id && a.id !== arb.agentId && a.status !== "closed");
        if (hit?.id) {
          agentId = hit.id;
          saveTodo({
            ...todo,
            agentIds: [...new Set([...(todo.agentIds ?? []), hit.id])],
          });
        }
      } catch {
        // ignore
      }
    }
  }
  if (!agentId && !terminalId) {
    return {
      ok: false,
      error: "没有可发送的会话；可以点「复制」自己粘",
    };
  }

  const head = sendPromptText();
  const body = `${head}\n\n${file.text}`;
  try {
    await sendToSession(agentId, terminalId, body);
    return { ok: true, target: agentId ? `会话 ${agentId.slice(0, 8)}` : "终端" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `发不出去：${message}；可以点「复制」自己粘`,
    };
  }
}

/** 评审没发起成功：落脚工作区白建了，当场归档，不留孤儿。 */
async function discardReviewDesk(
  paseo: PluginHandlerContext["paseo"],
  workspaceId: string,
): Promise<void> {
  try {
    await paseo.workspaces.ref(workspaceId).archive();
  } catch {
    // 归档不了也不影响别的
  }
}

/** 评审工作区归档：标失败（若还在跑），删掉结果文件（评审不开分支，没有分支可删）。 */
export async function cleanupReviewArtifacts(
  workspaceId: string,
): Promise<void> {
  for (const t of listTodos()) {
    const arb = t.review;
    if (!arb || arb.workspaceId !== workspaceId) continue;
    if (arb.status === "running") {
      saveTodo({
        ...t,
        review: {
          ...arb,
          status: "failed",
          error: "评审工作区已归档",
          finishedAt: new Date().toISOString(),
        },
      });
    }
    rmSync(verdictPath(t.title, arb.verdictFile), { force: true });
  }
}

/** 待办被删：把它的评审结果文件一起清掉。 */
export function dropReviewFile(todoId: string): void {
  const todo = getTodo(todoId);
  if (!todo?.review) return;
  rmSync(verdictPath(todo.title, todo.review.verdictFile), { force: true });
}

/** 评审员 turn 结束：只翻评审状态，不动待办本身。返回是否命中评审。 */
export function completeReview(
  agentId: string,
  outcome: "completed" | "failed" | "canceled",
  errorMessage?: string,
): boolean {
  for (const t of listTodos()) {
    const arb = t.review;
    if (!arb || arb.status !== "running" || arb.agentId !== agentId) continue;
    let error: string | undefined;
    let finalStatus: "done" | "failed" = "done";
    if (outcome !== "completed") {
      finalStatus = "failed";
      error =
        errorMessage ||
        (outcome === "canceled" ? "评审会话已取消" : "评审 turn failed");
    } else {
      // 完成也必须有有效结论，否则算失败
      const kind: ReviewKind = arb.kind ?? "multi";
      const file = readVerdictFile(t.title, kind, arb.verdictFile);
      if (!file.valid) {
        finalStatus = "failed";
        error =
          kind === "single"
            ? "评审结束了，但未写出有效结果（缺「结论: 通过/不通过」首行）"
            : "评审结束了，但未写出有效结果（缺「胜者: <候选>」首行）";
      }
    }
    saveTodo({
      ...t,
      review: {
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
