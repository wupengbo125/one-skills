import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import {
  Icon,
  Modal,
  TextInput,
  useToast,
} from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  addTodoRpc,
  createIssueRpc,
  fetchIssueRpc,
  listIssuesRpc,
  listModelsRpc,
  listProjectsRpc,
  listProvidersRpc,
  listTodosRpc,
  listWorkspacesRpc,
  removeTodoRpc,
  startTodoRpc,
  updateTodoRpc,
  type AgentRef,
  type Todo,
} from "../shared/todo";

type SourceFilter = "todo" | "issue";
type Placement = "project" | "workspace";

type RunDraft = {
  id: string;
  title: string;
  prompt: string;
  agents: AgentRef[];
  placement: Placement;
  projectId: string;
  projectName: string;
  projectPath: string;
  isolation: "local" | "worktree";
  workspaceId: string;
  workspaceName: string;
  cwd: string;
  baseBranch: string;
  newBranch: string;
  issueLocked?: boolean;
};

type Picker =
  | null
  | {
      kind: "agent";
      step: "provider" | "model";
      index: number;
      provider: string;
    }
  | { kind: "project" }
  | { kind: "workspace" };

type PickItem = {
  id: string;
  label: string;
  sub?: string;
  selected: boolean;
};

type LiveIssue = {
  repo: string;
  number: number;
  title: string;
  url: string;
  state: string;
  updatedAt?: string;
  body?: string;
  projectPath?: string;
  projectName?: string;
  projectId?: string;
};

function agentLabel(a?: AgentRef): string {
  if (!a?.provider) return "选择 Provider";
  return a.model ? `${a.provider} / ${a.model}` : `${a.provider} / 默认`;
}

function emptyRun(id: string, title: string, prompt: string): RunDraft {
  return {
    id,
    title,
    prompt,
    agents: [{ provider: "", model: "" }],
    placement: "project",
    projectId: "",
    projectName: "",
    projectPath: "",
    isolation: "local",
    workspaceId: "",
    workspaceName: "",
    cwd: "",
    baseBranch: "main",
    newBranch: "",
    issueLocked: false,
  };
}

type StableInputProps = {
  initial: string;
  onValue: (v: string) => void;
  style?: any;
  placeholder?: string;
  placeholderTextColor?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  autoCorrect?: boolean;
};

const StableInput = memo(function StableInput({
  initial,
  onValue,
  style,
  placeholder,
  placeholderTextColor,
  multiline,
  autoCapitalize,
  autoCorrect,
}: StableInputProps) {
  const handleChange = useCallback(
    (t: string) => {
      onValue(t);
    },
    [onValue],
  );
  return (
    <TextInput
      style={style}
      defaultValue={initial}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
    />
  );
});

