import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
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
  horseBySession,
  reviewTemplateRpc,
  listInitialPromptsRpc,
  deleteInitialPromptRpc,
  removeWorktreeRpc,
  removeHorseRpc,
  type AgentRef,
  type Todo,
} from "../shared/todo";
import { getPreferences, savePreferences } from "./preferences";
import { deleteBranches } from "./worktree";
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
  // 这条候选是哪匹马：它的会话号（终端马就是终端号）
  agentId?: string;
  // 这匹马在自己单独的分支工作区里（可以 ✕ 掉它）
  ownWorkspace?: boolean;
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
 * 找评审候选：一条候选就是一匹马（名单上第几匹，谁都按这本号）。
 * - 这匹马有自己的分支 → 评它的分支目录（目录已不在＝标失效）。
 * - 本地直跑的马 → 评同一个目录，但回传还是认它自己。
 * 目录：git worktree list 按分支（权威） → 马自己记的目录 → workspace 目录。
 */
async function resolveCandidates(
  todo: Todo,
  paseo: PluginHandlerContext["paseo"],
): Promise<Candidate[]> {
  const list: Candidate[] = [];
  const horses = todoAgents(todo);
  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  const gitDirs = repo ? await gitWorktreeDirs(repo) : null;

  const wsDirs = new Map<string, string>();
  if (gitDirs === null && horses.some((a) => a.branch && !a.dir)) {
    try {
      const res = await paseo.workspaces.list();
      for (const w of res.entries ?? []) {
        if (w.workspaceDirectory) wsDirs.set(w.id, w.workspaceDirectory);
      }
    } catch {
      // ignore
    }
  }

  const localDir = todo.projectPath || todo.cwd;
  for (const [i, a] of horses.entries()) {
    const session = a.agentId ?? a.terminalId;
    // 还没开跑的马不是评审对象
    if (!session) continue;
    const label = `${a.no ?? i + 1}# ${a.model ? `${a.provider} / ${a.model}` : a.provider || "默认"}`;
    const workspaceId = a.workspaceId ?? todo.workspaceId ?? "";
    // 赛马时才"每匹马一条自己的分支"：那种能单独划掉（普通模式的分支是你填的，不许划）
    const ownWorkspace = todo.raceMode === true && Boolean(a.branch);
    if (a.branch) {
      const gdir = gitDirs?.get(a.branch);
      const dir = gdir ?? a.dir ?? wsDirs.get(workspaceId);
      const exists =
        gitDirs !== null
          ? Boolean(gdir && existsSync(gdir))
          : Boolean(dir && existsSync(dir));
      list.push({
        workspaceId,
        branch: a.branch,
        dir,
        exists,
        label,
        agentId: session,
        ...(ownWorkspace ? { ownWorkspace: true } : {}),
        taskDoc: readTaskDoc(workspaceId),
      });
      continue;
    }
    // 本地直跑：几匹马挤在同一个目录里，候选仍是一匹马一条
    const dir = a.dir ?? localDir;
    if (dir && existsSync(dir)) {
      list.push({
        workspaceId,
        branch: todo.baseBranch?.trim() || "main",
        dir,
        exists: true,
        label,
        agentId: session,
        taskDoc: readTaskDoc(workspaceId),
      });
    }
  }

  // 一匹马都没开过会话（或全归档了）：还有目录就给审核员一个落脚点
  if (list.length === 0 && localDir && existsSync(localDir)) {
    list.push({
      workspaceId: todo.workspaceId ?? "",
      branch: todo.baseBranch?.trim() || "main",
      dir: localDir,
      exists: true,
      label: `本地目录 · ${todo.projectName || "项目"}`,
      taskDoc: readTaskDoc(todo.workspaceId),
    });
  }

  return list;
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
  if (candidates.length === 0) {
    return { candidates: [], error: "该待办没有可评审的目录" };
  }
  return {
    repo,
    baseBranch,
    candidates,
    reviewTaskDoc: readTaskDoc(
      todo.workspaceId ?? todo.projectPath ?? todo.cwd,
    ),
  };
}

