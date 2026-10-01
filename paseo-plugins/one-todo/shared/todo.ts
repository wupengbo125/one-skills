import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const todoStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
]);
export type TodoStatus = z.infer<typeof todoStatusSchema>;

export const isolationSchema = z.enum(["local", "worktree"]);
export type TodoIsolation = z.infer<typeof isolationSchema>;

export const sourceSchema = z.enum(["todo", "issue"]);
export type TodoSource = z.infer<typeof sourceSchema>;

export const agentRefSchema = z.object({
  provider: z.string(),
  model: z.string().optional(),
  // 这匹马跑过的时间：有值＝老马（只显示不给删），没值＝还没跑的
  spawnedAt: z.string().optional(),
  // 这匹马的号：开跑时发一次，之后不许改也不许复用（分支名、评审里的编号都用它）
  no: z.number().int().optional(),
  // 这匹马自己的会话：开跑时记上，跳转、发回都靠它。还挂着会话＝还没收工
  agentId: z.string().optional(),
  terminalId: z.string().optional(),
  // 这匹马住在哪：它自己的工作区 / 分支 / 目录（本地直跑时没有分支）
  workspaceId: z.string().optional(),
  branch: z.string().optional(),
  dir: z.string().optional(),
});
export type AgentRef = z.infer<typeof agentRefSchema>;

export const autoReviewSchema = z.object({
  // 0 = 不限轮数
  maxRounds: z.number().int().min(-1),
  roundsUsed: z.number().int().min(0),
  // 停下来时给用户看的一句原因
  note: z.string().optional(),
  // 现在卡在哪一步：reviewing 等评审结果 / horse 等马改完
  phase: z.enum(["reviewing", "horse"]).optional(),
});

export type AutoReview = z.infer<typeof autoReviewSchema>;


export const todoSchema = z.object({
  id: z.string(),
  seq: z.number().optional(),
  title: z.string(),
  prompt: z.string(),
  agents: z.array(agentRefSchema).min(1),
  source: sourceSchema,
  issueRef: z.string().optional(),
  issueUrl: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  projectPath: z.string().optional(),
  isolation: isolationSchema.optional(),
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  cwd: z.string().optional(),
  baseBranch: z.string().optional(),
  newBranch: z.string().optional(),
  status: todoStatusSchema,
  // 赛马模式：第一次派马时定下来，之后不能改
  raceMode: z.boolean().optional(),
  // 委员会模式：同样第一次派马时定死；只一匹马，另指定两个派生成员
  committeeMode: z.boolean().optional(),
  committeeMembers: z.array(agentRefSchema).optional(),
  error: z.string().optional(),
  worktreeRepo: z.string().optional(),
  // 发到几号了：只增不减，归档过马也不回收旧号
  nextNo: z.number().int().optional(),
  review: z
    .object({
      kind: z.enum(["multi", "single"]).optional(),
      reviewer: agentRefSchema,
      agentId: z.string().optional(),
      terminalId: z.string().optional(),
      terminalCheckFails: z.number().optional(),
      workspaceId: z.string().optional(),
      status: z.enum(["running", "done", "failed"]),
      error: z.string().optional(),
      startedAt: z.string(),
      finishedAt: z.string().optional(),
      // 这轮审的是哪匹马：它的会话号（终端马即终端号）
      targetAgentId: z.string().optional(),
      verdictFile: z.string().optional(),
    })
    .optional(),
    createdAt: z.string(),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    skills: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
    autoReview: autoReviewSchema.optional(),
    extraPrompt: z.string().optional(),
    branchTag: z.string().optional(),
    initialPromptName: z.string().optional(),
  });
  export const preferencesSchema = z.object({
    lastProvider: z.string().optional(),
    lastModel: z.string().optional(),
    lastProjectId: z.string().optional(),
    lastProjectName: z.string().optional(),
    lastProjectPath: z.string().optional(),
    lastIsolation: isolationSchema.optional(),
    lastSkills: z.array(z.string()).optional(),
    // 上次保存的委员会两位委员：新建委员会单时默认带出来
    lastCommitteeMembers: z.array(agentRefSchema).optional(),
    lastInitialPromptName: z.string().optional(),
  });
  export type TodoPreferences = z.infer<typeof preferencesSchema>;
export type Todo = z.infer<typeof todoSchema>;