export function TodoSurface({ theme, layout }: PluginSurfaceProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["todos"] });
    qc.invalidateQueries({ queryKey: ["todo-issues"] });
  }, [qc]);

  const listTodos = useRpc(listTodosRpc);
  const addTodo = useRpc(addTodoRpc);
  const updateTodo = useRpc(updateTodoRpc);
  const removeTodo = useRpc(removeTodoRpc);
  const startTodo = useRpc(startTodoRpc);
  const listProviders = useRpc(listProvidersRpc);
  const listModels = useRpc(listModelsRpc);
  const listWorkspaces = useRpc(listWorkspacesRpc);
  const listProjects = useRpc(listProjectsRpc);
  const listIssues = useRpc(listIssuesRpc);
  const fetchIssue = useRpc(fetchIssueRpc);
  const createIssue = useRpc(createIssueRpc);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todo");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [importingRef, setImportingRef] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addPrompt, setAddPrompt] = useState("");
  const [addRepo, setAddRepo] = useState("");
  const [edit, setEdit] = useState<{
    id: string;
    title: string;
    prompt: string;
  } | null>(null);
  const [run, setRun] = useState<RunDraft | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState("");
  const [formGen, setFormGen] = useState(0);

  const closeOverlays = useCallback(() => {
    setAddOpen(false);
    setEdit(null);
    setRun(null);
    setPicker(null);
    setAddTitle("");
    setAddPrompt("");
    setAddRepo("");
  }, []);

  const onAddTitle = useCallback((v: string) => setAddTitle(v), []);
  const onAddPrompt = useCallback((v: string) => setAddPrompt(v), []);
  const onEditTitle = useCallback(
    (v: string) => setEdit((e) => (e ? { ...e, title: v } : e)),
    [],
  );
  const onEditPrompt = useCallback(
    (v: string) => setEdit((e) => (e ? { ...e, prompt: v } : e)),
    [],
  );
  const onRunPrompt = useCallback(
    (v: string) => setRun((d) => (d ? { ...d, prompt: v } : d)),
    [],
  );
  const onSearch = useCallback((v: string) => setSearch(v), []);
  const onBaseBranch = useCallback(
    (v: string) => setRun((d) => (d ? { ...d, baseBranch: v } : d)),
    [],
  );
  const onNewBranch = useCallback(
    (v: string) => setRun((d) => (d ? { ...d, newBranch: v } : d)),
    [],
  );
  const onCwd = useCallback(
    (v: string) => setRun((d) => (d ? { ...d, cwd: v } : d)),
    [],
  );

  const todosQ = useQuery({
    queryKey: ["todos"],
    queryFn: () => listTodos({}),
  });
  const providersQ = useQuery({
    queryKey: ["todo-providers"],
    queryFn: () => listProviders({}),
    staleTime: 60_000,
  });
  const workspacesQ = useQuery({
    queryKey: ["todo-workspaces"],
    queryFn: () => listWorkspaces({}),
    staleTime: 30_000,
  });
  const projectsQ = useQuery({
    queryKey: ["todo-projects"],
    queryFn: () => listProjects({}),
    staleTime: 60_000,
  });
  const issuesQ = useQuery({
    queryKey: ["todo-issues"],
    queryFn: () => listIssues({}),
    staleTime: 30_000,
  });

  const pickerProvider =
    picker?.kind === "agent" && picker.step === "model" ? picker.provider : "";
  const modelsQ = useQuery({
    queryKey: ["todo-models", pickerProvider],
    queryFn: () => listModels({ provider: pickerProvider }),
    enabled: !!run && !!pickerProvider,
  });

  const addM = useMutation({
    mutationFn: (vars: { title: string; prompt: string }) =>
      addTodo({ title: vars.title, prompt: vars.prompt, source: "todo" }),
    onSuccess: () => {
      toast.show("已添加", { variant: "success" });
      closeOverlays();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "添加失败"),
  });

  const createIssueM = useMutation({
    mutationFn: (vars: { repo: string; title: string; body: string }) =>
      createIssue(vars),
    onSuccess: () => {
      toast.show("Issue 已创建", { variant: "success" });
      closeOverlays();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "创建 Issue 失败"),
  });

  const editM = useMutation({
    mutationFn: (vars: { id: string; title: string; prompt: string }) =>
      updateTodo({
        id: vars.id,
        patch: { title: vars.title, prompt: vars.prompt },
      }),
    onSuccess: () => {
      toast.show("已保存", { variant: "success" });
      closeOverlays();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "保存失败"),
  });

  const importIssueM = useMutation({
    mutationFn: async (issue: LiveIssue) => {
      const body = await fetchIssue({
        ref: `${issue.repo}#${issue.number}`,
      }).catch(() => ({
        title: issue.title,
        body: "",
        number: issue.number,
        repo: issue.repo,
        url: issue.url,
      }));
      const res = await addTodo({
        title: body.title || issue.title,
        prompt: body.body || "",
        source: "issue",
        issueRef: `${issue.repo}#${issue.number}`,
        issueUrl: issue.url,
      });
      if (issue.projectPath) {
        await updateTodo({
          id: res.todo.id,
          patch: {
            projectPath: issue.projectPath,
            projectName: issue.projectName ?? "",
            projectId: issue.projectId ?? "",
            isolation: "local",
            workspaceId: "",
            workspaceName: "",
            cwd: "",
          },
        });
        res.todo.projectPath = issue.projectPath;
        res.todo.projectName = issue.projectName;
        res.todo.projectId = issue.projectId;
        res.todo.isolation = "local";
      }
      return res;
    },
    onMutate: (issue) => setImportingRef(`${issue.repo}#${issue.number}`),
    onSettled: () => setImportingRef(null),
    onSuccess: () => {
      toast.show("已存入待办", { variant: "success" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "存入失败"),
  });

  const startM = useMutation({
    mutationFn: async (d: RunDraft) => {
      const placement =
        d.placement === "workspace"
          ? {
              workspaceId: d.workspaceId,
              workspaceName: d.workspaceName,
              projectId: "",
              projectName: "",
              projectPath: "",
              isolation: undefined,
              cwd: "",
            }
          : {
              workspaceId: "",
              workspaceName: "",
              projectId: d.projectId,
              projectName: d.projectName,
              projectPath: d.projectPath,
              isolation: d.projectId || d.projectPath ? d.isolation : undefined,
              cwd: d.projectId || d.projectPath ? "" : d.cwd.trim(),
            };
      return startTodo({
        id: d.id,
        agents: d.agents,
        prompt: d.prompt,
        ...placement,
        baseBranch: d.baseBranch.trim(),
        newBranch: d.newBranch.trim(),
      });
    },
    onSuccess: (res) => {
      if (res.ok) {
        toast.show("已开跑 🚀", { variant: "success" });
        setRun(null);
        setPicker(null);
      } else {
        toast.error(res.error || "启动失败");
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "启动失败"),
  });

  const statusM = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "pending" | "done" | "failed";
    }) => updateTodo({ id, patch: { status } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message || "更新失败"),
  });

  const delM = useMutation({
    mutationFn: (id: string) => removeTodo({ id }),
    onSuccess: () => {
      toast.show("已删除", { variant: "info" });
      invalidate();
    },
  });

  const todos: Todo[] = todosQ.data?.todos ?? [];
  const allIssues: LiveIssue[] = issuesQ.data?.issues ?? [];
  const repos = issuesQ.data?.repos ?? [];

  const filteredTodos = todos;

  const savedIssueRefs = new Set(
    todos.filter((t) => t.issueRef).map((t) => t.issueRef),
  );
  const liveIssues =
    sourceFilter === "todo"
      ? []
      : allIssues.filter((i) => {
          if (repoFilter && i.repo !== repoFilter) return false;
          return true;
        });

  const s = useMemo(() => {
    const input = {
      backgroundColor: theme.colors.surface0,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 10,
      color: theme.colors.foreground,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
      width: "100%" as const,
    };
    return {
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      body: { padding: layout.compact ? 16 : 24, gap: 14, paddingBottom: 32 },
      toolbar: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        marginBottom: 2,
      },
      filters: {
        flexDirection: "row" as const,
        gap: 8,
        flex: 1,
        flexWrap: "nowrap" as const,
      },
      filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      filterOn: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
      },
      filterText: { color: theme.colors.foregroundMuted, fontSize: 13 },
      filterTextOn: {
        color: theme.colors.accentForeground,
        fontWeight: "600" as const,
      },
      addBtn: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 5,
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: 999,
      },
      addText: {
        color: theme.colors.accentForeground,
        fontWeight: "700" as const,
        fontSize: 13,
      },
      section: {
        color: theme.colors.foregroundMuted,
        fontSize: 11,
        fontWeight: "700" as const,
        letterSpacing: 0.6,
        textTransform: "uppercase" as const,
        marginTop: 6,
        marginBottom: -4,
      },
      card: {
        backgroundColor: theme.colors.surface1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 14,
        gap: 10,
      },
      cardRunning: { borderColor: theme.colors.accent },
      cardFailed: { borderColor: theme.colors.statusDanger },
      cardDone: { opacity: 0.72 },
      cardTop: {
        flexDirection: "row" as const,
        alignItems: "flex-start" as const,
        gap: 12,
      },
      check: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        marginTop: 2,
      },
      checkDone: {
        backgroundColor: theme.colors.statusSuccess,
        borderColor: theme.colors.statusSuccess,
      },
      checkRunning: { borderColor: theme.colors.accent },
      checkFailed: { borderColor: theme.colors.statusDanger },
      main: { flex: 1, gap: 6 },
      t: {
        color: theme.colors.foreground,
        fontSize: 15,
        fontWeight: "600" as const,
        lineHeight: 21,
      },
      tDone: {
        textDecorationLine: "line-through" as const,
        color: theme.colors.foregroundMuted,
      },
      meta: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        lineHeight: 17,
      },
      prompt: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        lineHeight: 18,
      },
      err: { color: theme.colors.statusDanger, fontSize: 12 },
      badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        backgroundColor: theme.colors.surface0,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignSelf: "flex-start" as const,
      },
      badgeText: {
        color: theme.colors.foregroundMuted,
        fontSize: 10,
        fontWeight: "700" as const,
        letterSpacing: 0.4,
      },
      actions: {
        flexDirection: "row" as const,
        gap: 8,
        flexWrap: "wrap" as const,
        marginTop: 2,
      },
      btn: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
      },
      btnPrimary: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
      },
      btnDanger: { borderColor: theme.colors.statusDanger },
      btnText: {
        color: theme.colors.foreground,
        fontSize: 12,
        fontWeight: "600" as const,
      },
      btnTextPrimary: { color: theme.colors.accentForeground },
      btnTextDanger: { color: theme.colors.statusDanger },
      label: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        marginBottom: 6,
      },
      input,
      inputMulti: {
        ...input,
        minHeight: 110,
        textAlignVertical: "top" as const,
      },
      row: { flexDirection: "row" as const, gap: 12 },
      seg: { flexDirection: "row" as const, gap: 8, marginBottom: 8 },
      segBtn: {
        flex: 1,
        padding: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: "center" as const,
        backgroundColor: theme.colors.surface0,
      },
      segOn: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
      },
      segText: { color: theme.colors.foreground, fontSize: 13 },
      segTextOn: {
        color: theme.colors.accentForeground,
        fontWeight: "600" as const,
      },
      empty: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
        paddingVertical: 14,
        textAlign: "center" as const,
      },
      saveBtn: {
        backgroundColor: theme.colors.accent,
        padding: 15,
        borderRadius: 12,
        alignItems: "center" as const,
        opacity:
          addM.isPending ||
          startM.isPending ||
          createIssueM.isPending ||
          editM.isPending
            ? 0.6
            : 1,
      },
      saveText: {
        color: theme.colors.accentForeground,
        fontWeight: "700" as const,
        fontSize: 15,
      },
      scrollBody: { gap: 16 },
      pathText: { color: theme.colors.foregroundMuted, fontSize: 11 },
      formSection: { gap: 8 },
      formSectionTitle: {
        color: theme.colors.foreground,
        fontSize: 13,
        fontWeight: "600" as const,
      },
      chip: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
      },
      chipText: {
        color: theme.colors.foreground,
        fontSize: 14,
        fontWeight: "600" as const,
      },
      chipMuted: { color: theme.colors.foregroundMuted, fontSize: 14 },
      agentRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
      },
      agentChip: { flex: 1 },
      iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      addAgent: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
        borderWidth: 1,
        borderStyle: "dashed" as const,
        borderColor: theme.colors.accent,
        borderRadius: 10,
        paddingVertical: 11,
        backgroundColor: theme.colors.surface1,
      },
      addAgentText: {
        color: theme.colors.accent,
        fontSize: 13,
        fontWeight: "600" as const,
      },
      pickItem: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface0,
        gap: 8,
      },
      pickItemOn: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
      },
      pickMain: { flex: 1, gap: 2 },
      pickText: {
        color: theme.colors.foreground,
        fontSize: 15,
        fontWeight: "600" as const,
      },
      pickTextOn: { color: theme.colors.accentForeground },
      pickSub: { color: theme.colors.foregroundMuted, fontSize: 11 },
      pickSubOn: { color: theme.colors.accentForeground, opacity: 0.85 },
      pickCheck: {
        color: theme.colors.accentForeground,
        fontSize: 16,
        fontWeight: "700" as const,
      },
      pickHeader: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        marginBottom: 4,
      },
      pickTitle: {
        color: theme.colors.foreground,
        fontSize: 15,
        fontWeight: "700" as const,
        flex: 1,
      },
      pickBack: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      pickBackText: {
        color: theme.colors.foreground,
        fontSize: 12,
        fontWeight: "600" as const,
      },
      pickList: { gap: 8 },
      issueRow: {
        gap: 8,
        flexDirection: "row" as const,
        alignItems: "center" as const,
      },
      repoFilter: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      repoFilterOn: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
      },
      repoText: { color: theme.colors.foregroundMuted, fontSize: 12 },
      repoTextOn: {
        color: theme.colors.accentForeground,
        fontWeight: "600" as const,
      },
    };
  }, [theme, layout.compact]);

  function openAdd() {
    setEdit(null);
    setRun(null);
    setPicker(null);
    setAddTitle("");
    setAddPrompt("");
    setAddRepo(repoFilter || repos[0] || "");
    setFormGen((g) => g + 1);
    setAddOpen(true);
  }

  function openEdit(t: Todo) {
    setAddOpen(false);
    setRun(null);
    setPicker(null);
    setFormGen((g) => g + 1);
    setEdit({ id: t.id, title: t.title, prompt: t.prompt ?? "" });
  }

  function openRun(t: Todo) {
    setAddOpen(false);
    setEdit(null);
    const agents =
      t.agents?.length && t.agents.some((a) => a.provider)
        ? t.agents
        : [{ provider: "", model: "" }];
    const d = emptyRun(t.id, t.title, t.prompt ?? "");
    d.agents = agents;
    d.placement = t.workspaceId ? "workspace" : "project";
    d.projectId = t.projectId ?? "";
    d.projectName = t.projectName ?? "";
    d.projectPath = t.projectPath ?? "";
    d.isolation = t.isolation ?? "local";
    d.workspaceId = t.workspaceId ?? "";
    d.workspaceName = t.workspaceName ?? "";
    d.cwd = t.cwd ?? "";
    d.baseBranch = t.baseBranch ?? "main";
    d.newBranch = t.newBranch ?? "";
    d.issueLocked = t.source === "issue" && Boolean(t.projectPath);
    setPicker(null);
    setSearch("");
    setFormGen((g) => g + 1);
    setRun(d);
  }

  function onRun() {
    if (!run) return;
    if (!run.prompt.trim()) return toast.error("提示词必填");
    if (!run.agents.length || !run.agents.every((a) => a.provider.trim())) {
      return toast.error("每个 Agent 都要选 Provider");
    }
    if (run.issueLocked) {
      if (!run.projectPath) return toast.error("缺少 Issue 所属项目路径");
    } else if (run.placement === "workspace") {
      if (!run.workspaceId) return toast.error("选一个 Workspace");
    } else {
      if (!run.projectId && !run.projectPath && !run.cwd.trim()) {
        return toast.error("选一个项目（目录）");
      }
      if (run.isolation === "worktree" && !run.projectId && !run.projectPath) {
        return toast.error("Worktree 需要先选项目");
      }
    }
    startM.mutate(run);
  }

  function openPicker(next: Picker) {
    setSearch("");
    setFormGen((g) => g + 1);
    setPicker(next);
  }

  function updateAgent(index: number, patch: Partial<AgentRef>) {
    setRun((d) =>
      d
        ? {
            ...d,
            agents: d.agents.map((a, i) =>
              i === index ? { ...a, ...patch } : a,
            ),
          }
        : d,
    );
  }

  function filtered(items: PickItem[]): PickItem[] {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.sub ?? "").toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    );
  }

  function renderPickList(items: PickItem[], onPick: (item: PickItem) => void) {
    const list = filtered(items);
    if (list.length === 0) {
      return <Text style={s.empty}>没有匹配「{search}」</Text>;
    }
    return (
      <ScrollView contentContainerStyle={s.pickList}>
        {list.map((item) => (
          <Pressable
            key={item.id}
            style={[s.pickItem, item.selected && s.pickItemOn]}
            onPress={() => onPick(item)}
          >
            <View style={s.pickMain}>
              <Text
                style={[s.pickText, item.selected && s.pickTextOn]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
              {item.sub ? (
                <Text
                  style={[s.pickSub, item.selected && s.pickSubOn]}
                  numberOfLines={1}
                >
                  {item.sub}
                </Text>
              ) : null}
            </View>
            {item.selected ? <Text style={s.pickCheck}>✓</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  function renderPickerBody() {
    if (!picker || !run) return null;
    const q = (
      <StableInput
        key={`picker-search-${formGen}`}
        style={s.input}
        initial=""
        onValue={onSearch}
        placeholder="搜索…"
        placeholderTextColor={theme.colors.foregroundMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
    );

    if (picker.kind === "project") {
      const items: PickItem[] = (projectsQ.data?.projects ?? []).map((p) => ({
        id: p.id,
        label: p.name,
        sub: `${p.path} · ${p.kind}`,
        selected: run.projectId === p.id,
      }));
      return (
        <View style={{ gap: 12 }}>
          <View style={s.pickHeader}>
            <Pressable style={s.pickBack} onPress={() => setPicker(null)}>
              <Text style={s.pickBackText}>← 返回</Text>
            </Pressable>
            <Text style={s.pickTitle}>选择项目</Text>
          </View>
          {q}
          {renderPickList(items, (item) => {
            const p = (projectsQ.data?.projects ?? []).find(
              (x) => x.id === item.id,
            );
            if (!p) return;
            setRun((d) =>
              d
                ? {
                    ...d,
                    projectId: p.id,
                    projectName: p.name,
                    projectPath: p.path,
                    workspaceId: "",
                    workspaceName: "",
                    cwd: "",
                  }
                : d,
            );
            setPicker(null);
          })}
        </View>
      );
    }

    if (picker.kind === "workspace") {
      const items: PickItem[] = (workspacesQ.data?.workspaces ?? []).map(
        (w) => ({
          id: w.id,
          label: w.name,
          sub: w.directory,
          selected: run.workspaceId === w.id,
        }),
      );
      return (
        <View style={{ gap: 12 }}>
          <View style={s.pickHeader}>
            <Pressable style={s.pickBack} onPress={() => setPicker(null)}>
              <Text style={s.pickBackText}>← 返回</Text>
            </Pressable>
            <Text style={s.pickTitle}>选择 Workspace</Text>
          </View>
          {q}
          {renderPickList(items, (item) => {
            const w = (workspacesQ.data?.workspaces ?? []).find(
              (x) => x.id === item.id,
            );
            if (!w) return;
            setRun((d) =>
              d
                ? {
                    ...d,
                    workspaceId: w.id,
                    workspaceName: w.name,
                    projectId: "",
                    projectName: "",
                    projectPath: "",
                    cwd: "",
                  }
                : d,
            );
            setPicker(null);
          })}
        </View>
      );
    }

    if (picker.step === "provider") {
      const idx = picker.index;
      const current = run.agents[idx];
      const items: PickItem[] = (providersQ.data?.providers ?? []).map((p) => ({
        id: p.id,
        label: p.id,
        selected: current?.provider === p.id,
      }));
      return (
        <View style={{ gap: 12 }}>
          <View style={s.pickHeader}>
            <Pressable style={s.pickBack} onPress={() => setPicker(null)}>
              <Text style={s.pickBackText}>← 返回</Text>
            </Pressable>
            <Text style={s.pickTitle}>Agent #{idx + 1} · Provider</Text>
          </View>
          {q}
          {renderPickList(items, (item) => {
            setPicker({
              kind: "agent",
              step: "model",
              index: idx,
              provider: item.id,
            });
            setSearch("");
            setFormGen((g) => g + 1);
          })}
          {(providersQ.data?.providers ?? []).length === 0 ? (
            <Text style={s.empty}>无可用 provider</Text>
          ) : null}
        </View>
      );
    }

    const idx = picker.index;
    const current = run.agents[idx];
    const models = modelsQ.data?.models ?? [];
    const items: PickItem[] = [
      {
        id: "__default__",
        label: "默认模型",
        sub: picker.provider,
        selected: !current?.model,
      },
      ...models.map((m) => ({
        id: m.id,
        label: m.label,
        sub: m.id,
        selected: current?.model === m.id,
      })),
    ];
    return (
      <View style={{ gap: 12 }}>
        <View style={s.pickHeader}>
          <Pressable
            style={s.pickBack}
            onPress={() =>
              setPicker({
                kind: "agent",
                step: "provider",
                index: idx,
                provider: "",
              })
            }
          >
            <Text style={s.pickBackText}>← Provider</Text>
          </Pressable>
          <Text style={s.pickTitle}>{picker.provider} · 模型</Text>
        </View>
        {q}
        {modelsQ.isLoading ? <Text style={s.empty}>加载模型…</Text> : null}
        {renderPickList(items, (item) => {
          updateAgent(idx, {
            provider: picker.provider,
            model: item.id === "__default__" ? "" : item.id,
          });
          setPicker(null);
        })}
      </View>
    );
  }

  const runModalTitle = picker
    ? picker.kind === "project"
      ? "选择项目"
      : picker.kind === "workspace"
        ? "选择 Workspace"
        : picker.step === "provider"
          ? "选择 Provider"
          : "选择模型"
    : "开跑配置";

  function metaLine(t: Todo): string {
    const agents = t.agents?.filter((a) => a.provider) ?? [];
    const agentText =
      agents.length > 1
        ? `${agents.length} Agent`
        : agents[0]
          ? agentLabel(agents[0])
          : "";
    const parts = agentText ? [agentText] : [];
    if (t.source === "issue" && t.issueRef) parts.push(t.issueRef);
    if (t.workspaceName) parts.push(t.workspaceName);
    else if (t.projectName || t.projectPath) {
      const iso = t.isolation === "worktree" ? "worktree" : "local";
      parts.push(`${t.projectName || t.projectPath} · ${iso}`);
    } else if (t.cwd) parts.push(t.cwd);
    if (t.status === "running") parts.push("运行中");
    if (t.status === "done") parts.push("完成");
    if (t.status === "failed") parts.push("失败");
    return parts.join("  ·  ");
  }

  function renderTodoCard(t: Todo) {
    const isRunning = t.status === "running";
    const isFailed = t.status === "failed";
    const isDone = t.status === "done";
    const agentCount = t.agents?.filter((a) => a.provider).length ?? 0;
    return (
      <View
        key={t.id}
        style={[
          s.card,
          isRunning && s.cardRunning,
          isFailed && s.cardFailed,
          isDone && s.cardDone,
        ]}
      >
        <View style={s.cardTop}>
          <Pressable
            accessibilityRole="button"
            style={[
              s.check,
              isDone && s.checkDone,
              isRunning && s.checkRunning,
              isFailed && s.checkFailed,
            ]}
            onPress={() => {
              if (isDone) statusM.mutate({ id: t.id, status: "pending" });
              else if (!isRunning) statusM.mutate({ id: t.id, status: "done" });
            }}
          >
            {isDone ? (
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                ✓
              </Text>
            ) : isRunning ? (
              <Text style={{ color: theme.colors.accent, fontSize: 10 }}>
                ●
              </Text>
            ) : isFailed ? (
              <Text style={{ color: theme.colors.statusDanger, fontSize: 12 }}>
                !
              </Text>
            ) : null}
          </Pressable>
          <Pressable
            style={s.main}
            onPress={() => openEdit(t)}
            accessibilityRole="button"
          >
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <Text
                style={[s.t, isDone && s.tDone, { flex: 1 }]}
                numberOfLines={2}
              >
                {t.title}
              </Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {t.source === "issue" ? "ISSUE" : "待办"}
                </Text>
              </View>
            </View>
            <Text style={s.meta}>{metaLine(t)}</Text>
            {isFailed && t.error ? (
              <Text style={s.err}>❌ {t.error}</Text>
            ) : null}
          </Pressable>
        </View>

        {!isDone && (
          <View style={s.actions}>
            {!isRunning && (
              <Pressable
                style={[s.btn, s.btnPrimary]}
                onPress={() => openRun(t)}
                disabled={startM.isPending}
              >
                <Icon
                  name="Play"
                  size={12}
                  color={theme.colors.accentForeground}
                />
                <Text style={[s.btnText, s.btnTextPrimary]}>
                  {agentCount > 1 ? `开跑 ×${agentCount}` : "开跑"}
                </Text>
              </Pressable>
            )}
            {isRunning && (
              <Pressable
                style={s.btn}
                onPress={() => statusM.mutate({ id: t.id, status: "done" })}
              >
                <Text style={s.btnText}>标完成</Text>
              </Pressable>
            )}
            {isFailed && (
              <Pressable
                style={s.btn}
                onPress={() => statusM.mutate({ id: t.id, status: "pending" })}
              >
                <Text style={s.btnText}>重置</Text>
              </Pressable>
            )}
            <Pressable
              style={[s.btn, s.btnDanger]}
              onPress={() => delM.mutate(t.id)}
            >
              <Text style={[s.btnText, s.btnTextDanger]}>删除</Text>
            </Pressable>
          </View>
        )}

        {isDone && (
          <View style={s.actions}>
            <Pressable
              style={s.btn}
              onPress={() => statusM.mutate({ id: t.id, status: "pending" })}
            >
              <Text style={s.btnText}>恢复未完成</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnDanger]}
              onPress={() => delM.mutate(t.id)}
            >
              <Text style={[s.btnText, s.btnTextDanger]}>删除</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  function renderIssueRow(issue: LiveIssue) {
    const ref = `${issue.repo}#${issue.number}`;
    const saved = savedIssueRefs.has(ref);
    const importing = importingRef === ref;
    return (
      <View key={ref} style={s.card}>
        <View style={s.cardTop}>
          <View style={s.main}>
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <Text style={[s.t, { flex: 1 }]} numberOfLines={2}>
                {issue.title}
              </Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>ISSUE</Text>
              </View>
            </View>
            <Text style={s.meta}>
              {ref}
              {issue.updatedAt ? `  ·  ${issue.updatedAt.slice(0, 10)}` : ""}
            </Text>
          </View>
        </View>
        <View style={s.actions}>
          <Pressable
            style={[s.btn, !saved && s.btnPrimary]}
            onPress={() => importIssueM.mutate(issue)}
            disabled={saved || importing}
          >
            {!saved && (
              <Icon
                name="Plus"
                size={12}
                color={theme.colors.accentForeground}
              />
            )}
            <Text
              style={[
                s.btnText,
                !saved && s.btnTextPrimary,
                saved && { color: theme.colors.foregroundMuted },
              ]}
            >
              {saved ? "已存入" : importing ? "存入中…" : "存入待办"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const pendingTodos = filteredTodos.filter(
    (t) =>
      t.status === "pending" || t.status === "running" || t.status === "failed",
  );
  const doneTodos = filteredTodos.filter((t) => t.status === "done");

  const modalOpen = addOpen || edit !== null || run !== null;
  const isIssueAdd = addOpen && sourceFilter === "issue";
  const canSubmitAdd = isIssueAdd
    ? Boolean(addTitle.trim() && addRepo && !createIssueM.isPending)
    : Boolean(addTitle.trim() && !addM.isPending);
  const canSaveEdit = Boolean(edit && edit.title.trim() && !editM.isPending);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.toolbar}>
          <View style={s.filters}>
            {(
              [
                ["todo", "待办"],
                ["issue", "GitHub Issue"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                style={[s.filterBtn, sourceFilter === id && s.filterOn]}
                onPress={() => setSourceFilter(id)}
              >
                <Text
                  style={[s.filterText, sourceFilter === id && s.filterTextOn]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={s.addBtn}
            onPress={openAdd}
            accessibilityRole="button"
          >
            <Icon name="Plus" size={16} color={theme.colors.accentForeground} />
            <Text style={s.addText}>添加</Text>
          </Pressable>
        </View>

        {sourceFilter !== "todo" && repos.length > 0 ? (
          <ScrollView
            horizontal
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 8, flexDirection: "row" }}
            showsHorizontalScrollIndicator={false}
          >
            <Pressable
              style={[s.repoFilter, !repoFilter && s.repoFilterOn]}
              onPress={() => setRepoFilter("")}
            >
              <Text style={[s.repoText, !repoFilter && s.repoTextOn]}>
                全部仓库
              </Text>
            </Pressable>
            {repos.map((r) => (
              <Pressable
                key={r}
                style={[s.repoFilter, repoFilter === r && s.repoFilterOn]}
                onPress={() => setRepoFilter(r)}
              >
                <Text style={[s.repoText, repoFilter === r && s.repoTextOn]}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {sourceFilter === "todo" ? (
          <>
            <Text style={s.section}>待办 · 未完成 ({pendingTodos.length})</Text>
            {pendingTodos.length === 0 ? (
              <Text style={s.empty}>没有未完成待办。点「添加」。</Text>
            ) : (
              pendingTodos.map(renderTodoCard)
            )}
            {doneTodos.length > 0 ? (
              <>
                <Text style={s.section}>已完成 ({doneTodos.length})</Text>
                {doneTodos.map(renderTodoCard)}
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={s.section}>GitHub Issues ({liveIssues.length})</Text>
            {issuesQ.isLoading ? (
              <Text style={s.empty}>加载 Issue…</Text>
            ) : liveIssues.length === 0 ? (
              <Text style={s.empty}>
                {issuesQ.data?.error ||
                  "没有 Issue。检查本地仓库是否配了 GitHub remote。"}
              </Text>
            ) : (
              liveIssues.map(renderIssueRow)
            )}
          </>
        )}

        {issuesQ.data?.error && sourceFilter !== "todo" ? (
          <Text style={s.err}>⚠ {issuesQ.data.error}</Text>
        ) : null}
      </ScrollView>

      <Modal
        title={
          edit
            ? "编辑"
            : addOpen
              ? isIssueAdd
                ? "新建 Issue"
                : "添加"
              : runModalTitle
        }
        icon={
          <Icon name="ListTodo" size={18} color={theme.colors.foreground} />
        }
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeOverlays();
        }}
      >
        <Modal.Content>
          {edit ? (
            <View style={s.scrollBody}>
              <View>
                <Text style={s.label}>标题 *</Text>
                <StableInput
                  key={`edit-title-${edit.id}-${formGen}`}
                  style={s.input}
                  initial={edit.title}
                  onValue={onEditTitle}
                  placeholder="标题"
                  placeholderTextColor={theme.colors.foregroundMuted}
                />
              </View>
              <View>
                <Text style={s.label}>内容</Text>
                <StableInput
                  key={`edit-prompt-${edit.id}-${formGen}`}
                  style={s.inputMulti}
                  initial={edit.prompt}
                  onValue={onEditPrompt}
                  placeholder="说明、验收标准…（可空）"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  multiline
                />
              </View>
              <Pressable
                style={s.saveBtn}
                onPress={() => {
                  if (!edit || !edit.title.trim())
                    return toast.error("标题必填");
                  editM.mutate({
                    id: edit.id,
                    title: edit.title.trim(),
                    prompt: edit.prompt,
                  });
                }}
                disabled={!canSaveEdit}
              >
                <Text style={s.saveText}>
                  {editM.isPending ? "保存中…" : "保存"}
                </Text>
              </Pressable>
            </View>
          ) : addOpen ? (
            <View style={s.scrollBody}>
              <View>
                <Text style={s.label}>标题 *</Text>
                <StableInput
                  key={`add-title-${formGen}`}
                  style={s.input}
                  initial=""
                  onValue={onAddTitle}
                  placeholder={isIssueAdd ? "Issue 标题" : "要做什么"}
                  placeholderTextColor={theme.colors.foregroundMuted}
                />
              </View>
              {isIssueAdd ? (
                <View style={s.formSection}>
                  <Text style={s.label}>仓库 *</Text>
                  <ScrollView
                    horizontal
                    style={{ flexGrow: 0 }}
                    contentContainerStyle={{ gap: 8, flexDirection: "row" }}
                    showsHorizontalScrollIndicator={false}
                  >
                    {(issuesQ.data?.repos ?? []).map((r) => (
                      <Pressable
                        key={r}
                        style={[s.repoFilter, addRepo === r && s.repoFilterOn]}
                        onPress={() => setAddRepo(r)}
                      >
                        <Text
                          style={[s.repoText, addRepo === r && s.repoTextOn]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  {(issuesQ.data?.repos ?? []).length === 0 ? (
                    <Text style={s.empty}>没有可用 GitHub 仓库</Text>
                  ) : null}
                </View>
              ) : null}
              <View>
                <Text style={s.label}>内容</Text>
                <StableInput
                  key={`add-prompt-${formGen}`}
                  style={s.inputMulti}
                  initial=""
                  onValue={onAddPrompt}
                  placeholder={
                    isIssueAdd
                      ? "Issue 正文（可空）"
                      : "说明、验收标准…（可空）"
                  }
                  placeholderTextColor={theme.colors.foregroundMuted}
                  multiline
                />
              </View>
              <Pressable
                style={s.saveBtn}
                onPress={() => {
                  const t = addTitle.trim();
                  if (!t) return toast.error("标题必填");
                  if (isIssueAdd) {
                    if (!addRepo) return toast.error("选一个仓库");
                    createIssueM.mutate({
                      repo: addRepo,
                      title: t,
                      body: addPrompt,
                    });
                  } else {
                    addM.mutate({ title: t, prompt: addPrompt });
                  }
                }}
                disabled={!canSubmitAdd}
              >
                <Text style={s.saveText}>
                  {isIssueAdd
                    ? createIssueM.isPending
                      ? "创建中…"
                      : "添加"
                    : addM.isPending
                      ? "添加中…"
                      : "添加"}
                </Text>
              </Pressable>
            </View>
          ) : picker ? (
            renderPickerBody()
          ) : run ? (
            <View style={s.scrollBody}>
              <View>
                <Text style={s.formSectionTitle}>{run.title}</Text>
              </View>

              <View>
                <Text style={s.label}>提示词 *（发给每个 Agent）</Text>
                <StableInput
                  key={`run-prompt-${run.id}-${formGen}`}
                  style={s.inputMulti}
                  initial={run.prompt}
                  onValue={onRunPrompt}
                  placeholder="要做的事、验收标准…"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  multiline
                />
              </View>

              <View style={s.formSection}>
                <Text style={s.formSectionTitle}>在哪跑 *</Text>
                {run.issueLocked ? (
                  <View style={s.formSection}>
                    <Text style={s.label}>项目（来自 Issue 仓库）</Text>
                    <View style={s.chip}>
                      <Text style={s.chipText} numberOfLines={2}>
                        {run.projectName || run.projectPath}
                      </Text>
                    </View>
                    <View style={s.seg}>
                      <Pressable
                        style={[s.segBtn, run.isolation === "local" && s.segOn]}
                        onPress={() => setRun({ ...run, isolation: "local" })}
                      >
                        <Text
                          style={[
                            s.segText,
                            run.isolation === "local" && s.segTextOn,
                          ]}
                        >
                          本地
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          s.segBtn,
                          run.isolation === "worktree" && s.segOn,
                        ]}
                        onPress={() =>
                          setRun({ ...run, isolation: "worktree" })
                        }
                      >
                        <Text
                          style={[
                            s.segText,
                            run.isolation === "worktree" && s.segTextOn,
                          ]}
                        >
                          Worktree
                        </Text>
                      </Pressable>
                    </View>
                    {run.isolation === "worktree" ? (
                      <View style={s.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.label}>基线分支</Text>
                          <StableInput
                            key={`base-branch-${formGen}`}
                            style={s.input}
                            initial={run.baseBranch}
                            onValue={onBaseBranch}
                            placeholder="main"
                            placeholderTextColor={theme.colors.foregroundMuted}
                            autoCapitalize="none"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.label}>新分支名</Text>
                          <StableInput
                            key={`new-branch-${formGen}`}
                            style={s.input}
                            initial={run.newBranch}
                            onValue={onNewBranch}
                            placeholder="feature/xxx"
                            placeholderTextColor={theme.colors.foregroundMuted}
                            autoCapitalize="none"
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <>
                    <View style={s.seg}>
                      <Pressable
                        style={[
                          s.segBtn,
                          run.placement === "project" && s.segOn,
                        ]}
                        onPress={() => setRun({ ...run, placement: "project" })}
                      >
                        <Text
                          style={[
                            s.segText,
                            run.placement === "project" && s.segTextOn,
                          ]}
                        >
                          项目
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          s.segBtn,
                          run.placement === "workspace" && s.segOn,
                        ]}
                        onPress={() =>
                          setRun({ ...run, placement: "workspace" })
                        }
                      >
                        <Text
                          style={[
                            s.segText,
                            run.placement === "workspace" && s.segTextOn,
                          ]}
                        >
                          Workspace
                        </Text>
                      </Pressable>
                    </View>

                    {run.placement === "project" ? (
                      <View style={s.formSection}>
                        <Pressable
                          style={s.chip}
                          onPress={() => openPicker({ kind: "project" })}
                        >
                          <Text
                            style={run.projectId ? s.chipText : s.chipMuted}
                            numberOfLines={1}
                          >
                            {run.projectId
                              ? `${run.projectName} · ${run.projectPath}`
                              : "选择项目…"}
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.foregroundMuted,
                              fontSize: 14,
                            }}
                          >
                            ▾
                          </Text>
                        </Pressable>

                        <View style={s.seg}>
                          <Pressable
                            style={[
                              s.segBtn,
                              run.isolation === "local" && s.segOn,
                            ]}
                            onPress={() =>
                              setRun({ ...run, isolation: "local" })
                            }
                          >
                            <Text
                              style={[
                                s.segText,
                                run.isolation === "local" && s.segTextOn,
                              ]}
                            >
                              本地
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[
                              s.segBtn,
                              run.isolation === "worktree" && s.segOn,
                            ]}
                            onPress={() =>
                              setRun({ ...run, isolation: "worktree" })
                            }
                          >
                            <Text
                              style={[
                                s.segText,
                                run.isolation === "worktree" && s.segTextOn,
                              ]}
                            >
                              Worktree
                            </Text>
                          </Pressable>
                        </View>

                        {run.isolation === "worktree" ? (
                          <View style={s.row}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.label}>基线分支</Text>
                              <StableInput
                                key={`base-branch-${formGen}`}
                                style={s.input}
                                initial={run.baseBranch}
                                onValue={onBaseBranch}
                                placeholder="main"
                                placeholderTextColor={
                                  theme.colors.foregroundMuted
                                }
                                autoCapitalize="none"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.label}>新分支名</Text>
                              <StableInput
                                key={`new-branch-${formGen}`}
                                style={s.input}
                                initial={run.newBranch}
                                onValue={onNewBranch}
                                placeholder="feature/xxx"
                                placeholderTextColor={
                                  theme.colors.foregroundMuted
                                }
                                autoCapitalize="none"
                              />
                            </View>
                          </View>
                        ) : null}

                        {!run.projectId ? (
                          <View>
                            <Text style={s.label}>或手动填路径</Text>
                            <StableInput
                              key={`run-cwd-${formGen}`}
                              style={s.input}
                              initial={run.cwd}
                              onValue={onCwd}
                              placeholder="/home/you/repo"
                              placeholderTextColor={
                                theme.colors.foregroundMuted
                              }
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Pressable
                        style={s.chip}
                        onPress={() => openPicker({ kind: "workspace" })}
                      >
                        <Text
                          style={run.workspaceId ? s.chipText : s.chipMuted}
                          numberOfLines={1}
                        >
                          {run.workspaceId
                            ? run.workspaceName || run.workspaceId
                            : "选择 Workspace…"}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.foregroundMuted,
                            fontSize: 14,
                          }}
                        >
                          ▾
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>

              <View style={s.formSection}>
                <Text style={s.formSectionTitle}>
                  放码（{run.agents.length} 个，多个并行）
                </Text>
                {run.agents.map((a, i) => (
                  <View key={i} style={s.agentRow}>
                    <Pressable
                      style={[s.chip, s.agentChip]}
                      onPress={() =>
                        openPicker({
                          kind: "agent",
                          step: "provider",
                          index: i,
                          provider: "",
                        })
                      }
                    >
                      <Text
                        style={a.provider ? s.chipText : s.chipMuted}
                        numberOfLines={1}
                      >
                        {`#${i + 1}  ${agentLabel(a)}`}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.foregroundMuted,
                          fontSize: 14,
                        }}
                      >
                        ▾
                      </Text>
                    </Pressable>
                    <Pressable
                      style={s.iconBtn}
                      disabled={run.agents.length <= 1}
                      onPress={() =>
                        setRun((d) =>
                          d
                            ? {
                                ...d,
                                agents: d.agents.filter((_, idx) => idx !== i),
                              }
                            : d,
                        )
                      }
                    >
                      <Text
                        style={{
                          color: theme.colors.statusDanger,
                          fontSize: 16,
                          opacity: run.agents.length <= 1 ? 0.3 : 1,
                        }}
                      >
                        ×
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={s.addAgent}
                  onPress={() =>
                    setRun((d) =>
                      d
                        ? {
                            ...d,
                            agents: [...d.agents, { provider: "", model: "" }],
                          }
                        : d,
                    )
                  }
                >
                  <Text style={s.addAgentText}>+ 加一个</Text>
                </Pressable>
              </View>

              <Pressable
                style={s.saveBtn}
                onPress={onRun}
                disabled={startM.isPending}
              >
                <Text style={s.saveText}>
                  {startM.isPending
                    ? "启动中…"
                    : run.agents.length > 1
                      ? `开跑 ×${run.agents.length}`
                      : "开跑"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Modal.Content>
      </Modal>
    </View>
  );
}
