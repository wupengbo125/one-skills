import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import {
  Icon,
  Modal,
  ScrollView as SheetScrollView,
  useToast,
  copyText,
} from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Animated } from "react-native";
import {
  addTodoRpc,
  reviewAbortRpc,
  reviewContinueRpc,
  reviewDirsRpc,
  reviewSendRpc,
  reviewStartRpc,
  reviewVerdictRpc,
  reviewTemplateRpc,
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
import { createStyles } from "./styles";
import { PulsingPurpleDot, StableInput } from "./primitives";
import {
  agentLabel,
  emptyRun,
  isToday,
  metaLine,
  type LiveIssue,
  type PickItem,
  type Picker,
  type RunDraft,
  type SourceFilter,
} from "./model";

function HoldToLaunch({
  label,
  disabled,
  style,
  textStyle,
  onComplete,
  onShortPress,
}: {
  label: string;
  disabled: boolean;
  style: StyleProp<ViewStyle>;
  textStyle: StyleProp<any>;
  onComplete: () => void;
  onShortPress?: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const fired = useRef(false);

  const start = useCallback(() => {
    if (disabled) return;
    fired.current = false;
    progress.setValue(0);
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished && !fired.current) {
        fired.current = true;
        onComplete();
      }
    });
  }, [disabled, onComplete, progress]);

  const cancel = useCallback(() => {
    anim.current?.stop();
    progress.setValue(0);
  }, [progress]);

  const handlePress = useCallback(() => {
    if (disabled || fired.current) return;
    onShortPress?.();
  }, [disabled, onShortPress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Pressable
      style={[style, { overflow: "hidden" }]}
      onPressIn={start}
      onPressOut={cancel}
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width,
          backgroundColor: "rgba(0,0,0,0.22)",
        }}
      />
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

