import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import {
  Icon,
  Modal,
  TextInput,
  useToast,
  copyText,
} from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import {
  addTodoRpc,
  createIssueRpc,
  fetchIssueRpc,
  listIssuesRpc,
  listModelsRpc,
  listProjectsRpc,
  listProvidersRpc,
  listSkillsRpc,
  listTodosRpc,
  listWorkspacesRpc,
  removeTodoRpc,
  startTodoRpc,
  updateTodoRpc,
  branchFromTitle,
  type AgentRef,
  type Todo,
  type TodoPreferences,
} from "../shared/todo";

type SourceFilter = "todo" | "issue";

type RunDraft = {
  id: string;
  title: string;
  prompt: string;
  agents: AgentRef[];
  projectId: string;
  projectName: string;
  projectPath: string;
  isolation: "local" | "worktree";
  baseBranch: string;
  newBranch: string;
  skills: string[];
  workspaceId: string;
  workspaceName: string;
  source?: "todo" | "issue";
  issueRef?: string;
  issueUrl?: string;
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
  | { kind: "workspace" }
  | { kind: "skills" };
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
    agents: [],
    projectId: "",
    projectName: "",
    projectPath: "",
    isolation: "worktree",
    baseBranch: "main",
    newBranch: "",
    skills: [],
    workspaceId: "",
    workspaceName: "",
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
  const ref = useRef(initial);
  const handleChange = useCallback(
    (t: string) => {
      ref.current = t;
      onValue(t);
    },
    [onValue],
  );
  return (
    <TextInput
      style={style}
      defaultValue={initial}
      onChangeText={handleChange}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
    />
  );
});
function PulsingPurpleDot() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 4,
      }}
    >
      <Animated.View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: "#a855f7",
          opacity,
        }}
      />
      <Text style={{ fontSize: 9, color: "#a855f7", fontWeight: "600" }}>
        进行中
      </Text>
    </View>
  );
}

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
  const listProjects = useRpc(listProjectsRpc);
  const listWorkspaces = useRpc(listWorkspacesRpc);
  const listIssues = useRpc(listIssuesRpc);
  const fetchIssue = useRpc(fetchIssueRpc);
  const createIssue = useRpc(createIssueRpc);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todo");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [importingRef, setImportingRef] = useState<string | null>(null);
  const [run, setRun] = useState<RunDraft | null>(null);
  const [menuTodo, setMenuTodo] = useState<Todo | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState("");
  const [formGen, setFormGen] = useState(0);

  const closeOverlays = useCallback(() => {
    setRun(null);
    setPicker(null);
  }, []);
  const runTitleRef = useRef("");
  const runPromptRef = useRef("");

  const onRunTitle = useCallback((v: string) => {
    runTitleRef.current = v;
  }, []);

  const onRunPrompt = useCallback((v: string) => {
    runPromptRef.current = v;
  }, []);
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
  const projectsQ = useQuery({
    queryKey: ["todo-projects"],
    queryFn: () => listProjects({}),
    staleTime: 60_000,
  });
  const workspacesQ = useQuery({
    queryKey: ["todo-workspaces"],
    queryFn: () => listWorkspaces({}),
    staleTime: 30_000,
  });
  const issuesQ = useQuery({
    queryKey: ["todo-issues"],
    queryFn: () => listIssues({}),
    staleTime: 30_000,
  });
  const listSkills = useRpc(listSkillsRpc);
  const skillsQ = useQuery({
    queryKey: ["todo-skills"],
    queryFn: () => listSkills({}),
    staleTime: 60_000,
  });

  const pickerProvider =
    picker?.kind === "agent" && picker.step === "model" ? picker.provider : "";
  const modelsQ = useQuery({
    queryKey: ["todo-models", pickerProvider],
    queryFn: () => listModels({ provider: pickerProvider }),
    enabled: !!run && !!pickerProvider,
  });

  const addM = useMutation({
    mutationFn: (vars: Parameters<typeof addTodo>[0]) => addTodo(vars),
    onSuccess: (data) => {
      toast.show("已保存", { variant: "success" });
      invalidate();
      // update run.id if this was a new save so subsequent edits use editM
      if (data?.todo && !run?.id) setRun((d) => d ? { ...d, id: data.todo!.id } : d);
    },
    onError: (e: Error) => toast.error(e.message || "保存失败"),
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
    mutationFn: (vars: { id: string; patch: Parameters<typeof updateTodo>[0]["patch"] }) =>
      updateTodo({
        id: vars.id,
        patch: vars.patch,
      }),
    onSuccess: () => {
      toast.show("已保存", { variant: "success" });
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
      if (d.workspaceId) {
        return startTodo({
          id: d.id,
          agents: d.agents,
          skills: d.skills,
          prompt: d.prompt,
          workspaceId: d.workspaceId,
          workspaceName: d.workspaceName,
        });
      }
      return startTodo({
        id: d.id,
        agents: d.agents,
        skills: d.skills,
        prompt: d.prompt,
        projectId: d.projectId,
        projectName: d.projectName,
        projectPath: d.projectPath,
        isolation: d.isolation,
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
      status: Todo["status"];
    }) => updateTodo({ id, patch: { status } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message || "更新失败"),
  });

  const toggleRunning = useCallback(
    (t: Todo) => {
      const next = t.status === "running" ? "pending" : "running";
      statusM.mutate({ id: t.id, status: next });
    },
    [statusM],
  );
  const delM = useMutation({
    mutationFn: (id: string) => removeTodo({ id }),
    onSuccess: () => {
      toast.show("已删除", { variant: "info" });
      invalidate();
    },
  });
  const preferences: TodoPreferences | undefined = todosQ.data?.preferences;

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
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        marginTop: 1,
        backgroundColor: theme.colors.surface0,
      },
      checkDone: {
        backgroundColor: theme.colors.statusSuccess,
        borderColor: theme.colors.statusSuccess,
      },
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
      pickerOverlay: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.surface0,
        padding: layout.compact ? 16 : 24,
        gap: 12,
        zIndex: 99,
      },
      pickerScroll: {
        flex: 1,
      },
      pickList: { gap: 8 },
      inlinePicker: {
        borderColor: theme.colors.border,
        borderRadius: 10,
        backgroundColor: theme.colors.surface1,
        padding: 10,
        gap: 8,
        marginTop: 6,
      },
      inlinePickerScroll: {
        flexGrow: 0,
      },
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

  function openDetail(t?: Todo, issue?: LiveIssue) {
    setPicker(null);
    const defaultAgent: AgentRef = preferences?.lastProvider
      ? { provider: preferences.lastProvider, model: preferences.lastModel }
      : { provider: "", model: "" };
    const agents =
      t?.agents?.length && t.agents.some((a) => a.provider)
        ? t.agents
        : [defaultAgent];
    const title = t?.title ?? issue?.title ?? "";
    const prompt = t?.prompt ?? issue?.body ?? "";
    const d = emptyRun(t?.id ?? "", title, prompt);
    if (issue) {
      d.source = "issue";
      d.issueRef = `${issue.repo}#${issue.number}`;
      d.issueUrl = issue.url;
      if (issue.projectPath) {
        d.projectPath = issue.projectPath;
        d.projectName = issue.projectName || issue.repo;
        d.projectId = issue.projectId || "";
      }
      d.isolation = "local";
    } else if (t?.projectId || t?.projectPath) {
      d.projectId = t.projectId ?? "";
      d.projectName = t.projectName ?? "";
      d.projectPath = t.projectPath ?? "";
      d.isolation = t.isolation ?? "worktree";
    } else {
      const gh = (projectsQ.data?.projects ?? []).find(
        (p) =>
          p.name.toLowerCase().includes("github") ||
          p.path.toLowerCase().includes("github"),
      );
      if (gh) {
        d.projectId = gh.id;
        d.projectName = gh.name;
        d.projectPath = gh.path;
      }
      d.isolation = "worktree";
    }

    d.agents = agents;
    d.skills = t?.skills ?? [];
    d.baseBranch = t?.baseBranch || "main";
    d.newBranch = t?.newBranch?.trim() || (title ? branchFromTitle(title) : "");
    runTitleRef.current = d.title;
    runPromptRef.current = d.prompt;
    setSearch("");
    setFormGen((g) => g + 1);
    setRun(d);
  }

  function openAdd() {
    openDetail();
  }

  function openEdit(t: Todo) {
    openDetail(t);
  }

  function openRun(t: Todo) {
    openDetail(t);
  }

  function onSaveDraft() {
    if (!run) return;
    const title = runTitleRef.current.trim() || run.title.trim();
    if (!title) return toast.error("标题必填");
    const prompt = runPromptRef.current.trim();
    const agents = run.agents.filter((a) => a.provider.trim());
    if (run.id) {
      editM.mutate({
        id: run.id,
        patch: {
          title,
          prompt,
          skills: run.skills,
          ...(agents.length ? { agents } : {}),
          projectId: run.projectId,
          projectName: run.projectName,
          projectPath: run.projectPath,
          isolation: run.isolation,
          baseBranch: run.baseBranch,
          newBranch: run.newBranch,
        },
      });
    } else {
      addM.mutate({
        title,
        prompt,
        skills: run.skills,
        ...(agents.length ? { agents } : {}),
        projectId: run.projectId,
        projectName: run.projectName,
        projectPath: run.projectPath,
        isolation: run.isolation,
        baseBranch: run.baseBranch,
        newBranch: run.newBranch,
        source: run.source || "todo",
        issueRef: run.issueRef,
        issueUrl: run.issueUrl,
      });
    }
  }

  function onRun() {
    if (!run) return;
    const title = runTitleRef.current.trim() || run.title.trim();
    if (title) run.title = title;
    const prompt = runPromptRef.current.trim();
    if (!prompt) return toast.error("提示词必填");
    run.prompt = prompt;
    if (!run.agents.length || !run.agents.every((a) => a.provider.trim()))
      return toast.error("每个 Agent 都要选 Provider");
    if (!run.workspaceId) {
      if (!run.projectId && !run.projectPath) {
        return toast.error("选一个项目");
      }
      if (run.isolation === "worktree" && !run.projectId && !run.projectPath)
        return toast.error("Worktree 需要先选项目");
      if (run.isolation === "worktree" && !run.newBranch.trim())
        return toast.error("新建分支名不能为空");
    }
    startM.mutate(run);
  }

  function openPicker(next: Picker) {
    setSearch("");
    setPicker(next);
  }

  function updateAgent(index: number, patch: Partial<AgentRef>) {
    setRun((d) => {
      if (!d) return d;
      return {
        ...d,
        agents: d.agents.map((a, i) => (i === index ? { ...a, ...patch } : a)),
      };
    });
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

  function renderPickList(
    items: PickItem[],
    onPick: (item: PickItem) => void,
    scrollStyle?: StyleProp<ViewStyle>,
  ) {
    const list = filtered(items);
    if (list.length === 0) {
      return <Text style={s.empty}>没有匹配「{search}」</Text>;
    }
    return (
      <View style={s.pickList}>
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
      </View>
    );
  }


  const runModalTitle = "开跑配置";

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
          { flexDirection: "row", alignItems: "center", gap: 8 },
          menuTodo?.id === t.id && { zIndex: 1000, elevation: 10 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={s.cardTop}>
            <Pressable
              accessibilityRole="button"
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={{ alignItems: "center", justifyContent: "flex-start", paddingRight: 4 }}
              onPress={(e) => {
                e.stopPropagation();
                const next = isDone ? "pending" : "done";
                statusM.mutate({ id: t.id, status: next });
              }}
            >
              <View
                style={[
                  s.check,
                  isDone && s.checkDone,
                ]}
              >
                {isDone ? (
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                    ✓
                  </Text>
                ) : null}
              </View>
              {isRunning ? <PulsingPurpleDot /> : null}
            </Pressable>
            <Pressable
              style={s.main}
              onPress={() => openEdit(t)}
              accessibilityRole="button"
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                {t.seq ? (
                  <Pressable
                    style={[s.badge, { backgroundColor: theme.colors.surface1 }]}
                    onPress={async (e) => {
                      e.stopPropagation();
                      toggleRunning(t);
                      const text = [
                        `请执行待办任务 #${t.seq}《${t.title}》：`,
                        t.prompt ? `【说明与要求】\n${t.prompt}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n");
                      await copyText(text);
                      toast.show(
                        t.status === "running"
                          ? `已复制指令并恢复未开始`
                          : `已复制指令并设为进行中`,
                        { variant: "success" },
                      );
                    }}
                  >
                    <Text style={[s.badgeText, { color: theme.colors.accent }]}>
                      #{t.seq}
                    </Text>
                  </Pressable>
                ) : null}
                <Text
                  style={[s.t, isDone && s.tDone, { flex: 1 }]}
                  numberOfLines={2}
                >
                  {t.title}
                </Text>
                {t.pinned ? (
                  <View style={[s.badge, { backgroundColor: theme.colors.accent }]}>
                    <Text style={[s.badgeText, { color: theme.colors.accentForeground }]}>
                      置顶
                    </Text>
                  </View>
                ) : null}
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

          {isFailed ? (
            <View style={[s.actions, { marginTop: 4 }]}>
              <Pressable
                style={s.btn}
                onPress={() => statusM.mutate({ id: t.id, status: "pending" })}
              >
                <Text style={s.btnText}>重置</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={{ position: "relative" }}>
          <Pressable
            accessibilityRole="button"
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={(e) => {
              e.stopPropagation();
              setMenuTodo((curr) => (curr?.id === t.id ? null : t));
            }}
          >
            <Text style={{ fontSize: 18, color: theme.colors.foregroundMuted, fontWeight: "700", lineHeight: 18 }}>
              ⋮
            </Text>
          </Pressable>
          {menuTodo?.id === t.id ? (
            <View
              style={{
                position: "absolute",
                right: 0,
                top: 36,
                backgroundColor: theme.colors.surface1,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 4,
                minWidth: 110,
                zIndex: 999,
                elevation: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
              }}
            >
              <Pressable
                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                onPress={(e) => {
                  e.stopPropagation();
                  setMenuTodo(null);
                  editM.mutate({ id: t.id, patch: { pinned: !t.pinned } });
                }}
              >
                <Text style={{ fontSize: 13, color: theme.colors.foreground, fontWeight: "500" }}>
                  {t.pinned ? "取消置顶" : "置顶任务"}
                </Text>
              </Pressable>
              <View style={{ height: 1, backgroundColor: theme.colors.border }} />
              <Pressable
                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                onPress={(e) => {
                  e.stopPropagation();
                  setMenuTodo(null);
                  delM.mutate(t.id);
                }}
              >
                <Text style={{ fontSize: 13, color: theme.colors.statusDanger, fontWeight: "500" }}>
                  删除任务
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  async function onIssueClick(issue: LiveIssue) {
    const ref = `${issue.repo}#${issue.number}`;
    const existing = todos.find((t) => t.issueRef === ref);
    if (existing) {
      openDetail(existing);
    } else {
      const full = await fetchIssue({ ref }).catch(() => null);
      openDetail(undefined, {
        ...issue,
        body: full?.body ?? issue.body ?? "",
        title: full?.title ?? issue.title,
      });
    }
  }
  function renderIssueRow(issue: LiveIssue) {
    const ref = `${issue.repo}#${issue.number}`;
    const saved = savedIssueRefs.has(ref);
    const importing = importingRef === ref;
    return (
      <View key={ref} style={s.card}>
        <View style={s.cardTop}>
          <Pressable
            style={s.main}
            onPress={() => onIssueClick(issue)}
            accessibilityRole="button"
          >
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
          </Pressable>
        </View>
        <View style={s.actions}>
          <Pressable
            style={[s.btn, !saved && s.btnPrimary]}
            onPress={() => importIssueM.mutate(issue)}
            disabled={saved || importing}
          >
            {!saved ? (
              <Icon
                name="Plus"
                size={12}
                color={theme.colors.accentForeground}
              />
            ) : null}
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

  function isToday(iso?: string): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  const pendingTodos = filteredTodos.filter(
    (t) =>
      t.status === "pending" ||
      t.status === "running" ||
      t.status === "failed",
  );
  const doneTodos = filteredTodos.filter(
    (t) => t.status === "done" && isToday(t.finishedAt || t.startedAt),
  );

  const modalOpen = run !== null;

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
        title={run ? (run.source === "issue" ? "配置 Issue 任务" : run.id ? "编辑待办" : "新建待办") : ""}
        icon={
          <Icon name="ListTodo" size={18} color={theme.colors.foreground} />
        }
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeOverlays();
        }}
      >
        <Modal.Content>
          {run ? (
            <View style={s.scrollBody}>
              <View>
                <Text style={s.label}>标题 *</Text>
                <StableInput
                  key={`run-title-${run.id}-${formGen}`}
                  style={s.input}
                  initial={run.title}
                  onValue={onRunTitle}
                  placeholder="要做什么"
                  placeholderTextColor={theme.colors.foregroundMuted}
                />
              </View>
              <View>
                <Text style={s.label}>内容</Text>
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
            <View style={s.formSection}>
              <Pressable
                style={s.chip}
                onPress={() => {
                  setSearch("");
                  setPicker(
                    picker?.kind === "project" ? null : { kind: "project" }
                  );
                }}
              >
                <Text
                  style={
                    run.projectId || run.projectPath
                      ? s.chipText
                      : s.chipMuted
                  }
                  numberOfLines={1}
                >
                  {run.projectId || run.projectPath
                    ? `${run.projectName || run.projectPath} · ${run.projectPath}`
                    : "选择项目…"}
                </Text>
                <Text
                  style={{
                    color: theme.colors.foregroundMuted,
                    fontSize: 14,
                  }}
                >
                  {picker?.kind === "project" ? "▲" : "▼"}
                </Text>
              </Pressable>
              {picker?.kind === "project" ? (
                <View style={s.inlinePicker}>
                  <StableInput
                    key="picker-search-project"
                    style={s.input}
                    initial=""
                    onValue={onSearch}
                    placeholder="搜索项目…"
                    placeholderTextColor={theme.colors.foregroundMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {projectsQ.isLoading ? (
                    <Text style={s.empty}>加载项目中…</Text>
                  ) : (
                    renderPickList(
                      (projectsQ.data?.projects ?? []).map((p) => ({
                        id: p.id,
                        label: p.name,
                        sub: p.path,
                        selected:
                          run.projectId === p.id ||
                          run.projectPath === p.path,
                      })),
                      (item) => {
                        const p = projectsQ.data?.projects.find(
                          (x) => x.id === item.id
                        );
                        if (p) {
                          setRun({
                            ...run,
                            projectId: p.id,
                            projectName: p.name,
                            projectPath: p.path,
                          });
                        }
                        setPicker(null);
                      }
                    )
                  )}
                </View>
              ) : null}

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
                    Local
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
            </View>
          </View>
          <View style={s.formSection}>
            <Text style={s.formSectionTitle}>
              使用技能{run.skills.length ? ` (${run.skills.length} 个已选)` : "（可选，多选）"}
            </Text>
            <Pressable
              style={s.chip}
              onPress={() => {
                setSearch("");
                setPicker({ kind: "skills" });
              }}
            >
              <Text
                style={run.skills.length ? s.chipText : s.chipMuted}
                numberOfLines={1}
              >
                {run.skills.length
                  ? run.skills.join(", ")
                  : "选择技能…"}
              </Text>
              <Text
                style={{
                  color: theme.colors.foregroundMuted,
                  fontSize: 14,
                }}
              >
                ▼
              </Text>
            </Pressable>
          </View>

          <View style={s.formSection}>
            <Text style={s.formSectionTitle}>
              放马（{run.agents.length} 个，多个并行）
            </Text>
            {run.agents.map((a, i) => {
              return (
                <View key={i} style={s.agentRow}>
                  <Pressable
                    style={[s.chip, s.agentChip]}
                    onPress={() => {
                      setSearch("");
                      setPicker({
                        kind: "agent",
                        step: "provider",
                        index: i,
                        provider: a.provider || "",
                      });
                    }}
                  >
                    <Text style={a.provider ? s.chipText : s.chipMuted} numberOfLines={1}>
                      {`#${i + 1}  ${agentLabel(a)}`}
                    </Text>
                    <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                      ▼
                    </Text>
                  </Pressable>
                  <Pressable
                    style={s.iconBtn}
                    disabled={run.agents.length <= 1}
                    onPress={() => {
                      setRun((d) =>
                        d
                          ? {
                              ...d,
                              agents: d.agents.filter(
                                (_, idx) => idx !== i
                              ),
                            }
                          : null
                      );
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.statusDanger,
                        fontSize: 16,
                        opacity: run.agents.length <= 1 ? 0.3 : 1,
                      }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable style={s.addAgent} onPress={() => {
              const defAgent: AgentRef = preferences?.lastProvider
                ? { provider: preferences.lastProvider, model: preferences.lastModel }
                : { provider: "", model: "" };
              setRun((d) => d ? { ...d, agents: [...d.agents, defAgent] } : null);
            }}>
              <Text style={s.addAgentText}>+ 加一个</Text>
            </Pressable>
          </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={[s.saveBtn, { flex: 1, backgroundColor: theme.colors.surface2 }]}
                  onPress={onSaveDraft}
                  disabled={editM.isPending || addM.isPending}
                >
                  <Text style={[s.saveText, { color: theme.colors.foreground }]}>
                    {editM.isPending || addM.isPending ? "保存中…" : "保存"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.saveBtn, { flex: 1 }]}
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
            </View>
          ) : null}
        </Modal.Content>
      </Modal>

      <Modal
        title={
          picker?.kind === "agent"
            ? picker.step === "provider"
              ? `选择 Provider (#${picker.index + 1})`
              : `选择 Model (${picker.provider})`
            : ""
        }
        icon={
          <Icon name="Bot" size={18} color={theme.colors.foreground} />
        }
        open={Boolean(run && picker?.kind === "agent")}
        onOpenChange={(open) => {
          if (!open) {
            setSearch("");
            setPicker(null);
          }
        }}
      >
        <Modal.Content>
          {run && picker?.kind === "agent" ? (
            <View style={{ gap: 12 }}>
              {picker.step === "model" ? (
                <Pressable
                  style={s.pickBack}
                  onPress={() => {
                    setSearch("");
                    setPicker({
                      kind: "agent",
                      step: "provider",
                      index: picker.index,
                      provider: "",
                    });
                  }}
                >
                  <Text style={s.pickBackText}>← 返回重新选 Provider</Text>
                </Pressable>
              ) : null}
              <StableInput
                key={`picker-agent-modal-${picker.step}-${picker.index}`}
                style={s.input}
                initial=""
                onValue={onSearch}
                placeholder={picker.step === "provider" ? "搜索 Provider…" : "搜索 Model…"}
                placeholderTextColor={theme.colors.foregroundMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {picker.step === "provider"
                ? renderPickList(
                    (providersQ.data?.providers ?? []).map((p) => ({
                      id: p.id,
                      label: p.id,
                      selected: run.agents[picker.index]?.provider === p.id,
                    })),
                    (item) => {
                      setSearch("");
                      setPicker({
                        kind: "agent",
                        index: picker.index,
                        step: "model",
                        provider: item.id,
                      });
                    }
                  )
                : renderPickList(
                    [
                      {
                        id: "",
                        label: "（默认 Model）",
                        sub: "使用 Provider 默认模型",
                        selected: !run.agents[picker.index]?.model,
                      },
                      ...((modelsQ.data?.models ?? []) as Array<{ id: string; label: string }>).map((m) => ({
                        id: m.id,
                        label: m.label || m.id,
                        sub: m.label && m.label !== m.id ? m.id : undefined,
                        selected: run.agents[picker.index]?.model === m.id,
                      })),
                    ],
                    (item) => {
                      const provider = picker.provider;
                      const model = item.id;
                      const idx = picker.index;
                      setRun((d) => {
                        if (!d) return null;
                        const next = [...d.agents];
                        next[idx] = { provider, model };
                        return { ...d, agents: next };
                      });
                      setPicker(null);
                    }
                  )}
            </View>
          ) : null}
        </Modal.Content>
      </Modal>

      <Modal
        title={run?.skills.length ? `选择技能 (${run.skills.length} 个已选)` : "选择技能"}
        icon={<Icon name="Wrench" size={18} color={theme.colors.foreground} />}
        open={Boolean(run && picker?.kind === "skills")}
        onOpenChange={(open) => {
          if (!open) {
            setSearch("");
            setPicker(null);
          }
        }}
      >
        <Modal.Content>
          {run && picker?.kind === "skills" ? (
            <View style={{ gap: 12 }}>
              <StableInput
                key="picker-skills-modal"
                style={s.input}
                initial=""
                onValue={onSearch}
                placeholder="搜索技能…"
                placeholderTextColor={theme.colors.foregroundMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {skillsQ.isLoading ? (
                <Text style={s.empty}>加载技能中…</Text>
              ) : (skillsQ.data?.skills ?? []).length === 0 ? (
                <Text style={s.empty}>暂无可用技能 (~/.agents/skills, ~/.claude/skills)</Text>
              ) : (
                renderPickList(
                  (skillsQ.data?.skills ?? []).map((skill) => ({
                    id: skill,
                    label: skill,
                    selected: run.skills.includes(skill),
                  })),
                  (item) => {
                    setRun((d) => {
                      if (!d) return null;
                      const selected = d.skills.includes(item.id);
                      const next = selected
                        ? d.skills.filter((x) => x !== item.id)
                        : [...d.skills, item.id];
                      return { ...d, skills: next };
                    });
                  }
                )
              )}
            </View>
          ) : null}
        </Modal.Content>
      </Modal>
      </View>
    );
  }
