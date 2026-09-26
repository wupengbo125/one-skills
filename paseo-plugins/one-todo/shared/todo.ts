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
  error: z.string().optional(),
  agentIds: z.array(z.string()).optional(),
  terminalIds: z.array(z.string()).optional(),
  pendingAgentIds: z.array(z.string()).optional(),
  worktreeRepo: z.string().optional(),
  worktrees: z
    .array(
      z.object({
        workspaceId: z.string(),
        branch: z.string(),
        dir: z.string().optional(),
        // 这匹马自己的会话号：发回会话直接用，不靠下标对号
        agentId: z.string().optional(),
        terminalId: z.string().optional(),
        provider: z.string().optional(),
        model: z.string().optional(),
      }),
    )
    .optional(),
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
      targetIndex: z.number().int().optional(),
      // 评审结果文件名（标题+评审），记在待办数据里
      verdictFile: z.string().optional(),
    })
    .optional(),
    createdAt: z.string(),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    skills: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
    autoReview: autoReviewSchema.optional(),
  });
  export const preferencesSchema = z.object({
    lastProvider: z.string().optional(),
    lastModel: z.string().optional(),
    lastProjectId: z.string().optional(),
    lastProjectName: z.string().optional(),
    lastProjectPath: z.string().optional(),
    lastIsolation: isolationSchema.optional(),
    lastSkills: z.array(z.string()).optional(),
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
      status: todoStatusSchema.optional(),
      pinned: z.boolean().optional(),
      autoReview: autoReviewSchema.optional(),
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

export const startTodoRpc = defineRpc({
  name: "todo.start",
  input: z.object({
    id: z.string(),
      agents: z.array(agentRefSchema).min(1).optional(),
      prompt: z.string().optional(),
      skills: z.array(z.string()).optional(),
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
    // 审核时指定审哪一匹（候选名单里的位置）；不传就按现在的规则挑
    targetIndex: z.number().int().optional(),
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
  input: z.object({ id: z.string(), task: z.string().optional() }),
  output: z.object({
    ok: z.boolean(),
    error: z.string().optional(),
  }),
});

export const reviewTemplateRpc = defineRpc({
  name: "todo.review_template",
  input: z.object({
    // multi 多匹马评审 / single 一匹马评审 / send 发回时给干活的那句话
    kind: z.enum(["multi", "single", "send"]),
    text: z.string().optional(),
  }),
  output: z.object({
    text: z.string().optional(),
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