const todoPlacementFields = {
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  projectPath: z.string().optional(),
  isolation: isolationSchema.optional(),
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  cwd: z.string().optional(),
  baseBranch: z.string().optional(),
  newBranch: z.string().optional(),
};

export const listTodosRpc = defineRpc({
  name: "todo.list",
  input: z.object({}),
    output: z.object({ todos: z.array(todoSchema), preferences: preferencesSchema.optional() }),
});

export const addTodoRpc = defineRpc({
  name: "todo.add",
  input: z.object({
    title: z.string().min(1),
    prompt: z.string().default(""),
    source: sourceSchema.default("todo"),
    issueRef: z.string().optional(),
    issueUrl: z.string().optional(),
    skills: z.array(z.string()).optional(),
    agents: z.array(agentRefSchema).min(1).optional(),
    ...todoPlacementFields,
    pinned: z.boolean().optional(),
    extraPrompt: z.string().optional(),
    committee: z.boolean().optional(),
    committeeMembers: z.array(agentRefSchema).optional(),
    initialPromptName: z.string().optional(),
  }),
  output: z.object({ todo: todoSchema }),
});

export const createIssueRpc = defineRpc({
  name: "todo.create_issue",
  input: z.object({
    repo: z.string().min(1),
    title: z.string().min(1),
    body: z.string().default(""),
  }),
  output: z.object({
    number: z.number(),
    url: z.string(),
    repo: z.string(),
  }),
});

export const updateTodoRpc = defineRpc({
  name: "todo.update",
  input: z.object({
    id: z.string(),
    patch: z.object({
      title: z.string().optional(),
      prompt: z.string().optional(),
      skills: z.array(z.string()).optional(),
      agents: z.array(agentRefSchema).min(1).optional(),
      source: sourceSchema.optional(),
      issueRef: z.string().optional(),
      issueUrl: z.string().optional(),
      ...todoPlacementFields,
      worktreeRepo: z.string().optional(),
      // 发到几号了：整单搬马时也要搬，别让新单子从 1 重发
      nextNo: z.number().int().optional(),
      // 完成不走这里：标完成会关掉任务名下的工作区，只能走 todo.finish
      status: z.enum(["pending", "running", "failed"]).optional(),
      pinned: z.boolean().optional(),
      branchTag: z.string().optional(),
      autoReview: autoReviewSchema.optional(),
      extraPrompt: z.string().optional(),
      initialPromptName: z.string().optional(),
      committee: z.boolean().optional(),
      committeeMembers: z.array(agentRefSchema).optional(),
    }),
  }),
  output: z.object({
    todo: todoSchema.nullable(),
  }),
});

export const removeTodoRpc = defineRpc({
  name: "todo.remove",
  input: z.object({ id: z.string() }),
  output: z.object({ ok: z.boolean() }),
});

export const finishTodoRpc = defineRpc({
  name: "todo.finish",
  input: z.object({
    id: z.string(),
    force: z.boolean().optional(),
  }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    // 这次关掉了几个工作区
    closed: z.number(),
    // 没关掉的工作区（名字，给用户看是哪个）
    failed: z.array(z.string()),
    error: z.string().optional(),
    uncommitted: z.boolean().optional(),
    uncommittedFiles: z.array(z.string()).optional(),
  }),
});

export const resetTodoRpc = defineRpc({
  name: "todo.reset",
  input: z.object({ id: z.string() }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    // 这次关掉了几个工作区
    closed: z.number(),
    // 没关掉的工作区（名字，给用户看是哪个）
    failed: z.array(z.string()),
    error: z.string().optional(),
  }),
});

export const startTodoRpc = defineRpc({
  name: "todo.start",
  input: z.object({
    id: z.string(),
      agents: z.array(agentRefSchema).min(1).optional(),
      prompt: z.string().optional(),
      skills: z.array(z.string()).optional(),
      extraPrompt: z.string().optional(),
      // 赛马模式：第一次派马时按按钮定下来，之后不能改
      race: z.boolean().optional(),
      // 委员会模式：同上，另带两个派生成员配置
      committee: z.boolean().optional(),
      committeeMembers: z.array(agentRefSchema).optional(),
      initialPromptName: z.string().optional(),
      ...todoPlacementFields,
  }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    error: z.string().optional(),
  }),
});
  