// 提示词是插件资产，住在插件目录的 prompts/ 里，随仓库走（换机器也在）
// 插件运行时不提供 import.meta.url，就从 paseo 配置里认自己的目录（加载时先不算，避免加载失败）
const PLUGIN_ID = "one-todo";
const TEMPLATE_NAME = {
  multi: "赛马向导词.md",
  single: "评审向导词.md",
  send: "整改向导词.md",
  initial: "开场向导词.md",
  initialRace: "赛马开场向导词.md",
  initialCommittee: "委员会开场向导词.md",
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
3. 先按需求判对错，再按标准横向比。
4. 结果写入 {{verdictFile}}：首行「胜者: <编号>」，下面每匹马两三句点评+一句改进建议。写完把结果全文贴在回复里，全部控制在十五行以内。`;

const DEFAULT_SINGLE = `你是评审员。评审下面这份实现，指出问题并给出改进建议。

需求：
{{task}}

目标：
{{targets}}

规则：
1. 目标只读：只能看和用只读 git 命令，禁止任何改动。
2. 需求里写了起点提交 ID 的，本轮改动 = 从那次提交之后的一切（含未提交）；没写起点的，先看 status 再看 diff：没提交的都算本轮，已提交的看提交时间和提交信息判断哪些属于本轮，必要时和基线 {{base}} 比。
3. 按需求逐项核对，再按标准看质量与风险。
4. 结果写入 {{verdictFile}}：首行「结论: 通过」或「结论: 不通过」，下面只列问题（标阻塞/建议）和一句话理由。写完把结果全文贴在回复里，全部控制在十五行以内。`;

const DEFAULT_SEND =
  "【评审反馈与整改建议】以下为审阅结论。请评估可行性并排查技术风险，涉及架构与关键逻辑变更须经确认后推进，依此落实修正。";

const DEFAULT_INITIAL = `会话开始时，先记录一下 Git commit ID 到需求文档中。
把上面的需求整理成平铺计划列给用户，并写到：{{docPath}}
[使用技能: {{Skills}}。若未安装或未找到上述技能，必须立即向我反馈，不得擅自执行]`;

// 委员会那份多带一句：{{members}} 是唯一把两个成员递给技能的地方，缺了成员就传不过去
const DEFAULT_INITIAL_COMMITTEE = `${DEFAULT_INITIAL}
委员会两个成员用这两个：{{members}}，已经替你挑好了，不用自己挑。`;

// 三份开场词跟其他 prompts 一样：仓库里各有一份，待遇完全相同，谁也不从谁派生
const DEFAULT_TPL: Record<TplKind, string> = {
  multi: DEFAULT_MULTI,
  single: DEFAULT_SINGLE,
  send: DEFAULT_SEND,
  initial: DEFAULT_INITIAL,
  initialRace: DEFAULT_INITIAL,
  initialCommittee: DEFAULT_INITIAL_COMMITTEE,
};

// 写不进去就明说：悄悄吞掉会让人以为改动已经存上了
function initialPromptDir(): string {
  const dir = join(promptDir(), "initial");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function listInitialPromptsRaw(): Array<{ name: string; text: string }> {
  const dir = initialPromptDir();
  let entries: string[] = [];
  try {
    entries = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    entries = [];
  }
  if (entries.length === 0) {
    let text = DEFAULT_INITIAL;
    const oldPath = join(promptDir(), "开场向导词.md");
    if (existsSync(oldPath)) {
      try {
        text = readFileSync(oldPath, "utf8");
      } catch {}
    }
    const initialPath = join(dir, "开场向导词.md");
    try {
      writeFileSync(initialPath, text, "utf8");
    } catch {}
    return [{ name: "开场向导词", text }];
  }

  const list: Array<{ name: string; text: string }> = [];
  for (const file of entries) {
    const name = file.replace(/\.md$/, "");
    try {
      const text = readFileSync(join(dir, file), "utf8");
      list.push({ name, text });
    } catch {}
  }
  list.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return list;
}

export function readInitialPromptRaw(name?: string): string {
  const list = listInitialPromptsRaw();
  if (name) {
    const found = list.find((p) => p.name === name);
    if (found) return found.text;
  }
  const prefName = getPreferences().lastInitialPromptName;
  if (prefName) {
    const found = list.find((p) => p.name === prefName);
    if (found) return found.text;
  }
  const def = list[0];
  return def ? def.text : DEFAULT_INITIAL;
}

export function writeInitialPromptRaw(
  name: string,
  text: string,
  newName?: string,
): string {
  const cleanOld = name.trim().replace(/[\\/:*?"<>|]/g, "_");
  const targetName = (newName && newName.trim()) ? newName.trim().replace(/[\\/:*?"<>|]/g, "_") : cleanOld;
  if (!targetName) throw new Error("前导词名称不能为空");
  const dir = initialPromptDir();
  const newFilePath = join(dir, `${targetName}.md`);
  try {
    writeFileSync(newFilePath, text, "utf8");
    if (cleanOld && cleanOld !== targetName) {
      const oldFilePath = join(dir, `${cleanOld}.md`);
      if (existsSync(oldFilePath)) {
        try { rmSync(oldFilePath); } catch {}
      }
    }
    savePreferences({ lastInitialPromptName: targetName });
    return targetName;
  } catch (e) {
    const why = e instanceof Error ? e.message : "未知原因";
    throw new Error(`前导词「${targetName}」保存失败（${why}）`);
  }
}

export function deleteInitialPromptRaw(name: string): void {
  const cleanName = name.trim().replace(/[\\/:*?"<>|]/g, "_");
  if (!cleanName) return;
  const dir = initialPromptDir();
  const filePath = join(dir, `${cleanName}.md`);
  if (existsSync(filePath)) {
    try {
      rmSync(filePath);
    } catch (e) {
      const why = e instanceof Error ? e.message : "未知原因";
      throw new Error(`删除前导词「${cleanName}」失败（${why}）`);
    }
  }
  const remaining = listInitialPromptsRaw();
  savePreferences({
    lastInitialPromptName: remaining[0]?.name || "开场向导词",
  });
}
function writeTemplate(kind: TplKind, text: string, name?: string): void {
  if (kind === "initial") {
    writeInitialPromptRaw(name || "开场向导词", text);
    return;
  }
  try {
    mkdirSync(promptDir(), { recursive: true });
    writeFileSync(templatePath(kind), text, "utf8");
  } catch (e) {
    const why = e instanceof Error ? e.message : "未知原因";
    throw new Error(
      `${TEMPLATE_LABEL[kind]}没写进提示词目录（${why}），内容没保存`,
    );
  }
}

export function readOrSeedTemplateRaw(kind: TplKind, name?: string): string {
  if (kind === "initial") {
    return readInitialPromptRaw(name);
  }
  try {
    return readFileSync(templatePath(kind), "utf8");
  } catch {
    const raw = DEFAULT_TPL[kind];
    try {
      writeTemplate(kind, raw);
    } catch {
      // 目录写不进去：退回内存里这份，面板照样能看能改；真保存时会明确报错
    }
    return raw;
  }
}

const TEMPLATE_LABEL: Record<TplKind, string> = {
  multi: "赛马向导词",
  single: "评审向导词",
  send: "整改向导词",
  initial: "开场向导词",
  initialRace: "赛马开场向导词",
  initialCommittee: "委员会开场向导词",
};

function checkTemplate(kind: TplKind, part: string): string | undefined {
  const name = TEMPLATE_LABEL[kind];
  if (!part.trim()) return `${name}不能为空`;
  // 整改词和三种开场词没有必填空位，不校验
  if (kind === "send" || kind.startsWith("initial")) return undefined;
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
      return {
        text: readOrSeedTemplateRaw(kind, input.name),
        name: input.name,
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "模板找不到了，请重试",
      };
    }
  }
  const text = input.text;
  if (!text.trim()) return { error: "模板不能为空" };
  const bad = checkTemplate(kind, text);
  if (bad) return { error: bad };
  try {
    if (kind === "initial") {
      const savedName = writeInitialPromptRaw(
        input.name || "开场向导词",
        text,
        input.newName,
      );
      return { text, name: savedName };
    }
    writeTemplate(kind, text);
    return { text, name: input.name };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "保存失败，请重试" };
  }
}

export function handleListInitialPrompts(): RpcOutput<typeof listInitialPromptsRpc> {
  try {
    const prompts = listInitialPromptsRaw();
    const pref = getPreferences().lastInitialPromptName;
    const selected =
      pref && prompts.some((p) => p.name === pref)
        ? pref
        : prompts[0]?.name || "开场向导词";
    return { prompts, selected };
  } catch (e) {
    return {
      prompts: [],
      error: e instanceof Error ? e.message : "读取前导词列表失败",
    };
  }
}

export function handleDeleteInitialPrompt(
  input: RpcInput<typeof deleteInitialPromptRpc>,
): RpcOutput<typeof deleteInitialPromptRpc> {
  try {
    const list = listInitialPromptsRaw();
    if (list.length <= 1) {
      return { ok: false, error: "至少需要保留一份前导词" };
    }
    deleteInitialPromptRaw(input.name);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "删除失败",
    };
  }
}
export async function handleRemoveWorktree(
  input: RpcInput<typeof removeWorktreeRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof removeWorktreeRpc>> {
  const todo = getTodo(input.id);
  if (!todo) return { ok: false, todo: null, error: "待办不存在" };
  const horses = todo.agents ?? [];
  const target = horses.find((a) => a.workspaceId === input.workspaceId);
  if (!target) return { ok: false, todo, error: "未找到这匹马的工作区" };
  // 主工作区是审核员和马一起落脚的地方，划了整单就没了
  if (input.workspaceId === todo.workspaceId) {
    return {
      ok: false,
      todo,
      error: "这是这单的主工作区，不能在这儿划掉",
    };
  }
  const sharers = horses.filter((a) => a.workspaceId === input.workspaceId);
  if (sharers.length > 1) {
    return {
      ok: false,
      todo,
      error: "这个工作区里还住着别的马，划掉会一起没",
    };
  }

  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  if (repo && target.branch) {
    try {
      await deleteBranches(repo, [target.branch]);
    } catch {
      // ignore
    }
  }
  try {
    await paseo.workspaces.ref(input.workspaceId).archive();
  } catch {
    // ignore
  }
  // ✕ 掉这匹马：它连自己的工作区、分支、会话一起从名单走
  const updated = saveTodo({
    ...todo,
    agents: (todo.agents ?? []).filter(
      (a) => a.workspaceId !== input.workspaceId,
    ),
  });
  return { ok: true, todo: updated };
}

/**
 * 跑任务弹层里按匹马划掉名单：按马的号认马，只抹这一条。只有它独占、且不是
 * 主工作区的工作区才顺手关（连分支一起）；共用 / 主工作区只抹名单，不动真身。
 * 幽灵马（真身早没了）也走这条，抹掉名单即可，不影响别的马。
 */
export async function handleRemoveHorse(
  input: RpcInput<typeof removeHorseRpc>,
  { paseo }: PluginHandlerContext,
): Promise<RpcOutput<typeof removeHorseRpc>> {
  const todo = getTodo(input.id);
  if (!todo) return { ok: false, todo: null, error: "待办不存在" };
  const horses = todo.agents ?? [];
  const idx = horses.findIndex((a) => a.no === input.no);
  if (idx < 0) return { ok: false, todo, error: "未找到这匹马" };
  const horse = horses[idx];
  const wid = horse.workspaceId;
  const shared = wid
    ? horses.filter((a) => a.workspaceId === wid).length > 1
    : false;

  if (wid && wid !== todo.workspaceId && !shared) {
    const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
    if (repo && horse.branch) {
      try {
        await deleteBranches(repo, [horse.branch]);
      } catch {
        // ignore
      }
    }
    try {
      await paseo.workspaces.ref(wid).archive();
    } catch {
      // ignore
    }
  }

  const remaining = horses.filter((_, i) => i !== idx);
  const updated = saveTodo({
    ...todo,
    agents: remaining.length ? remaining : [{ provider: "", model: "" }],
  });
  return { ok: true, todo: updated };
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

/** 挑这轮评审要看的候选：多匹马比对各分支；一匹马认那匹自己的目录。 */
async function pickTargets(
  todo: Todo,
  paseo: PluginHandlerContext["paseo"],
  kind: ReviewKind,
  targetAgentId?: string,
): Promise<{ targets: Candidate[]; error?: string }> {
  const candidates = await resolveCandidates(todo, paseo);
  const live = candidates.filter((c) => c.exists);
  if (kind === "multi") {
    // 赛马评比：一条分支一份目录；几匹马挤同一个目录不算（那是单马审核）
    const own = live.filter((c) => c.ownWorkspace);
    const targets: Candidate[] = [];
    const seen = new Set<string>();
    for (const c of own) {
      const key = c.dir ?? c.workspaceId;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(c);
    }
    if (targets.length < 2) {
      return {
        targets: [],
        error: `可评比的分支不足 2 个（找到 ${targets.length} 个），可能已被归档`,
      };
    }
    return { targets };
  }
  if (targetAgentId) {
    const t = candidates.find((c) => c.agentId === targetAgentId);
    if (!t || !t.exists) {
      return { targets: [], error: "审的那匹马已经不在了（可能已归档）" };
    }
    return { targets: [t] };
  }
  // 没指定审谁：只有唯一一个候选才算说得清，多个候选不猜
  if (live.length === 1) {
    return { targets: [live[0]] };
  }
  if (live.length === 0) {
    return { targets: [], error: "找不到可评审的目录" };
  }
  return { targets: [], error: "先选审的是哪匹马" };
}

/** 只分析不动手：审核员跟马同屋，除了结论文件什么都不能写。 */
const NO_EDIT_SUFFIX =
  "\n\n【只分析不动手】这次只分析：除结论文件外，禁止新建、修改、删除任何文件（含你所在的待办目录和候选目录），也不要执行会改动它们的命令。";

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
  const prompt =
    fillTemplate(tpl, {
      task,
      targets: list,
      base: todo.baseBranch?.trim() || "main",
      verdictFile: verdictPath(todo.title, verdictName),
    }) + NO_EDIT_SUFFIX;
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

// 这一回合的做事流水里，哪些工具算"动了代码"、哪些只是"看看"
const CODE_WRITE_TOOLS = new Set([
  "write",
  "edit",
  "multiedit",
  "notebookedit",
  "replace_in_file",
  "create_file",
  "write_file",
  "insert",
  "delete_file",
  "apply_patch",
  "str_replace_editor",
]);
const READ_ONLY_TOOLS = new Set([
  "read",
  "glob",
  "grep",
  "search",
  "ls",
  "list_dir",
  "todoread",
  "todowrite",
  "todo",
  "webfetch",
  "websearch",
  "task",
  "exit_plan_mode",
]);

/**
 * 干活马这一回合到底有没有动代码：只看黑马提供的做事流水里的工具调用。
 * 认不出是什么工具时不装懂，按"动过"算，宁可多评一次也别漏评。
 */
export function turnTouchedCode(timeline: readonly unknown[]): boolean {
  const tools: string[] = [];
  for (const it of timeline ?? []) {
    if (!it || typeof it !== "object") continue;
    const r = it as { type?: unknown; name?: unknown; status?: unknown };
    if (r.type !== "tool_call" || r.status !== "completed") continue;
    if (typeof r.name === "string") tools.push(r.name.toLowerCase());
  }
  if (tools.some((n) => CODE_WRITE_TOOLS.has(n))) return true;
  return tools.some((n) => !READ_ONLY_TOOLS.has(n));
}

/** 自动开着吗：轮数 0 = 关着，-1 = 不限，>0 = 有上限 */
export function autoOn(todo: Todo): boolean {
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
  agentId?: string,
): Promise<void> {
  const todo = getTodo(todoId);
  const auto = todo?.autoReview;
  if (!todo || !auto || !autoOn(todo)) return;
  if (auto.phase === "reviewing") return;
  if (todo.status === "failed") return;
  if (todo.review?.status === "running") return;
  if (!autoRoundsLeft(todo)) {
    stopAuto(todo, `已自动跑满 ${auto.roundsUsed} 轮，停了`);
    return;
  }
  const candidates = await resolveCandidates(todo, paseo);
  // 刚跑完的那匹马就是这轮的评审对象；名单上找不到就沿用上次记下的那匹
  const targetAgentId = agentId ?? todo.review?.targetAgentId;
  const hit = candidates.find((c) => c.agentId === targetAgentId && c.exists);
  const docKey = hit?.workspaceId ?? todo.workspaceId;
  const task = readTaskDoc(docKey) ?? "";
  if (!task) {
    stopAuto(todo, "没有需求文档，自动停了，等你手动发起");
    return;
  }
  const res = await handleReviewStart(
    {
      id: todo.id,
      kind: "single",
      task,
      reviewer: defaultReviewer(todo),
      ...(targetAgentId ? { targetAgentId } : {}),
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
  const text = readVerdictFile(todo.title, "single", rev.verdictFile)?.text;
  if (!text) {
    stopAuto(todo, "评审没有有效结果，自动停了");
    return;
  }
  const passed = verdictPassed(text);
  const body = verdictHasBody(text);
  if (passed && !body) {
    saveTodo({
      ...todo,
      autoReview: {
        ...auto,
        maxRounds: 0,
        phase: undefined,
        note: "评审通过、没有建议，自动停",
      },
    });
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
  const patch: Partial<NonNullable<Todo["autoReview"]>> = {
    roundsUsed: used,
    phase: "horse",
  };
  if (passed) {
    // 已经通过：建议发回让它改，但不再自动拉下一轮
    patch.maxRounds = 0;
  } else if (auto.maxRounds > 0 && used >= auto.maxRounds) {
    patch.maxRounds = 0;
  }
  const stopNote = passed
    ? "评审已通过，建议已发回让它改，自动停"
    : patch.maxRounds === 0
      ? `已自动跑满 ${used} 轮，停了`
      : `已自动发回第 ${used} 轮，等它改完再评`;
  saveTodo({
    ...now,
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
      { id: input.id, task: input.task, targetAgentId: input.targetAgentId },
      { paseo },
    );
    return {
      ok: contRes.ok,
      todo: getTodo(input.id) ?? todo,
      error: contRes.error,
    };
  }
  const kind: ReviewKind = input.kind;
  const now = new Date().toISOString();
  // 发起没成：没有额外工作区要回收，只在待办身上把这次评审记成失败
  const startFailed = (
    error: string,
    verdictFile?: string,
  ): RpcOutput<typeof reviewStartRpc> => ({
    ok: false,
    todo: saveTodo({
      ...todo,
      review: {
        kind,
        reviewer: input.reviewer as AgentRef,
        workspaceId: todo.workspaceId,
        ...(verdictFile ? { verdictFile } : {}),
        ...(input.targetAgentId ? { targetAgentId: input.targetAgentId } : {}),
        status: "failed",
        error,
        startedAt: now,
        finishedAt: new Date().toISOString(),
      },
    }),
    error,
  });

  const picked = await pickTargets(todo, paseo, kind, input.targetAgentId);
  if (picked.error) return startFailed(picked.error);
  const targets = picked.targets;
  const repo = todo.worktreeRepo || todo.projectPath || todo.cwd;
  if (!repo) return startFailed("找不到仓库路径");

  const title = `⚖ 评审《${todo.title}》`;
  // 审核员就开在待办的主工作区（主干）里
  const reviewWorkspaceId = todo.workspaceId;

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
    return startFailed(message);
  }
  try {
    // 建结果目录并清掉上一次的结果，免得评审员还没写就被当成旧结果读走
    mkdirSync(VERDICT_DIR, { recursive: true });
    rmSync(verdictPath(todo.title, verdictName), { force: true });
    const launched = await launchAgentOrTerminal(
      paseo,
      paseo.workspaces.ref(reviewWorkspaceId!),
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
        workspaceId: reviewWorkspaceId,
        status: "running",
        startedAt: now,
        verdictFile: verdictName,
        ...(input.targetAgentId ? { targetAgentId: input.targetAgentId } : {}),
      },
    };
    return { ok: true, todo: saveTodo(next) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return startFailed(message, verdictName);
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
/** 让评审会话停下：agent 打断，终端直接杀。停不掉也不影响作废。 */
async function stopReviewSession(arb: {
  agentId?: string;
  terminalId?: string;
}): Promise<void> {
  try {
    if (arb.agentId) {
      await execFileAsync("paseo", ["agent", "stop", arb.agentId]);
    } else if (arb.terminalId) {
      await execFileAsync("paseo", ["terminal", "kill", arb.terminalId]);
    }
  } catch {
    // 停不掉也不影响作废
  }
}

/** 卡在「评审中」时的人工出口：作废这次评审，不动任何工作区。 */
export async function handleReviewAbort(
  input: RpcInput<typeof reviewAbortRpc>,
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
  // 先让它停下，不然它还会把结论写回来，等于没作废
  void stopReviewSession(arb);
  // 中止就把结论文件删掉，免得下次当成旧结果读出来
  rmSync(verdictPath(todo.title, arb.verdictFile), { force: true });
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
  const targetAgentId = input.targetAgentId ?? arb.targetAgentId;
  const picked = await pickTargets(
    todo,
    paseo,
    arb.kind ?? "single",
    targetAgentId,
  );
  if (picked.error) return { ok: false, error: picked.error };
  const targets = picked.targets;
  const task = input.task?.trim() || "";
  if (!task) return { ok: false, error: "请先填写需求详情" };
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
  let agentId: string | undefined;
  let terminalId: string | undefined;
  if (arb.targetAgentId) {
    // 这次评审指定了哪匹马：就发回它自己那个会话，不猜
    const horse = horseBySession(todo.agents, arb.targetAgentId);
    if (!horse) {
      return {
        ok: false,
        error: "这次评审的那匹马已经不在了（可能已归档），发不回去",
      };
    }
    agentId = horse.agentId;
    terminalId = horse.terminalId;
  } else if (kind === "multi") {
    // 赛马：结论首行写"胜者: N"，N 就是那匹马的号
    const m = /^\s*(?:#\s*)?胜者\s*[:：]\s*(\d+)/.exec(
      file.text.split("\n", 1)[0] ?? "",
    );
    const n = m ? parseInt(m[1], 10) : NaN;
    const horse = todoAgents(todo).find((a) => a.no === n);
    if (!horse) return { ok: false, error: "结论里的胜者编号找不到对应的马" };
    if (!horse.agentId && !horse.terminalId) {
      return { ok: false, error: "那匹马已经不在了（可能已归档），发不回去" };
    }
    agentId = horse.agentId;
    terminalId = horse.terminalId;
  } else {
    // 没记下发回哪匹马：不猜
    return {
      ok: false,
      error: "这次评审没记下发给哪匹马，没法发回；可以点「复制」自己粘",
    };
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

/**
 * 待办的主工作区（审核员就开在里面）被归档：在跑的就作废，结论文件一并删。
 * 赛马时 ✕ 掉某条马的工作区不走这里，不会牵连结论。
 */
export async function cleanupReviewArtifacts(
  workspaceId: string,
): Promise<void> {
  for (const t of listTodos()) {
    const arb = t.review;
    if (!arb || t.workspaceId !== workspaceId) continue;
    if (arb.status === "running") {
      saveTodo({
        ...t,
        review: {
          ...arb,
          status: "failed",
          error: "工作区已归档，评审作废",
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
    const kind: ReviewKind = arb.kind ?? "single";
    const file = readVerdictFile(t.title, kind, arb.verdictFile);
    if (file.valid) {
      // 只要结论文件成功写出且格式有效，即判定评审成功，允许自动发回！
      finalStatus = "done";
      error = undefined;
    } else if (outcome !== "completed") {
      finalStatus = "failed";
      error =
        errorMessage ||
        (outcome === "canceled" ? "评审会话已取消" : "评审 turn failed");
    } else {
      finalStatus = "failed";
      error =
        kind === "single"
          ? "评审结束了，但未写出有效结果（缺「结论: 通过/不通过」首行）"
          : "评审结束了，但未写出有效结果（缺「胜者: <候选>」首行）";
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