export function TodoSurface({ theme, layout, navigation }: PluginSurfaceProps) {
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
  const reviewDirs = useRpc(reviewDirsRpc);
  const reviewStart = useRpc(reviewStartRpc);
  const reviewVerdict = useRpc(reviewVerdictRpc);
  const reviewSend = useRpc(reviewSendRpc);
  const reviewAbort = useRpc(reviewAbortRpc);
  const reviewContinue = useRpc(reviewContinueRpc);
  const reviewTemplate = useRpc(reviewTemplateRpc);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todo");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [importingRef, setImportingRef] = useState<string | null>(null);
  const [run, setRun] = useState<RunDraft | null>(null);
  const [menuTodo, setMenuTodo] = useState<Todo | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState("");
  const [formGen, setFormGen] = useState(0);
  const [holdTip, setHoldTip] = useState(false);
  const holdTipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [needTaskTip, setNeedTaskTip] = useState(false);
  const needTaskTipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arb, setArb] = useState<{
    id: string;
    title: string;
    reviewer: AgentRef;
  } | null>(null);
  const [sendSeed, setSendSeed] = useState("");
  const [sendView, setSendView] = useState<"collapsed" | "preview" | "edit">(
    "collapsed",
  );
  const [sendDirty, setSendDirty] = useState(false);
  const [sendLoaded, setSendLoaded] = useState(false);
  const sendRef = useRef("");
  const sendSavedRef = useRef("");
  const [tplSeed, setTplSeed] = useState("");
  const tplRef = useRef("");
  const tplSavedRef = useRef("");
  const [tplDirty, setTplDirty] = useState(false);
  const tplLoadedKey = useRef<string | null>(null);
  // 模板区三态：collapsed 收起 / preview 预览 / edit 编辑
  const [tplView, setTplView] = useState<"collapsed" | "preview" | "edit">(
    "collapsed",
  );
  // 需求框：预填目标马的需求文件内容，没有就预填待办内容；用户可整段删掉
  const [taskView, setTaskView] = useState<"collapsed" | "preview" | "edit">(
    "collapsed",
  );
  const [verdictOpen, setVerdictOpen] = useState(true);
  // 评审弹层分两页：0 = 评审官，1 = 干活的马
  const [page, setPage] = useState(0);
  const [pageW, setPageW] = useState(0);
  const pagerRef = useRef<ScrollView | null>(null);
  const [arbMsg, setArbMsg] = useState<{
    text: string;
    bad?: boolean;
  } | null>(null);
  const arbMsgTimer = useRef<any>(undefined);
  const showArbMsg = useCallback(
    (msg: { text: string; bad?: boolean } | null) => {
      setArbMsg(msg);
      clearTimeout(arbMsgTimer.current);
      if (msg) {
        arbMsgTimer.current = setTimeout(() => setArbMsg(null), 2500);
      }
    },
    [],
  );
  const [copyTip, setCopyTip] = useState(false);
  const copyTipTimer = useRef<any>(undefined);
  const [arbTaskSeed, setArbTaskSeed] = useState("");
  const [arbTaskVer, setArbTaskVer] = useState(0);
  const arbTaskRef = useRef("");
  // 评审方式由你手动定（多匹马/一匹马），不传就按马匹数自动选
  const [arbKindPick, setReviewKindPick] = useState<
    "multi" | "single" | null
  >(null);
  // 一匹马时指定评审哪一匹（候选名单里的位置）
  const [arbTarget, setArbTarget] = useState<number | null>(null);
  const onTplValue = useCallback((v: string) => {
    tplRef.current = v;
    setTplDirty(v !== tplSavedRef.current);
  }, []);

  const triggerHoldTip = useCallback(() => {
    if (holdTipTimer.current) clearTimeout(holdTipTimer.current);
    setHoldTip(true);
    holdTipTimer.current = setTimeout(() => {
      setHoldTip(false);
    }, 2000);
  }, []);

  const closeOverlays = useCallback(() => {
    if (holdTipTimer.current) clearTimeout(holdTipTimer.current);
    setHoldTip(false);
    setRun(null);
    setPicker(null);
  }, []);
  const runTitleRef = useRef("");
  const runPromptRef = useRef("");
  const formScrollRef = useRef<any>(null);
  const fieldY = useRef<Record<string, number>>({});
  const scrollToField = useCallback((key: string) => {
    const y = fieldY.current[key] ?? 0;
    formScrollRef.current?.scrollTo?.({ y: Math.max(0, y - 12), animated: true });
  }, []);

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
    picker &&
    (picker.kind === "agent" || picker.kind === "reviewer") &&
    picker.step === "model"
      ? picker.provider
      : "";
  const modelsQ = useQuery({
    queryKey: ["todo-models", pickerProvider],
    queryFn: () => listModels({ provider: pickerProvider }),
    enabled: (!!run || !!arb) && !!pickerProvider,
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
  const arbTodo: Todo | undefined = arb
    ? todos.find((t) => t.id === arb.id)
    : undefined;
  const auto = arbTodo?.autoReview;
  const setAuto = (patch: Partial<NonNullable<Todo["autoReview"]>>) => {
    if (!arbTodo) return;
    const base = arbTodo.autoReview ?? { maxRounds: 0, roundsUsed: 0 };
    editM.mutate({
      id: arbTodo.id,
      patch: { autoReview: { ...base, ...patch } },
    });
  };
  const arbDirsQ = useQuery({
    queryKey: ["todo-arb-dirs", arb?.id],
    queryFn: () => reviewDirs({ id: arb!.id }),
    enabled: !!arb,
  });
  const arbLiveCount = (arbDirsQ.data?.candidates ?? []).filter(
    (c) => c.exists,
  ).length;
  // ≥2 个活候选：多匹马评审；否则一匹马评审；你手动选了就以你选的为准
  const arbMode: "multi" | "single" =
    arbLiveCount >= 2 ? "multi" : "single";
  // 手动选了多匹马但活着的马不足 2 匹时，回落到一匹马评审（马被删/归档后自动切换）
  const arbKind: "multi" | "single" =
    arbKindPick === "multi" && arbLiveCount >= 2
      ? "multi"
      : arbKindPick === "single"
        ? "single"
        : arbMode;
  const arbCanStart =
    arbKind === "multi"
      ? arbLiveCount >= 2 && !arbDirsQ.isLoading
      : (arbLiveCount >= 1 || !!arbDirsQ.data?.reviewDir) &&
        !arbDirsQ.isLoading;
  // 需求框两个按钮：点哪个，框里就装哪个来源的内容
  const arbTaskDocIdx = (() => {
    const cands = arbDirsQ.data?.candidates ?? [];
    return arbKind === "single" && arbTarget !== null
      ? arbTarget
      : cands.findIndex((c) => c.exists);
  })();
  const loadArbTask = (src: "todo" | "doc") => {
    const cands = arbDirsQ.data?.candidates ?? [];
    const seed =
      src === "todo"
        ? [arbTodo?.title.trim(), arbTodo?.prompt?.trim()]
            .filter(Boolean)
            .join("\n")
        : (cands[arbTaskDocIdx]?.taskDoc ??
           arbDirsQ.data?.reviewTaskDoc ?? "");
    if (!seed.trim()) {
      toast.show(
        src === "todo" ? "待办里没写内容" : "没找到需求文件",
        { variant: "info" },
      );
      return;
    }
    arbTaskRef.current = seed;
    setArbTaskSeed(seed);
    setTaskView("collapsed");
    setArbTaskVer((v) => v + 1);
  };
  const arbSendM = useMutation({
    mutationFn: (id: string) => reviewSend({ id }),
    onSuccess: (res) => {
      if (res.ok) {
        showArbMsg({ text: `已下发改进意见至 ${res.target ?? "会话"}` });
      } else {
        showArbMsg({ text: res.error || "发送失败", bad: true });
      }
      invalidate();
    },
    onError: (e: Error) => showArbMsg({ text: e.message || "发送失败", bad: true }),
  });
  const arbContM = useMutation({
    mutationFn: (vars: { id: string; task: string }) =>
      reviewContinue(vars),
    onSuccess: (res) => {
      if (res.ok) {
        showArbMsg({ text: "已发起增量复审" });
      } else {
        showArbMsg({ text: res.error || "发起失败", bad: true });
      }
      invalidate();
    },
    onError: (e: Error) => showArbMsg({ text: e.message || "发起失败", bad: true }),
  });
  const arbAbortM = useMutation({
    mutationFn: (id: string) => reviewAbort({ id }),
    onSuccess: (res) => {
      if (res.ok) {
        showArbMsg({ text: "已中止" });
      } else {
        showArbMsg({ text: res.error || "中止失败", bad: true });
      }
      invalidate();
    },
    onError: (e: Error) => showArbMsg({ text: e.message || "中止失败", bad: true }),
  });
  const tplKind: "multi" | "single" = arbKind === "multi" ? "multi" : "single";
  const tplQ = useQuery({
    queryKey: ["todo-tpl", arb?.id, tplKind],
    queryFn: () => reviewTemplate({ kind: tplKind }),
    enabled: !!arb,
  });
  useEffect(() => {
    if (arb && tplQ.data?.text !== undefined && tplLoadedKey.current !== `${arb.id}-${tplKind}`) {
      tplLoadedKey.current = `${arb.id}-${tplKind}`;
      tplRef.current = tplQ.data.text;
      tplSavedRef.current = tplQ.data.text;
      setTplSeed(tplQ.data.text);
      setTplDirty(false);
    }
  }, [arb, tplKind, tplQ.data]);
  const sendQ = useQuery({
    queryKey: ["todo-send-prompt", arb?.id],
    queryFn: () => reviewTemplate({ kind: "send" }),
    enabled: !!arb,
  });
  useEffect(() => {
    if (sendQ.data?.text !== undefined && !sendLoaded) {
      setSendLoaded(true);
      sendRef.current = sendQ.data.text;
      sendSavedRef.current = sendQ.data.text;
      setSendSeed(sendQ.data.text);
    }
  }, [sendQ.data, sendLoaded]);
  const sendSaveM = useMutation({
    mutationFn: (text: string) => reviewTemplate({ kind: "send", text }),
    onSuccess: (res) => {
      if (res.error || res.text === undefined) {
        showArbMsg({ text: res.error || "保存失败", bad: true });
        return;
      }
      sendSavedRef.current = res.text;
      setSendSeed(res.text);
      setSendDirty(false);
      showArbMsg({ text: "下发前导提示已保存" });
    },
    onError: (e: Error) =>
      showArbMsg({ text: e.message || "保存失败", bad: true }),
  });
  const tplSaveM = useMutation({
    mutationFn: (text: string) => reviewTemplate({ kind: tplKind, text }),
    onSuccess: (res) => {
      if (res.error || res.text === undefined) {
        showArbMsg({ text: res.error || "保存失败", bad: true });
        return;
      }
      tplSavedRef.current = res.text;
      setTplSeed(res.text);
      setTplDirty(false);
      showArbMsg({ text: "评审提示词已保存" });
    },
    onError: (e: Error) =>
      showArbMsg({ text: e.message || "保存失败", bad: true }),
  });
  const arbVerdictQ = useQuery({
    queryKey: ["todo-arb-verdict", arb?.id],
    queryFn: async () => {
      const res = await reviewVerdict({ id: arb!.id });
      // 服务端可能刚把 running 翻成 done/failed（agy 评审员靠轮询翻转）
      if (res.verdict || res.error) invalidate();
      return res;
    },
    enabled: !!arb && !!arbTodo?.review,
    refetchInterval:
      arbTodo?.review?.status === "running" ? 4000 : false,
  });
  const arbStartM = useMutation({
    mutationFn: (vars: {
      id: string;
      kind: "multi" | "single";
      task?: string;
      reviewer: AgentRef;
    }) => reviewStart(vars),
    onSuccess: (res) => {
      if (res.ok) {
        showArbMsg({ text: "已发起评审" });
      } else {
        showArbMsg({ text: res.error || "发起评审失败", bad: true });
      }
      invalidate();
    },
    onError: (e: Error) => showArbMsg({ text: e.message || "发起评审失败", bad: true }),
  });
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

  const s = useMemo(
    () =>
      createStyles(
        theme,
        layout.compact,
        addM.isPending ||
          startM.isPending ||
          createIssueM.isPending ||
          editM.isPending,
      ),
    [theme, layout.compact],
  );

  // 折叠区标题行：四处统一成同一个样子
  const collapseRow = (
    text: string,
    open: boolean,
    onPress: () => void,
    right?: React.ReactNode,
  ) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable style={[s.chip, { flex: 1 }]} onPress={onPress}>
        <Text style={s.chipText} numberOfLines={1}>
          {text}
          {open ? "  ▲" : "  ▼"}
        </Text>
      </Pressable>
      {right}
    </View>
  );

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
      d.isolation = t.isolation ?? "local";
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
      d.isolation = "local";
    }

    d.workspaceId = t?.workspaceId ?? "";
    d.workspaceName = t?.workspaceName ?? "";
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

  function openArbitration(t: Todo) {
    setPicker(null);
    setArbMsg(null);
    setSendLoaded(false);
    setSendView("collapsed");
    setTaskView("collapsed");
    setVerdictOpen(false);
    setSendDirty(false);
    setArb({
      id: t.id,
      title: t.title,
      reviewer:
        t.review?.reviewer?.provider
          ? t.review.reviewer
          : preferences?.lastProvider
            ? { provider: preferences.lastProvider, model: preferences.lastModel }
            : { provider: "", model: "" },
    });
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
    setRun((d) => (d ? { ...d, title, prompt } : d));
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
          workspaceId: run.workspaceId,
          workspaceName: run.workspaceName,
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
    if (!run.title.trim()) return toast.error("标题必填");
    const prompt = runPromptRef.current.trim();
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
              {t.workspaceId || t.agentIds?.length || t.terminalIds?.length ? (
                <Pressable
                  style={s.btn}
                  onPress={() =>
                    statusM.mutate({ id: t.id, status: "running" })
                  }
                >
                  <Text style={s.btnText}>重连</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={s.btn}
                onPress={() => statusM.mutate({ id: t.id, status: "pending" })}
              >
                <Text style={s.btnText}>重置</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View
          style={{
            position: "relative",
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
          }}
        >
          {isRunning && navigation && (t.agentIds?.length || t.terminalIds?.length || t.workspaceId) ? (
            <Pressable
              accessibilityRole="button"
              style={{
                width: 28,
                height: 28,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={(e) => {
                e.stopPropagation();
                if (t.terminalIds?.length && t.workspaceId) {
                  navigation.openWorkspace({ workspaceId: t.workspaceId });
                } else {
                  const agentId = t.agentIds?.[0];
                  if (agentId) navigation.openAgent({ agentId });
                  else if (t.workspaceId)
                    navigation.openWorkspace({ workspaceId: t.workspaceId });
                }
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.accent,
                  fontWeight: "700",
                  lineHeight: 15,
                }}
              >
                ↗
              </Text>
            </Pressable>
          ) : null}
          {(t.worktrees?.length ?? 0) >= 1 ||
          t.status !== "pending" ||
          t.review ? (
            <Pressable
              accessibilityRole="button"
              style={{
                width: 28,
                height: 28,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={(e) => {
                e.stopPropagation();
                openArbitration(t);
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: t.review?.status === "running"
                    ? theme.colors.accent
                    : theme.colors.foregroundMuted,
                  fontWeight: "700",
                  lineHeight: 14,
                }}
              >
                ⚖
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            style={{
              width: 28,
              height: 28,
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
        <Modal.Content scrollable={false} style={{ flex: 1 }}>
          {run ? (
            <SheetScrollView
              ref={formScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={[
                s.scrollBody,
                { padding: layout.compact ? 16 : 24, paddingBottom: 40 },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View
                onLayout={(e) => {
                  fieldY.current.title = e.nativeEvent.layout.y;
                }}
              >
                <Text style={s.label}>标题 *</Text>
                <StableInput
                  key={`run-title-${formGen}`}
                  style={s.input}
                  initial={run.title}
                  onValue={onRunTitle}
                  onFocus={() => scrollToField("title")}
                  placeholder="要做什么"
                  placeholderTextColor={theme.colors.foregroundMuted}
                />
              </View>
              <View
                onLayout={(e) => {
                  fieldY.current.prompt = e.nativeEvent.layout.y;
                }}
              >
                <Text style={s.label}>内容</Text>
                <StableInput
                  key={`run-prompt-${formGen}`}
                  style={s.inputMulti}
                  initial={run.prompt}
                  onValue={onRunPrompt}
                  onFocus={() => scrollToField("prompt")}
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
                <View style={{ flex: 1, position: "relative" }}>
                  {holdTip ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        marginBottom: 8,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        zIndex: 9999,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "rgba(20, 20, 25, 0.94)",
                          borderColor: "rgba(255, 255, 255, 0.16)",
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingVertical: 7,
                          paddingHorizontal: 14,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.25,
                          shadowRadius: 6,
                          elevation: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          请长按全军出击
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <HoldToLaunch
                    style={[s.saveBtn, { width: "100%" }]}
                    textStyle={s.saveText}
                    disabled={startM.isPending}
                    label={
                      startM.isPending
                        ? "启动中…"
                        : run.agents.length > 1
                          ? `全军出击 ×${run.agents.length}`
                          : "全军出击"
                    }
                    onComplete={onRun}
                    onShortPress={triggerHoldTip}
                  />
                </View>
              </View>
            </SheetScrollView>
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

      <Modal
        title={arb ? `方案评审 · ${arb.title}` : ""}
        icon={<Icon name="Bot" size={18} color={theme.colors.foreground} />}
        open={Boolean(arb)}
        onOpenChange={(open) => {
          if (!open) {
            setArb(null);
            setPicker(null);
            setSearch("");
            tplLoadedKey.current = null;
            tplRef.current = "";
            tplSavedRef.current = "";
            setTplSeed("");
            setTplDirty(false);
            setTplView("collapsed");
            setArbTarget(null);
            setTaskView("collapsed");
            setVerdictOpen(true);
            setPage(0);
            setArbTaskSeed("");
            setArbTaskVer(0);
            arbTaskRef.current = "";
          }
        }}
      >
        <Modal.Content scrollable={false} style={{ flex: 1 }}>
          {arbMsg ? (
            <Text
              style={{
                paddingHorizontal: layout.compact ? 16 : 24,
                paddingTop: 8,
                fontSize: 12,
                color: arbMsg.bad
                  ? theme.colors.statusDanger
                  : theme.colors.foregroundMuted,
              }}
            >
              {arbMsg.text}
            </Text>
          ) : null}
          {arb && arbTodo ? (
              <View style={{ flex: 1 }} onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    paddingHorizontal: layout.compact ? 16 : 24,
                    paddingTop: 6,
                  }}
                >
                  {["审阅配置", "意见回传"].map((label, i) => (
                    <Pressable
                      key={label}
                      style={[
                        s.segBtn,
                        { flexShrink: 0, minWidth: 100, paddingHorizontal: 16, paddingVertical: 6 },
                        page === i && s.segOn,
                      ]}
                      onPress={() => {
                        setPage(i);
                        pagerRef.current?.scrollTo({ x: i * pageW, animated: true });
                      }}
                    >
                      <Text style={page === i ? s.segTextOn : s.segText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  ref={pagerRef}
                  style={{ flex: 1 }}
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const newPage = Math.round(
                      e.nativeEvent.contentOffset.x / Math.max(pageW, 1),
                    );
                    if (newPage !== page) setPage(newPage);
                  }}
                  onMomentumScrollEnd={(e) =>
                    setPage(
                      Math.round(e.nativeEvent.contentOffset.x / Math.max(pageW, 1)),
                    )
                  }
                >
                <View style={{ width: pageW || undefined, flex: 1 }}>
              <SheetScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                  s.scrollBody,
                  { padding: layout.compact ? 16 : 24, paddingBottom: 40 },
                ]}
                keyboardShouldPersistTaps="handled"
              >
              {arbTodo.review ? (
                <View style={s.formSection}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text style={[s.formSectionTitle, { flex: 1 }]}>
                      状态：{" "}
                      {arbTodo.review.status === "running"
                        ? "评审中…"
                        : arbTodo.review.status === "done"
                          ? "评审完成"
                          : "失败"}
                      {arbTodo.review.agentId
                        ? `  ·  评审员 ${arbTodo.review.reviewer.provider}${
                            arbTodo.review.reviewer.model
                              ? ` / ${arbTodo.review.reviewer.model}`
                              : ""
                          }`
                        : ""}
                    </Text>
                    {arbTodo.review.status === "running" ? (
                      <Pressable
                        style={[
                          s.outlineBtn,
                          { paddingVertical: 4, paddingHorizontal: 10 },
                          arbAbortM.isPending && { opacity: 0.5 },
                        ]}
                        disabled={arbAbortM.isPending}
                        onPress={() => arbAbortM.mutate(arb.id)}
                      >
                        <Text style={[s.outlineText, { fontSize: 12 }]}>
                          {arbAbortM.isPending ? "中止中…" : "中止"}
                        </Text>
                      </Pressable>
                    ) : null}
                    {arbTodo.review.status === "done" ? (
                      <Pressable
                        style={[
                          s.outlineBtn,
                          { paddingVertical: 4, paddingHorizontal: 10 },
                        ]}
                        onPress={() => {
                          setPage(1);
                          pagerRef.current?.scrollTo({ x: pageW, animated: true });
                        }}
                      >
                        <Text style={[s.outlineText, { fontSize: 12 }]}>
                          前往下发意见 →
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {arbTodo.review.error ? (
                    <Text style={s.err}>{arbTodo.review.error}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={s.formSection}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={s.pathText}>自动评审轮数</Text>
                  {[0, 1, 2, 3, -1].map((n) => (
                    <Pressable
                      key={n}
                      style={[
                        s.segBtn,
                        { flexShrink: 0, minWidth: 36, paddingHorizontal: 8, paddingVertical: 4 },
                        (auto?.maxRounds ?? 0) === n && s.segOn,
                      ]}
                      onPress={() =>
                        setAuto({
                          maxRounds: n,
                          roundsUsed: 0,
                          phase: "horse",
                          note: undefined,
                        })
                      }
                    >
                      <Text
                        style={
                          (auto?.maxRounds ?? 0) === n
                            ? s.segTextOn
                            : s.segText
                        }
                      >
                        {n === -1 ? "不限" : n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {auto?.note ? (
                  <Text style={s.pathText}>{auto.note}</Text>
                ) : null}
              </View>

              <View style={s.formSection}>
                {collapseRow(
                  `评审基准${
                    arbTaskSeed.trim()
                      ? ` · ${arbTaskSeed.trim().split("\n").length} 行`
                      : " · 未载入"
                  }`,
                  taskView !== "collapsed",
                  () =>
                    setTaskView(
                      taskView === "collapsed" ? "preview" : "collapsed",
                    ),
                  <>
                    <Pressable
                      style={[s.btn, { paddingHorizontal: 10, paddingVertical: 4 }]}
                      onPress={() => loadArbTask("todo")}
                    >
                      <Text style={s.btnText}>导入待办</Text>
                    </Pressable>
                    <Pressable
                      style={[s.btn, { paddingHorizontal: 10, paddingVertical: 4 }]}
                      onPress={() => loadArbTask("doc")}
                    >
                      <Text style={s.btnText}>导入清单</Text>
                    </Pressable>
                  </>,
                )}
                {taskView === "preview" ? (
                  <>
                    <Text style={s.tplPreview}>
                      {arbTaskSeed.trim() || "（未载入）"}
                    </Text>
                    <Pressable
                      style={[
                        s.btn,
                        { alignSelf: "flex-start", marginTop: 6 },
                      ]}
                      onPress={() => setTaskView("edit")}
                    >
                      <Text style={s.btnText}>编辑</Text>
                    </Pressable>
                  </>
                ) : null}
                {taskView === "edit" ? (
                  <>
                    <StableInput
                      key={`arb-task-${arb.id}-${arbTaskVer}`}
                      style={s.inputLine}
                      initial={arbTaskSeed}
                      onValue={(v) => {
                        arbTaskRef.current = v;
                        setArbTaskSeed(v);
                      }}
                      placeholderTextColor={theme.colors.foregroundMuted}
                      multiline
                    />
                    <Pressable
                      style={[
                        s.btn,
                        { alignSelf: "flex-start", marginTop: 6 },
                      ]}
                      onPress={() => setTaskView("preview")}
                    >
                      <Text style={s.btnText}>完成</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>

              <View style={s.formSection}>
                {collapseRow(
                  `评审提示词模板（${tplKind === "multi" ? "多匹马" : "一匹马"}）${
                    tplDirty
                      ? "（已修改未保存）"
                      : tplSeed
                        ? ` · 共 ${tplSeed.split("\n").length} 行`
                        : ""
                  }`,
                  tplView !== "collapsed",
                  () =>
                    setTplView(tplView === "collapsed" ? "preview" : "collapsed"),
                )}
                {tplView !== "collapsed" ? (
                  <>
                    <Text style={s.pathText}>
                      空位：{"{{task}}"}需求 {"{{targets}}"}候选 {"{{base}}"}基线 {"{{verdictFile}}"}结果路径
                    </Text>
                    {tplQ.isLoading ? (
                      <Text style={s.empty}>读模板中…</Text>
                    ) : tplQ.data?.error ? (
                      <Text style={s.err}>{tplQ.data.error}</Text>
                    ) : tplView === "preview" ? (
                      <>
                        <Text style={s.tplPreview}>{tplSeed || "（空）"}</Text>
                        <Pressable
                          style={[s.btn, { alignSelf: "flex-start", marginTop: 8 }]}
                          onPress={() => setTplView("edit")}
                        >
                          <Text style={s.btnText}>编辑</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <StableInput
                          key={`arb-tpl-${arb.id}`}
                          style={s.inputMulti}
                          initial={tplSeed}
                          onValue={onTplValue}
                          placeholderTextColor={theme.colors.foregroundMuted}
                          multiline
                        />
                        <Pressable
                          style={[
                            s.btn,
                            { alignSelf: "flex-start", marginTop: 8 },
                            (tplSaveM.isPending || !tplDirty) && { opacity: 0.5 },
                          ]}
                          disabled={tplSaveM.isPending || !tplDirty}
                          onPress={() => tplSaveM.mutate(tplRef.current)}
                        >
                          <Text style={s.btnText}>
                            {tplSaveM.isPending ? "保存中…" : "保存模板"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </>
                ) : null}
              </View>

              <View style={s.formSection}>
                <Text style={s.label}>评审员</Text>
                <Pressable
                  style={s.chip}
                  onPress={() =>
                    setPicker(
                      picker?.kind === "reviewer"
                        ? null
                        : { kind: "reviewer", step: "provider", provider: "" },
                    )
                  }
                >
                  <Text
                    style={arb.reviewer.provider ? s.chipText : s.chipMuted}
                    numberOfLines={1}
                  >
                    {agentLabel(arb.reviewer)}
                  </Text>
                  <Text style={s.chipMuted}>
                    {picker?.kind === "reviewer" ? "▲" : "▼"}
                  </Text>
                </Pressable>
                {picker?.kind === "reviewer" ? (
                  <View style={s.inlinePicker}>
                    {picker.step === "model" ? (
                      <Pressable
                        style={s.pickBack}
                        onPress={() => {
                          setSearch("");
                          setPicker({
                            kind: "reviewer",
                            step: "provider",
                            provider: "",
                          });
                        }}
                      >
                        <Text style={s.pickBackText}>← 返回重新选 Provider</Text>
                      </Pressable>
                    ) : null}
                    <StableInput
                      key={`picker-reviewer-${picker.step}`}
                      style={s.input}
                      initial=""
                      onValue={onSearch}
                      placeholder={
                        picker.step === "provider"
                          ? "搜索 Provider…"
                          : "搜索 Model…"
                      }
                      placeholderTextColor={theme.colors.foregroundMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {picker.step === "provider"
                      ? renderPickList(
                          (providersQ.data?.providers ?? []).map((p) => ({
                            id: p.id,
                            label: p.id,
                            selected: arb.reviewer.provider === p.id,
                          })),
                          (item) => {
                            setSearch("");
                            setPicker({
                              kind: "reviewer",
                              step: "model",
                              provider: item.id,
                            });
                          },
                        )
                      : renderPickList(
                          [
                            {
                              id: "",
                              label: "（默认 Model）",
                              sub: "使用 Provider 默认模型",
                              selected: !arb.reviewer.model,
                            },
                            ...((modelsQ.data?.models ?? []) as Array<{
                              id: string;
                              label: string;
                            }>).map((m) => ({
                              id: m.id,
                              label: m.label || m.id,
                              sub:
                                m.label && m.label !== m.id ? m.id : undefined,
                              selected: arb.reviewer.model === m.id,
                            })),
                          ],
                          (item) => {
                            setArb((d) =>
                              d
                                ? {
                                    ...d,
                                    reviewer: {
                                      provider: picker.provider,
                                      model: item.id,
                                    },
                                  }
                                : d,
                            );
                            setSearch("");
                            setPicker(null);
                          },
                        )}
                  </View>
                ) : null}
              </View>

              <View style={s.formSection}>
                <Text style={s.formSectionTitle}>
                  {arbKind === "single"
                    ? "目标工作区"
                    : "候选工作区"}
                </Text>
                {arbDirsQ.isLoading ? (
                  <Text style={s.empty}>找目录中…</Text>
                ) : arbDirsQ.data?.error ? (
                  <Text style={s.err}>{arbDirsQ.data.error}</Text>
                ) : arbKind === "multi" && arbLiveCount < 2 ? (
                  <Text style={s.err}>
                    有效候选只有 {arbLiveCount} 个（需 ≥2），可能已被归档
                  </Text>
                ) : arbKind === "single" &&
                  arbLiveCount < 1 &&
                  !arbDirsQ.data?.reviewDir ? (
                  <Text style={s.err}>找不到可评审的目录</Text>
                ) : (arbDirsQ.data?.candidates ?? []).length === 0 ? (
                  arbDirsQ.data?.reviewDir ? (
                    <View style={{ gap: 2, paddingVertical: 4 }}>
                      <Text style={s.chipText}>本地目录</Text>
                      <Text style={s.pathText} numberOfLines={2}>
                        {arbDirsQ.data.reviewDir}
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.empty}>没有候选 worktree</Text>
                  )
                ) : (
                  (arbDirsQ.data?.candidates ?? []).map((c, idx) => {
                    const pickable = arbKind === "single" && c.exists;
                    const picked =
                      pickable &&
                      (arbTarget !== null
                        ? arbTarget === idx
                        : idx ===
                          (arbDirsQ.data?.candidates ?? []).findIndex(
                            (x) => x.exists,
                          ));
                    const body = (
                      <>
                        <Text style={s.chipText}>
                          {c.label}
                          {c.exists ? "" : "  ·  目录已失效"}
                          {picked ? "  ·  已选定" : ""}
                        </Text>
                        <Text
                          style={[
                            s.pathText,
                            !c.exists && { color: theme.colors.statusDanger },
                          ]}
                          numberOfLines={2}
                        >
                          {c.branch}  ·  {c.dir || "未知目录"}
                        </Text>
                      </>
                    );
                    return pickable ? (
                      <Pressable
                        key={c.workspaceId}
                        style={[
                          { gap: 2, paddingVertical: 4 },
                          picked && s.segOn,
                        ]}
                        onPress={() => setArbTarget(idx)}
                      >
                        {body}
                      </Pressable>
                    ) : (
                      <View
                        key={c.workspaceId}
                        style={{ gap: 2, paddingVertical: 4 }}
                      >
                        {body}
                      </View>
                    );
                  })
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, position: "relative" }}>
                  {needTaskTip ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        marginBottom: 8,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        zIndex: 9999,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "rgba(20, 20, 25, 0.94)",
                          borderColor: "rgba(255, 255, 255, 0.16)",
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingVertical: 7,
                          paddingHorizontal: 14,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.25,
                          shadowRadius: 6,
                          elevation: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          请先指定评审基准
                        </Text>
                      </View>
                    </View>
                  ) : null}
                <Pressable
                  style={[
                    s.saveBtn,
                    { flex: 1 },
                    (arbStartM.isPending ||
                      arbTodo.review?.status === "running" ||
                      !arb.reviewer.provider ||
                      !arbCanStart) && { opacity: 0.5 },
                  ]}
                  disabled={
                    arbStartM.isPending ||
                    arbTodo.review?.status === "running" ||
                    !arb.reviewer.provider ||
                    !arbCanStart
                  }
                  onPress={() => {
                    if (tplDirty) {
                      setArbMsg({ text: "提示词改了还没保存，先点保存模板", bad: true });
                      return;
                    }
                    if (!arbTaskRef.current.trim()) {
                      setNeedTaskTip(true);
                      if (needTaskTipTimer.current)
                        clearTimeout(needTaskTipTimer.current);
                      needTaskTipTimer.current = setTimeout(
                        () => setNeedTaskTip(false),
                        2000,
                      );
                      return;
                    }
                    arbStartM.mutate({
                      id: arb.id,
                      kind: arbKind,
                      task: arbTaskRef.current,
                      reviewer: arb.reviewer,
                      ...(arbKind === "single" && arbTarget !== null
                        ? { targetIndex: arbTarget }
                        : {}),
                    });
                  }}
                >
                  <Text style={s.saveText}>
                    {arbStartM.isPending ||
                    arbTodo.review?.status === "running"
                      ? "评审中…"
                      : "评审"}
                  </Text>
                </Pressable>
                </View>
                {navigation &&
                (arbTodo.review?.agentId ||
                  arbTodo.review?.workspaceId) ? (
                  <Pressable
                    style={[s.outlineBtn, { justifyContent: "center" }]}
                    onPress={() => {
                      if (arbTodo.review?.agentId)
                        navigation.openAgent({
                          agentId: arbTodo.review.agentId,
                        });
                      else if (arbTodo.review?.workspaceId)
                        navigation.openWorkspace({
                          workspaceId: arbTodo.review.workspaceId,
                        });
                    }}
                  >
                    <Text style={s.outlineText}>查看评审会话 ↗</Text>
                  </Pressable>
                ) : null}
              </View>
                </SheetScrollView>
                </View>
                <View style={{ width: pageW || undefined, flex: 1 }}>
              <SheetScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                  s.scrollBody,
                  { padding: layout.compact ? 16 : 24, paddingBottom: 40 },
                ]}
                keyboardShouldPersistTaps="handled"
              >
                {arbVerdictQ.data?.verdict ? (
                  <View style={s.formSection}>
                    {collapseRow(
                      `评审结论 · ${(
                      arbVerdictQ.data.verdict.split("\n", 1)[0] ?? ""
                    ).trim()}`,
                    verdictOpen,
                    () => setVerdictOpen(!verdictOpen),
                  )}
                  {verdictOpen ? (
                    <View
                      style={{
                        marginTop: 8,
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: theme.colors.surface2,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.foreground,
                          fontSize: 13,
                          lineHeight: 20,
                        }}
                      >
                        {arbVerdictQ.data.verdict}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : arbTodo.review?.status === "running" ? (
                <View style={s.formSection}>
                  <Text style={s.pathText}>评审员正在审阅中，生成结论后可在此展开查看并下发…</Text>
                </View>
              ) : (
                <View style={s.formSection}>
                  <Text style={s.pathText}>暂无评审结论，请先在「审阅配置」页发起评审。</Text>
                </View>
              )}

              <View style={s.formSection}>
                {collapseRow(
                  `下发前导提示${sendDirty ? "（已修改未保存）" : ""}`,
                  sendView !== "collapsed",
                  () =>
                    setSendView(sendView === "collapsed" ? "preview" : "collapsed"),
                )}
                {sendView !== "collapsed" ? (
                  <>
                    {sendQ.isLoading ? (
                      <Text style={s.empty}>读取中…</Text>
                    ) : sendQ.data?.error ? (
                      <Text style={s.err}>{sendQ.data.error}</Text>
                    ) : sendView === "preview" ? (
                      <>
                        <Text style={s.tplPreview}>
                          {sendSeed || "（空）"}
                        </Text>
                        <Pressable
                          style={[
                            s.btn,
                            { alignSelf: "flex-start", marginTop: 6 },
                          ]}
                          onPress={() => setSendView("edit")}
                        >
                          <Text style={s.btnText}>编辑</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <StableInput
                          style={s.inputMulti}
                          initial={sendSeed}
                          onValue={(v) => {
                            sendRef.current = v;
                            setSendDirty(v !== sendSavedRef.current);
                          }}
                          multiline
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            style={[
                              s.btn,
                              (sendSaveM.isPending || !sendDirty) && {
                                opacity: 0.5,
                              },
                            ]}
                            disabled={sendSaveM.isPending || !sendDirty}
                            onPress={() => sendSaveM.mutate(sendRef.current)}
                          >
                            <Text style={s.btnText}>
                              {sendSaveM.isPending ? "保存中…" : "保存"}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[s.btn, { backgroundColor: theme.colors.surface2 }]}
                            onPress={() => setSendView("preview")}
                          >
                            <Text style={[s.btnText, { color: theme.colors.foreground }]}>
                              预览
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </>
                ) : null}
              </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                    <Pressable
                      style={[
                        s.saveBtn,
                        { flex: 1 },
                        (arbSendM.isPending ||
                          !arbVerdictQ.data?.verdict ||
                          arbTodo.review?.status === "running") && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={
                        arbSendM.isPending ||
                        !arbVerdictQ.data?.verdict ||
                        arbTodo.review?.status === "running"
                      }
                      onPress={() => arbSendM.mutate(arb.id)}
                    >
                      <Text style={s.saveText}>
                        {arbSendM.isPending ? "下发中…" : "下发改进意见 ↩"}
                      </Text>
                    </Pressable>
                    <View style={{ position: "relative" }}>
                      {copyTip ? (
                        <View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            bottom: "100%",
                            marginBottom: 8,
                            left: 0,
                            right: 0,
                            alignItems: "center",
                            zIndex: 9999,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: "rgba(20, 20, 25, 0.94)",
                              borderColor: "rgba(255, 255, 255, 0.16)",
                              borderWidth: 1,
                              borderRadius: 8,
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.25,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: "#ffffff",
                                fontSize: 12,
                                fontWeight: "600",
                              }}
                            >
                              已复制
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      <Pressable
                        style={[
                          s.outlineBtn,
                          !arbVerdictQ.data?.verdict && { opacity: 0.5 },
                        ]}
                        disabled={!arbVerdictQ.data?.verdict}
                        onPress={() => {
                          void copyText(arbVerdictQ.data?.verdict ?? "").then(
                            () => {
                              setCopyTip(true);
                              clearTimeout(copyTipTimer.current);
                              copyTipTimer.current = setTimeout(
                                () => setCopyTip(false),
                                1500,
                              );
                            },
                            () => showArbMsg({ text: "复制失败", bad: true }),
                          );
                        }}
                      >
                        <Text style={s.outlineText}>复制意见</Text>
                      </Pressable>
                    </View>
                </View>
                </SheetScrollView>
                </View>
                </ScrollView>
              </View>
          ) : null}
        </Modal.Content>
      </Modal>
      </View>
    );
  }