export const listSkillsRpc = defineRpc({
  name: "todo.skills",
  input: z.object({}),
  output: z.object({
    skills: z.array(z.string()),
  }),
});

export const listProvidersRpc = defineRpc({
  name: "todo.providers",
  input: z.object({}),
  output: z.object({
    providers: z.array(z.object({ id: z.string(), available: z.boolean() })),
  }),
});

export const listModelsRpc = defineRpc({
  name: "todo.models",
  input: z.object({ provider: z.string() }),
  output: z.object({
    models: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        isDefault: z.boolean().optional(),
      }),
    ),
  }),
});

export const listWorkspacesRpc = defineRpc({
  name: "todo.workspaces",
  input: z.object({}),
  output: z.object({
    workspaces: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        title: z.string().optional(),
        directory: z.string().optional(),
        projectId: z.string().optional(),
      }),
    ),
  }),
});

export const listProjectsRpc = defineRpc({
  name: "todo.projects",
  input: z.object({}),
  output: z.object({
    projects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        path: z.string(),
        kind: z.string(),
      }),
    ),
  }),
});

export const listIssuesRpc = defineRpc({
  name: "todo.issues",
  input: z.object({
    projectPath: z.string().optional(),
  }),
  output: z.object({
    issues: z.array(
      z.object({
        repo: z.string(),
        number: z.number(),
        title: z.string(),
        url: z.string(),
        state: z.string(),
        updatedAt: z.string().optional(),
        body: z.string().optional(),
        projectPath: z.string().optional(),
        projectName: z.string().optional(),
        projectId: z.string().optional(),
      }),
    ),
    repos: z.array(z.string()),
    error: z.string().optional(),
  }),
});

export const fetchIssueRpc = defineRpc({
  name: "todo.fetch_issue",
  input: z.object({ ref: z.string().min(1) }),
  output: z.object({
    title: z.string(),
    body: z.string(),
    number: z.number(),
    repo: z.string(),
    url: z.string(),
  }),
});

export const reviewDirsRpc = defineRpc({
  name: "todo.review_dirs",
  input: z.object({ id: z.string() }),
  output: z.object({
    repo: z.string().optional(),
    baseBranch: z.string().optional(),
    candidates: z.array(
      z.object({
        workspaceId: z.string(),
        branch: z.string(),
        dir: z.string().optional(),
        exists: z.boolean(),
        label: z.string(),
        // 这条候选是哪匹马（会话号；终端马就是终端号）
        agentId: z.string().optional(),
        // 这匹马在自己单独的分支工作区里（可以 ✕ 掉它）
        ownWorkspace: z.boolean().optional(),
        // 这匹马目录里的需求文件内容，弹层里显示出来供用户删改
        taskDoc: z.string().optional(),
      }),
    ),
    reviewDir: z.string().optional(),
    // 本地目录（无 worktree）那份需求文件的内容
    reviewTaskDoc: z.string().optional(),
    error: z.string().optional(),
  }),
});

export const reviewStartRpc = defineRpc({
  name: "todo.review_start",
  input: z.object({
    id: z.string(),
    kind: z.enum(["multi", "single"]),
    reviewer: agentRefSchema,
    // 需求正文：弹层框里的字，用户可整段删掉
    task: z.string().optional(),
    // 审的是哪匹马：它的会话号。不传就不指定
    targetAgentId: z.string().optional(),
  }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    error: z.string().optional(),
  }),
});

export const reviewVerdictRpc = defineRpc({
  name: "todo.review_verdict",
  input: z.object({ id: z.string() }),
  output: z.object({
    verdict: z.string().optional(),
    error: z.string().optional(),
  }),
});

export const reviewSendRpc = defineRpc({
  name: "todo.review_send",
  input: z.object({ id: z.string() }),
  output: z.object({
    ok: z.boolean(),
    target: z.string().optional(),
    error: z.string().optional(),
  }),
});

export const reviewAbortRpc = defineRpc({
  name: "todo.review_abort",
  input: z.object({ id: z.string() }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    error: z.string().optional(),
  }),
});

export const reviewContinueRpc = defineRpc({
  name: "todo.review_continue",
  input: z.object({
    id: z.string(),
    task: z.string().optional(),
    targetAgentId: z.string().optional(),
  }),
  output: z.object({
    ok: z.boolean(),
    error: z.string().optional(),
  }),
});

export const reviewTemplateRpc = defineRpc({
  name: "todo.review_template",
  input: z.object({
    // multi 赛马向导词 / single 评审向导词 / send 整改向导词
    // initial 开场向导词（普通）/ initialRace 赛马开场向导词 / initialCommittee 委员会开场向导词
    kind: z.enum([
      "multi",
      "single",
      "send",
      "initial",
      "initialRace",
      "initialCommittee",
    ]),
    name: z.string().optional(),
    newName: z.string().optional(),
    text: z.string().optional(),
  }),
  output: z.object({
    text: z.string().optional(),
    name: z.string().optional(),
    error: z.string().optional(),
  }),
});

export const listInitialPromptsRpc = defineRpc({
  name: "todo.list_initial_prompts",
  input: z.object({}),
  output: z.object({
    prompts: z.array(
      z.object({
        name: z.string(),
        text: z.string(),
      }),
    ),
    selected: z.string().optional(),
    error: z.string().optional(),
  }),
});

export const deleteInitialPromptRpc = defineRpc({
  name: "todo.delete_initial_prompt",
  input: z.object({
    name: z.string(),
  }),
  output: z.object({
    ok: z.boolean(),
    error: z.string().optional(),
  }),
});

// 开场向导词按模式分三份：普通 / 赛马 / 委员会。
// 谁优先只有这一处说了算（赛马优先），界面挑哪份编辑、派马挑哪份拼，都走它，避免两边判得不一样
export function initialKindOf(
  race: boolean,
  committee: boolean,
): "initial" | "initialRace" | "initialCommittee" {
  if (race) return "initialRace";
  if (committee) return "initialCommittee";
  return "initial";
}

export const removeWorktreeRpc = defineRpc({
  name: "todo.remove_worktree",
  input: z.object({
    id: z.string(),
    workspaceId: z.string(),
  }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    error: z.string().optional(),
  }),
});

// 按匹马划掉名单里的一条（马的号认马：开跑时发一次、只增不减、不复用，会话号可能没记上）。
// 只有它独占、且不是主工作区的工作区才顺手关，共用 / 主工作区只抹名单——幽灵马（真身早没了）就靠这条清。
export const removeHorseRpc = defineRpc({
  name: "todo.remove_horse",
  input: z.object({
    id: z.string(),
    no: z.number().int(),
  }),
  output: z.object({
    ok: z.boolean(),
    todo: todoSchema.nullable(),
    error: z.string().optional(),
  }),
});

export function branchFromTitle(title: string): string {
  const sliced = title.trim().slice(0, 20);
  const cleaned = sliced
    .replace(/[\s~^:?*\[\\/@{}]+|\/\/+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned || `todo-${Date.now().toString(36)}`;
}

export function primaryAgent(agents: AgentRef[]): AgentRef {
  return agents[0] ?? { provider: "" };
}

/** 这匹马自己那个会话（终端型马就是终端号）。 */
export function horseSession(a: AgentRef): string | undefined {
  return a.agentId ?? a.terminalId;
}

/** 这个会话是不是这匹马的。 */
export function isHorseSession(a: AgentRef, sessionId: string): boolean {
  return a.agentId === sessionId || a.terminalId === sessionId;
}

/** 按会话号在名单里找那匹马。 */
export function horseBySession(
  agents: AgentRef[] | undefined,
  sessionId: string,
): AgentRef | undefined {
  return (agents ?? []).find((a) => isHorseSession(a, sessionId));
}

/** 名单里还挂着会话的马（还没收工）；空＝这单的活都干完了。 */
export function pendingSessions(agents: AgentRef[] | undefined): string[] {
  return (agents ?? [])
    .map((a) => horseSession(a))
    .filter((id): id is string => Boolean(id));
}

/** 名单里第一匹开过会话的马（卡片跳转用）。 */
export function firstHorse(agents: AgentRef[] | undefined): AgentRef | undefined {
  return (agents ?? []).find((a) => a.agentId || a.terminalId);
}

/** 这个 provider 开出来的是终端（agy 只能跑终端，没有会话号）。 */
export function isTerminalProvider(provider: string): boolean {
  const p = provider.trim().toLowerCase();
  return p === "antigravity cli" || p === "agy";
}

/** 委员会模式默认用的技能：界面替用户勾进技能框，发马时按技能框里选的走。 */
export const COMMITTEE_SKILL = "paseo-committee";
