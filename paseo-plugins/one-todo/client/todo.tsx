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
import type { ReactNode } from "react";
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
  finishTodoRpc,
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
  removeWorktreeRpc,
  branchFromTitle,
  firstHorse,
  initialKindOf,
  COMMITTEE_SKILL,
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

// 开场向导词三份的名字：标题、提示都用它。键写错是编译错误，不会得到空标题
const INITIAL_LABEL: Record<ReturnType<typeof initialKindOf>, string> = {
  initial: "普通",
  initialRace: "赛马",
  initialCommittee: "委员会",
};

function HoldToLaunch({
  label,
  children,
  duration = 1000,
  disabled,
  style,
  textStyle,
  onComplete,
  onShortPress,
}: {
  label?: string;
  children?: ReactNode;
  duration?: number;
  disabled: boolean;
  style: StyleProp<ViewStyle>;
  textStyle?: StyleProp<any>;
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
      duration,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished && !fired.current) {
        fired.current = true;
        onComplete();
      }
    });
  }, [disabled, duration, onComplete, progress]);

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
      {children ?? <Text style={textStyle}>{label}</Text>}
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
  const finishTodo = useRpc(finishTodoRpc);
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
  const removeWorktree = useRpc(removeWorktreeRpc);

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
  const [initialSeed, setInitialSeed] = useState("");
  const [initialView, setInitialView] = useState<"collapsed" | "preview" | "edit">("collapsed");
  const [initialDirty, setInitialDirty] = useState(false);
  const initialRef = useRef("");
  const initialSavedRef = useRef("");
  // 技能框里那个 paseo-committee 是不是我们替用户勾的：是的话切走委员会时才撤
  const committeeSkillAddedRef = useRef(false);
  // 开场向导词三种模式各一份，记"当前这份是哪一份、加载过了没"
  const [initialLoadedKind, setInitialLoadedKind] = useState("");
  // 没保存的草稿按模式各自留着：切模式不丢，切回来还在
  const initialDraftsRef = useRef<
    Record<string, { text: string; saved: string }>
  >({});
  // 输入框是不受控的：换模式换了内容就靠它加 key 重挂，否则框里还是上一份的字
  const [initialRev, setInitialRev] = useState(0);
  const [multiTplSeed, setMultiTplSeed] = useState("");
  const multiTplRef = useRef("");
  const multiTplSavedRef = useRef("");
  const [multiTplDirty, setMultiTplDirty] = useState(false);
  const [multiTplView, setMultiTplView] = useState<"collapsed" | "preview" | "edit">("collapsed");

  const [singleTplSeed, setSingleTplSeed] = useState("");
  const singleTplRef = useRef("");
  const singleTplSavedRef = useRef("");
  const [singleTplDirty, setSingleTplDirty] = useState(false);
  const [singleTplView, setSingleTplView] = useState<"collapsed" | "preview" | "edit">("collapsed");
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
  // 一匹马时指定评审哪一匹：记它的会话号（身份），不记候选位置——归档一匹也不会漂
  const [arbTargetKey, setArbTargetKey] = useState<string | null>(null);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);

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
    setInitialView("collapsed");
    setInitialLoadedKind("");
    setInitialDirty(false);
    setTargetPickerOpen(false);
    committeeSkillAddedRef.current = false;
  }, []);
  const [bindTarget, setBindTarget] = useState<Todo | null>(null);
  const [bindInput, setBindInput] = useState("");
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
  const handleConfirmBind = useCallback(async () => {
    if (!bindTarget) return;
    const cleanNum = bindInput.replace(/\D/g, "");
    if (!cleanNum) {
      toast.show("请输入待办编号（例如 44）", { variant: "info" });
      return;
    }
    const seqNum = parseInt(cleanNum, 10);
    const all = todosQ.data?.todos ?? [];
    const source = all.find((item) => item.seq === seqNum);
    if (!source) {
      toast.show(`未找到待办 #${seqNum}`, { variant: "info" });
      return;
    }
    if (
      !(source.agents ?? []).some((a) => a.agentId || a.terminalId) &&
      !source.workspaceId
    ) {
      toast.show(`待办 #${seqNum} 尚未关联任何会话或工作区`, { variant: "info" });
      return;
    }
    try {
      await updateTodo({
        id: bindTarget.id,
        patch: {
          agents: source.agents,
          worktreeRepo: source.worktreeRepo,
          nextNo: source.nextNo,
          workspaceId: source.workspaceId,
          workspaceName: source.workspaceName,
          projectId: source.projectId,
          projectName: source.projectName,
          projectPath: source.projectPath,
          cwd: source.cwd,
        },
      });
      invalidate();
      setBindTarget(null);
      const horse = firstHorse(source.agents);
      if (horse?.terminalId && source.workspaceId) {
        navigation?.openWorkspace?.({ workspaceId: source.workspaceId });
      } else if (horse?.agentId) {
        navigation?.openAgent?.({ agentId: horse.agentId });
      } else if (source.workspaceId) {
        navigation?.openWorkspace?.({ workspaceId: source.workspaceId });
      }
      toast.show(`已继承 #${seqNum} 会话并跳转`, { variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.show(`绑定失败: ${msg}`, { variant: "info" });
    }
  }, [bindTarget, bindInput, todosQ.data?.todos, updateTodo, invalidate, navigation, toast]);

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
          extraPrompt: d.extraPrompt,
          workspaceId: d.workspaceId,
          workspaceName: d.workspaceName,
          race: Boolean(d.race),
          committee: Boolean(d.committee),
          committeeMembers: d.committeeMembers,
        });
      }
      return startTodo({
        id: d.id,
        agents: d.agents,
        skills: d.skills,
        prompt: d.prompt,
        extraPrompt: d.extraPrompt,
        projectId: d.projectId,
        projectName: d.projectName,
        projectPath: d.projectPath,
        isolation: d.race ? "worktree" : d.isolation,
        baseBranch: d.baseBranch.trim(),
        newBranch: d.newBranch.trim(),
        race: Boolean(d.race),
        committee: Boolean(d.committee),
        committeeMembers: d.committeeMembers,
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
      // 完成不走这里：只有 todo.finish 能标完成
      status: "pending" | "running" | "failed";
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
  // 标完成：服务端先关掉这个任务名下的工作区，关完才标完成
  const finishM = useMutation({
    mutationFn: (id: string) => finishTodo({ id }),
    onSuccess: (res) => {
      if (res.failed.length > 0) {
        toast.show(
          `已标完成，但有 ${res.failed.length} 个工作区没关掉：${res.failed.join("、")}`,
        );
      } else if (res.closed > 0) {
        toast.show(`已完成，关掉 ${res.closed} 个工作区`, {
          variant: "success",
        });
      } else {
        toast.show("已完成", { variant: "success" });
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "完成失败"),
  });

  const delM = useMutation({
    mutationFn: (id: string) => removeTodo({ id }),
    onSuccess: () => {
      toast.show("已删除", { variant: "info" });
      invalidate();
    },
  });
  const preferences: TodoPreferences | undefined = todosQ.data?.preferences;

  const todos: Todo[] = todosQ.data?.todos ?? [];
  // 模式第一次派马时定死：跑过就不给改
  const runTodo: Todo | undefined = run
    ? todos.find((t) => t.id === run.id)
    : undefined;
  const modeLocked = Boolean(
    runTodo &&
      (runTodo.raceMode !== undefined ||
        (runTodo.agents ?? []).some((a) => a.spawnedAt) ||
        Boolean(runTodo.workspaceId)),
  );
  // 跑过的马只显示不给删；剩下的才是这次要派的新马
  const spawnedList = run ? run.agents.filter((a) => a.spawnedAt) : [];
  const pendingAgents = run ? run.agents.filter((a) => !a.spawnedAt) : [];
  const maxHorseNo = run
    ? run.agents.reduce((m, a) => Math.max(m, a.no ?? 0), 0)
    : 0;
  // 新马会拿到的号：接着待办记的"发到几号了"往下发，和派马时发的一致
  const nextHorseNo = runTodo?.nextNo ?? maxHorseNo;
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
  const cands = arbDirsQ.data?.candidates ?? [];
  const arbLiveCount = cands.filter((c) => c.exists).length;
  // 赛马评比只认"每匹马一条分支"：几匹马挤同一个目录不算（那是单马审核）
  const raceLiveCount = new Set(
    cands
      .filter((c) => c.exists && c.ownWorkspace)
      .map((c) => c.dir ?? c.workspaceId),
  ).size;
  const hasMulti = raceLiveCount >= 2;
  const arbTabs = hasMulti
    ? ["赛马评比", "单马审核", "意见回传"]
    : ["单马审核", "意见回传"];
  // 选中哪匹马按会话号认；活着的只有一个时才自动认它，其余情况要你自己选
  const liveCandCount = cands.filter((c) => c.exists).length;
  const selectedTargetIdx =
    arbTargetKey !== null
      ? cands.findIndex((c) => c.agentId === arbTargetKey)
      : liveCandCount === 1
        ? cands.findIndex((c) => c.exists)
        : cands.length === 1
          ? 0
          : -1;
  const loadArbTask = (src: "todo" | "doc", mode: "multi" | "single") => {
    const seed =
      src === "todo"
        ? [arbTodo?.title.trim(), arbTodo?.prompt?.trim()]
            .filter(Boolean)
            .join("\n")
        : (mode === "single"
            ? (cands[selectedTargetIdx]?.taskDoc ?? arbDirsQ.data?.reviewTaskDoc ?? "")
            : (cands.find((c) => c.exists)?.taskDoc ?? arbDirsQ.data?.reviewTaskDoc ?? ""));
    if (!seed.trim()) {
      showArbMsg({
        text: src === "todo" ? "待办里没写内容" : "没找到需求文档",
        bad: true,
      });
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
  const multiTplQ = useQuery({
    queryKey: ["todo-tpl-multi", arb?.id],
    queryFn: () => reviewTemplate({ kind: "multi" }),
    enabled: !!arb && hasMulti,
  });
  const singleTplQ = useQuery({
    queryKey: ["todo-tpl-single", arb?.id],
    queryFn: () => reviewTemplate({ kind: "single" }),
    enabled: !!arb,
  });

  useEffect(() => {
    if (multiTplQ.data?.text !== undefined) {
      multiTplRef.current = multiTplQ.data.text;
      multiTplSavedRef.current = multiTplQ.data.text;
      setMultiTplSeed(multiTplQ.data.text);
      setMultiTplDirty(false);
    }
  }, [multiTplQ.data?.text]);

  useEffect(() => {
    if (singleTplQ.data?.text !== undefined) {
      singleTplRef.current = singleTplQ.data.text;
      singleTplSavedRef.current = singleTplQ.data.text;
      setSingleTplSeed(singleTplQ.data.text);
      setSingleTplDirty(false);
    }
  }, [singleTplQ.data?.text]);
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
      showArbMsg({ text: "整改向导词已保存" });
    },
    onError: (e: Error) =>
      showArbMsg({ text: e.message || "保存失败", bad: true }),
  });
  const saveTplM = useMutation({
    mutationFn: (vars: { kind: "multi" | "single"; text: string }) =>
      reviewTemplate(vars),
    onSuccess: (res, vars) => {
      if (res.error || res.text === undefined) {
        showArbMsg({ text: res.error || "保存失败", bad: true });
        return;
      }
      if (vars.kind === "multi") {
        multiTplSavedRef.current = res.text;
        setMultiTplSeed(res.text);
        setMultiTplDirty(false);
      } else {
        singleTplSavedRef.current = res.text;
        setSingleTplSeed(res.text);
        setSingleTplDirty(false);
      }
      showArbMsg({
        text: `${vars.kind === "multi" ? "赛马" : "评审"}向导词已保存`,
      });
    },
    onError: (e: Error) =>
      showArbMsg({ text: e.message || "保存失败", bad: true }),
  });
  // 开场向导词跟着模式走：普通 / 赛马 / 委员会各一份（跟派马时走同一处判定）
  const initialKind = initialKindOf(
    Boolean(run?.race),
    Boolean(run?.committee),
  );
  const initialLabel = INITIAL_LABEL[initialKind];
  const initialKindRef = useRef(initialKind);
  const initialQ = useQuery({
    queryKey: ["todo-initial-prompt", initialKind],
    queryFn: () => reviewTemplate({ kind: initialKind }),
    enabled: !!run,
  });
  useEffect(() => {
    const prev = initialKindRef.current;
    if (!run) {
      // 弹层关了：模式回普通不算"切模式"，草稿和未保存标记一并收干净
      initialKindRef.current = initialKind;
      initialDraftsRef.current = {};
      if (initialDirty) setInitialDirty(false);
      return;
    }
    if (prev !== initialKind) {
      initialKindRef.current = initialKind;
      // 上一份还有没保存的改动：留成草稿，别让它静默没了
      if (initialDirty) {
        initialDraftsRef.current[prev] = {
          text: initialRef.current,
          saved: initialSavedRef.current,
        };
        toast.show(`${INITIAL_LABEL[prev]}开场向导词还没保存，先替你留着`);
      }
      const draft = initialDraftsRef.current[initialKind];
      if (draft) {
        initialRef.current = draft.text;
        initialSavedRef.current = draft.saved;
        setInitialSeed(draft.text);
        setInitialRev((n) => n + 1);
        setInitialDirty(true);
        // 这份就是草稿：标成已加载，别让下面的加载分支拿服务器原文盖掉
        setInitialLoadedKind(initialKind);
        return;
      }
      // 这份没草稿：先清空，等它自己的内容到了再填，免得把上一份的字写进这一份
      setInitialSeed("");
      setInitialRev((n) => n + 1);
      setInitialDirty(false);
    }
    const text = initialQ.data?.text;
    if (text === undefined || initialLoadedKind === initialKind) return;
    setInitialLoadedKind(initialKind);
    initialRef.current = text;
    initialSavedRef.current = text;
    setInitialSeed(text);
    setInitialRev((n) => n + 1);
    setInitialDirty(false);
  }, [initialQ.data, initialKind, initialLoadedKind, initialDirty, run]);
  const initialSaveM = useMutation({
    mutationFn: (text: string) => reviewTemplate({ kind: initialKind, text }),
    onSuccess: (res) => {
      if (res.error || res.text === undefined) {
        toast.error(res.error || "保存失败");
        return;
      }
      delete initialDraftsRef.current[initialKind];
      initialSavedRef.current = res.text;
      setInitialSeed(res.text);
      setInitialDirty(false);
      toast.show(`${initialLabel}开场向导词已保存`, { variant: "success" });
    },
    onError: (e: Error) => toast.error(e.message || "保存失败"),
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
      targetAgentId?: string;
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
  const removeWorktreeM = useMutation({
    mutationFn: (vars: { id: string; workspaceId: string }) =>
      removeWorktree(vars),
    onSuccess: (res) => {
      if (res.ok) {
        showArbMsg({ text: "已删除该工作区分支" });
        invalidate();
        arbDirsQ.refetch();
      } else {
        showArbMsg({ text: res.error || "删除失败", bad: true });
      }
    },
    onError: (e: Error) => showArbMsg({ text: e.message || "删除失败", bad: true }),
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

  // 切走委员会模式：只撤我们自己勾上的那个技能，用户自己选的一个不动（会复位"我们勾过"这个标记）
  const dropAutoCommitteeSkill = (d: RunDraft): RunDraft => {
    if (!committeeSkillAddedRef.current) return d;
    committeeSkillAddedRef.current = false;
    return { ...d, skills: d.skills.filter((x) => x !== COMMITTEE_SKILL) };
  };

  function openDetail(t?: Todo, issue?: LiveIssue) {
    setPicker(null);
    setInitialView("collapsed");
    setInitialLoadedKind("");
    setInitialDirty(false);
    committeeSkillAddedRef.current = false;
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
    d.extraPrompt = t?.extraPrompt ?? "";
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
    // 赛马模式第一次派马时定死，跑过就不给改
    d.race = t?.raceMode ?? false;
    // 委员会模式：同样跑过不能改；两个成员配置默认沿用上次
    d.committee = t?.committeeMode ?? false;
    // 两个成员留空：逼用户显式选，不默认塞同一个 provider/model
    d.committeeMembers = t?.committeeMembers?.length
      ? t.committeeMembers
      : [
          { provider: "", model: "" },
          { provider: "", model: "" },
        ];
    d.agents = agents;
    d.skills = t?.skills ?? [];
    // 老委员会单：技能以前是服务端硬塞的，库里没有，开弹层时补上，免得被"要先选技能"卡死。
    // 跟点按钮那把尺子一样：只认技能列表，没装就不勾
    if (
      t?.committeeMode &&
      !d.skills.includes(COMMITTEE_SKILL) &&
      Boolean(skillsQ.data?.skills?.includes(COMMITTEE_SKILL))
    ) {
      d.skills = [...d.skills, COMMITTEE_SKILL];
      committeeSkillAddedRef.current = true;
    }
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
          extraPrompt: run.extraPrompt,
          // 模式标记跟着保存走（锁不再看它，不会锁死）；成员只在委员会下存
          committee: Boolean(run.committee),
          ...(run.committee ? { committeeMembers: run.committeeMembers } : {}),
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
        extraPrompt: run.extraPrompt,
        committee: Boolean(run.committee),
        ...(run.committee ? { committeeMembers: run.committeeMembers } : {}),
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
    if (!pendingAgents.length)
      return toast.error("没有新马要派，先加一匹");
    if (run.race) {
      if (run.agents.length < 2) return toast.error("赛马至少 2 匹马");
      if (!run.projectId && !run.projectPath)
        return toast.error("赛马要先选项目（Worktree 需要仓库）");
      if (!run.newBranch.trim()) return toast.error("新建分支名不能为空");
    }
    if (run.committee) {
      if (run.agents.length !== 1) return toast.error("委员会只能一匹马");
      if (
        (run.committeeMembers ?? []).filter((m) => m.provider.trim()).length !== 2
      )
        return toast.error("先给委员会指定两个成员");
    }
    if (!run.workspaceId && !run.race) {
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
    // 跳转认名单里第一匹开过会话的马（归档的马已经不在名单里了）
    const jumpHorse = firstHorse(t.agents);
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
            {isDone ? (
              // 取消完成不危险：随手点回去
              <Pressable
                accessibilityRole="button"
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={{ alignItems: "center", justifyContent: "flex-start", paddingRight: 4 }}
                onPress={() => statusM.mutate({ id: t.id, status: "pending" })}
              >
                <View style={[s.check, s.checkDone]}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                    ✓
                  </Text>
                </View>
              </Pressable>
            ) : (
              // 标完成会关掉工作区：长按才生效
              <HoldToLaunch
                duration={800}
                disabled={false}
                style={{ alignItems: "center", justifyContent: "flex-start", paddingRight: 4 }}
                onComplete={() => finishM.mutate(t.id)}
                onShortPress={() =>
                  toast.show("长按才算完成，会关掉它的工作区")
                }
              >
                <View style={s.check} />
                {isRunning ? <PulsingPurpleDot /> : null}
              </HoldToLaunch>
            )}
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
              {t.workspaceId || jumpHorse ? (
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
          {(isRunning || isFailed) && navigation ? (
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
                if (jumpHorse?.terminalId && t.workspaceId) {
                  navigation.openWorkspace({ workspaceId: t.workspaceId });
                } else if (jumpHorse?.agentId) {
                  navigation.openAgent({ agentId: jumpHorse.agentId });
                } else if (t.workspaceId) {
                  navigation.openWorkspace({ workspaceId: t.workspaceId });
                } else {
                  setBindInput("");
                  setBindTarget(t);
                }
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: (jumpHorse || t.workspaceId)
                    ? theme.colors.accent
                    : theme.colors.foregroundMuted,
                  fontWeight: "700",
                  lineHeight: 15,
                }}
              >
                ↗
              </Text>
            </Pressable>
          ) : null}
          {(t.agents ?? []).some((a) => a.branch) ||
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
              <HoldToLaunch
                duration={800}
                disabled={false}
                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                textStyle={{ fontSize: 13, color: theme.colors.statusDanger, fontWeight: "500" }}
                label="删除任务"
                onComplete={() => {
                  setMenuTodo(null);
                  delM.mutate(t.id);
                }}
                onShortPress={() => toast.show("长按才删除任务")}
              />
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

  const renderReviewConfig = (mode: "multi" | "single") => {
    if (!arb || !arbTodo) return null;
    const isMulti = mode === "multi";
    // 单马审核（赛马切过来也一样）：活着的候选不止一匹时必须自己选，不默认替你选第一匹
    const needTargetPick =
      !isMulti &&
      liveCandCount > 1 &&
      cands[selectedTargetIdx]?.exists !== true;
    const canStart = isMulti
      ? raceLiveCount >= 2 && !arbDirsQ.isLoading
      : (arbLiveCount >= 1 || !!arbDirsQ.data?.reviewDir) &&
        !arbDirsQ.isLoading &&
        !needTargetPick;
    const tplSeed = isMulti ? multiTplSeed : singleTplSeed;
    const tplDirty = isMulti ? multiTplDirty : singleTplDirty;
    const tplView = isMulti ? multiTplView : singleTplView;
    const setTplView = isMulti ? setMultiTplView : setSingleTplView;
    const tplRef = isMulti ? multiTplRef : singleTplRef;
    const tplSavedRef = isMulti ? multiTplSavedRef : singleTplSavedRef;
    const setTplDirty = isMulti ? setMultiTplDirty : setSingleTplDirty;

    return (
      <View key={mode} style={{ width: pageW || undefined, flex: 1 }}>
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
                      const sendIdx = hasMulti ? 2 : 1;
                      setPage(sendIdx);
                      pagerRef.current?.scrollTo({ x: sendIdx * pageW, animated: true });
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
          </View>

          <View style={s.formSection}>
            <Text style={s.formSectionTitle}>评审员 *</Text>
            <Pressable
              style={s.chip}
              onPress={() => {
                setSearch("");
                setPicker(
                  picker?.kind === "reviewer"
                    ? null
                    : {
                        kind: "reviewer",
                        step: "provider",
                        provider: arb.reviewer.provider || "",
                      },
                );
              }}
            >
              <Text
                style={arb.reviewer.provider ? s.chipText : s.chipMuted}
                numberOfLines={1}
              >
                {agentLabel(arb.reviewer)}
              </Text>
              <Text
                style={{
                  color: theme.colors.foregroundMuted,
                  fontSize: 14,
                }}
              >
                {picker?.kind === "reviewer" ? "▲" : "▼"}
              </Text>
            </Pressable>
            {picker?.kind === "reviewer" ? (
              <View style={s.inlinePicker}>
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
                />
                {picker.step === "provider"
                  ? renderPickList(
                      (providersQ.data?.providers ?? []).map((p) => ({
                        id: p.id,
                        label: p.id,
                        sub: p.available ? undefined : "未配置",
                        selected: arb.reviewer.provider === p.id,
                      })),
                      (item) => {
                        setArb((d) =>
                          d
                            ? {
                                ...d,
                                reviewer: { provider: item.id, model: "" },
                              }
                            : d,
                        );
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
                          label: "默认模型",
                          selected: !arb.reviewer.model,
                        },
                        ...((modelsQ.data?.models ?? []) as Array<{
                          id: string;
                          label?: string;
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
              {isMulti ? `全部候选工作区 (共 ${raceLiveCount} 匹马)` : "选择审核目标"}
            </Text>
            {arbDirsQ.isLoading ? (
              <Text style={s.empty}>找目录中…</Text>
            ) : arbDirsQ.data?.error ? (
              <Text style={s.err}>{arbDirsQ.data.error}</Text>
            ) : isMulti && raceLiveCount < 2 ? (
              <Text style={s.err}>
                有效候选只有 {raceLiveCount} 个（需 ≥2），可能已被归档
              </Text>
            ) : !isMulti && arbLiveCount < 1 && !arbDirsQ.data?.reviewDir ? (
              <Text style={s.err}>找不到可评审的目录</Text>
            ) : cands.length === 0 ? (
              arbDirsQ.data?.reviewDir ? (
                <View
                  style={[
                    s.chip,
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.surface2,
                    },
                  ]}
                >
                  <Text style={[s.chipText, { color: theme.colors.accent }]}>
                    本地目录  ·  已选定
                  </Text>
                  <Text style={s.pathText} numberOfLines={1}>
                    {arbDirsQ.data.reviewDir}
                  </Text>
                </View>
              ) : (
                <Text style={s.empty}>没有候选工作区</Text>
              )
            ) : isMulti ? (
              cands.map((c, idx) => (
                <View key={c.agentId ?? `${c.workspaceId}-${idx}`} style={[s.chip, { gap: 2, paddingVertical: 6, paddingHorizontal: 10 }]}>
                  <Text style={s.chipText}>
                    {c.label}
                    {c.exists ? "" : "  ·  目录已失效"}
                  </Text>
                  <Text
                    style={[
                      s.pathText,
                      !c.exists && { color: theme.colors.statusDanger },
                    ]}
                    numberOfLines={1}
                  >
                    {c.branch}  ·  {c.dir || "未知目录"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{ gap: 6 }}>
                <Pressable
                  style={s.chip}
                  onPress={() => setTargetPickerOpen(!targetPickerOpen)}
                >
                  <Text
                    style={cands[selectedTargetIdx] ? s.chipText : s.chipMuted}
                    numberOfLines={1}
                  >
                    {cands[selectedTargetIdx]
                      ? cands[selectedTargetIdx].label
                      : "选择审核目标…"}
                  </Text>
                  <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                    {targetPickerOpen ? "▲" : "▼"}
                  </Text>
                </Pressable>
                {needTargetPick ? (
                  <Text style={s.empty}>先选审的是哪匹马，再发起</Text>
                ) : null}
                {cands[selectedTargetIdx] ? (
                  <Text style={[s.pathText, { paddingHorizontal: 4 }]} numberOfLines={1}>
                    {cands[selectedTargetIdx].branch
                      ? `${cands[selectedTargetIdx].branch}  ·  `
                      : ""}
                    {cands[selectedTargetIdx].dir || "未知目录"}
                  </Text>
                ) : null}
                {targetPickerOpen ? (
                  <View style={[s.inlinePicker, { gap: 4, paddingVertical: 4 }]}>
                    {cands.map((c, idx) => {
                      const isPicked = selectedTargetIdx === idx;
                      const isWorktree = Boolean(c.ownWorkspace);
                      return (
                        <View
                          key={c.agentId ?? `${c.workspaceId}-${idx}`}
                          style={[
                            s.chip,
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 8,
                              paddingHorizontal: 10,
                              borderColor: isPicked
                                ? theme.colors.accent
                                 : theme.colors.border,
                              backgroundColor: isPicked
                                ? theme.colors.surface2
                                : "transparent",
                            },
                          ]}
                        >
                          <Pressable
                            style={{ flex: 1, gap: 2 }}
                            onPress={() => {
                              setArbTargetKey(c.agentId ?? null);
                              setTargetPickerOpen(false);
                            }}
                          >
                            <Text
                              style={[
                                s.chipText,
                                isPicked && { color: theme.colors.accent },
                              ]}
                            >
                              {c.label}
                              {c.exists ? "" : "  ·  目录已失效"}
                              {isPicked ? "  ·  已选定" : ""}
                            </Text>
                            <Text
                              style={[
                                s.pathText,
                                !c.exists && {
                                  color: theme.colors.statusDanger,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {c.branch}  ·  {c.dir || "未知目录"}
                            </Text>
                          </Pressable>
                          {isWorktree ? (
                            <HoldToLaunch
                              duration={800}
                              disabled={removeWorktreeM.isPending}
                              style={{
                                padding: 6,
                                opacity: removeWorktreeM.isPending ? 0.4 : 0.8,
                              }}
                              textStyle={{
                                color: theme.colors.statusDanger,
                                fontSize: 15,
                                fontWeight: "700",
                              }}
                              label="✕"
                              onComplete={() =>
                                removeWorktreeM.mutate({
                                  id: arb.id,
                                  workspaceId: c.workspaceId,
                                })
                              }
                              onShortPress={() =>
                                toast.show("长按才删掉这条候选")
                              }
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            )}
          </View>

          <View style={s.formSection}>
            {collapseRow(
              `需求详情${
                arbTaskSeed.trim()
                  ? ` · ${arbTaskSeed.trim().split("\n").length} 行`
                  : ""
              }`,
              taskView !== "collapsed",
              () =>
                setTaskView(
                  taskView === "collapsed" ? "preview" : "collapsed",
                ),
              <>
                <Pressable
                  style={[s.btn, { paddingHorizontal: 10, paddingVertical: 4 }]}
                  onPress={() => loadArbTask("todo", mode)}
                >
                  <Text style={s.btnText}>导入待办</Text>
                </Pressable>
                <Pressable
                  style={[s.btn, { paddingHorizontal: 10, paddingVertical: 4 }]}
                  onPress={() => loadArbTask("doc", mode)}
                >
                  <Text style={s.btnText}>导入清单</Text>
                </Pressable>
              </>,
            )}
            {taskView !== "collapsed" ? (
              <>
                <Text style={s.pathText}>
                  评审员按此要求逐条核对改动；可手动编辑，留空由评审员自行判断。
                </Text>
                {taskView === "preview" ? (
                  <>
                    <Text style={s.tplPreview}>
                      {arbTaskSeed || "（空）"}
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
                      placeholder="需求与验收标准…"
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
              </>
            ) : null}
          </View>

          <View style={s.formSection}>
            {collapseRow(
              `${isMulti ? "赛马向导词" : "评审向导词"}${
                tplDirty ? "（已修改未保存）" : ""
              }`,
              tplView !== "collapsed",
              () => setTplView(tplView === "collapsed" ? "preview" : "collapsed"),
            )}
            {tplView !== "collapsed" ? (
              <>
                <Text style={s.pathText}>
                  空位：{"{{task}}"}需求 {"{{targets}}"}候选 {"{{base}}"}基线 {"{{verdictFile}}"}结果路径
                </Text>
                {tplView === "preview" ? (
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
                      key={`arb-tpl-${arb.id}-${mode}`}
                      style={s.inputMulti}
                      initial={tplSeed}
                      onValue={(v) => {
                        tplRef.current = v;
                        setTplDirty(v !== tplSavedRef.current);
                      }}
                      placeholderTextColor={theme.colors.foregroundMuted}
                      multiline
                    />
                    <Pressable
                      style={[
                        s.btn,
                        { alignSelf: "flex-start", marginTop: 8 },
                        (saveTplM.isPending || !tplDirty) && { opacity: 0.5 },
                      ]}
                      disabled={saveTplM.isPending || !tplDirty}
                      onPress={() =>
                        saveTplM.mutate({ kind: mode, text: tplRef.current })
                      }
                    >
                      <Text style={s.btnText}>
                        {saveTplM.isPending ? "保存中…" : "保存模板"}
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : null}
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
                      请先填写需求详情
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
                    !canStart) && { opacity: 0.5 },
                ]}
                disabled={
                  arbStartM.isPending ||
                  arbTodo.review?.status === "running" ||
                  !arb.reviewer.provider ||
                  !canStart
                }
                onPress={() => {
                  if (tplDirty) {
                    setArbMsg({ text: "向导词改了还没保存，先点保存模板", bad: true });
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
                    kind: mode,
                    task: arbTaskRef.current,
                    reviewer: arb.reviewer,
                    ...(!isMulti && cands[selectedTargetIdx]?.agentId
                      ? { targetAgentId: cands[selectedTargetIdx].agentId }
                      : {}),
                  });
                }}
              >
                <Text style={s.saveText}>
                  {arbStartM.isPending ||
                  arbTodo.review?.status === "running"
                    ? "评审中…"
                    : isMulti
                      ? "发起赛马评比"
                      : hasMulti
                        ? "发起单马审核"
                        : "发起审核"}
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
    );
  };
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
            <Text style={s.formSectionTitle}>模式 *</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={[
                  s.segBtn,
                  s.seg,
                  { flex: 1 },
                  !run.race && !run.committee && s.segOn,
                ]}
                disabled={modeLocked}
                onPress={() =>
                  setRun({
                    ...dropAutoCommitteeSkill(run),
                    race: false,
                    committee: false,
                  })
                }
              >
                <Text
                  style={[
                    s.segText,
                    !run.race && !run.committee && s.segTextOn,
                  ]}
                >
                  普通
                </Text>
              </Pressable>
              <Pressable
                style={[s.segBtn, s.seg, { flex: 1 }, run.committee && s.segOn]}
                disabled={modeLocked}
                onPress={() => {
                  const known = skillsQ.data?.skills;
                  // 只认技能列表：没装就不勾；已经在委员会里也不把用户删掉的勾回来
                  const auto =
                    !run.committee &&
                    !run.skills.includes(COMMITTEE_SKILL) &&
                    Boolean(known?.includes(COMMITTEE_SKILL));
                  if (auto) committeeSkillAddedRef.current = true;
                  setRun({
                    ...run,
                    race: false,
                    committee: true,
                    agents: run.agents.slice(0, 1),
                    skills: auto
                      ? [...run.skills, COMMITTEE_SKILL]
                      : run.skills,
                  });
                }}
              >
                <Text style={[s.segText, run.committee && s.segTextOn]}>
                  委员会
                </Text>
              </Pressable>
              <Pressable
                style={[s.segBtn, s.seg, { flex: 1 }, run.race && s.segOn]}
                disabled={modeLocked}
                onPress={() =>
                  setRun({
                    ...dropAutoCommitteeSkill(run),
                    race: true,
                    committee: false,
                    isolation: "worktree",
                  })
                }
              >
                <Text style={[s.segText, run.race && s.segTextOn]}>赛马</Text>
              </Pressable>
            </View>
            <Text style={s.empty}>
              {run.committee
                ? "委员会：只 1 匹马，可 Local 可 Worktree；另指定两个成员，由它派生"
                : run.race
                  ? "赛马：至少 2 匹马、必须 Worktree；每匹马一条分支，主干留给审核"
                  : "普通：一个工作区，马都在里面"}
              {modeLocked ? "（这单已经开始跑，模式不能改）" : ""}
            </Text>
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

              {run.race ? null : (
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
                  onPress={() => {
                    // 框里空着就拿标题填一下，替你打一次字；之后这个框和标题互不相干
                    const titleNow =
                      runTitleRef.current.trim() || run.title.trim();
                    setRun({
                      ...run,
                      isolation: "worktree",
                      newBranch:
                        run.newBranch.trim() ||
                        (titleNow ? branchFromTitle(titleNow) : ""),
                    });
                  }}
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
              )}

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
            {collapseRow(
              `${initialLabel}开场向导词${initialDirty ? "（已修改未保存）" : ""}`,
              initialView !== "collapsed",
              () =>
                setInitialView(initialView === "collapsed" ? "preview" : "collapsed"),
            )}
            {initialView !== "collapsed" ? (
              <>
                <Text style={s.pathText}>
                  开场向导词模板，支持 {"{{docPath}}"}（文档路径）、{"{{id}}"}（工作区ID）与 {"{{members}}"}（委员会两个成员）：
                </Text>
                {initialQ.isLoading ? (
                  <Text style={s.empty}>读取中…</Text>
                ) : initialQ.data?.error ? (
                  <Text style={s.err}>{initialQ.data.error}</Text>
                ) : initialView === "preview" ? (
                  <>
                    <Text style={s.tplPreview}>
                      {initialSeed || "（空）"}
                    </Text>
                    <Pressable
                      style={[
                        s.btn,
                        { alignSelf: "flex-start", marginTop: 6 },
                      ]}
                      onPress={() => setInitialView("edit")}
                    >
                      <Text style={s.btnText}>编辑</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <StableInput
                      key={`initial-tpl-${initialKind}-${initialRev}`}
                      style={s.inputMulti}
                      initial={initialSeed}
                      // 这一份的内容还没到手时先锁住：免得敲进去的字被随后重挂覆盖
                      editable={initialLoadedKind === initialKind && !initialQ.isLoading}
                      onValue={(v) => {
                        initialRef.current = v;
                        setInitialDirty(v !== initialSavedRef.current);
                      }}
                      placeholder="开场向导词模板，支持 {{docPath}} 与 {{id}} 变量…"
                      placeholderTextColor={theme.colors.foregroundMuted}
                      multiline
                    />
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <Pressable
                        style={[
                          s.btn,
                          (initialSaveM.isPending || !initialDirty) && {
                            opacity: 0.5,
                          },
                        ]}
                        disabled={initialSaveM.isPending || !initialDirty}
                        onPress={() => initialSaveM.mutate(initialRef.current)}
                      >
                        <Text style={s.btnText}>
                          {initialSaveM.isPending ? "保存中…" : "保存"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[s.btn, { backgroundColor: theme.colors.surface2 }]}
                        onPress={() => setInitialView("preview")}
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

          <View style={s.formSection}>
            <Text style={s.formSectionTitle}>
              {run.committee
                ? `放马（委员会只 1 匹，成员由它派生${
                    spawnedList.length ? ` · 已跑 ${spawnedList.length} 匹` : ""
                  }）`
                : `放马（${pendingAgents.length} 匹要派${
                    spawnedList.length ? ` · 已跑 ${spawnedList.length} 匹` : ""
                  }，多个并行）`}
            </Text>
            {spawnedList.length > 0 ? (
              <Text style={s.empty}>
                已跑过：{spawnedList
                  .map((a) => `#${a.no ?? run.agents.indexOf(a) + 1} ${agentLabel(a)}`)
                  .join(" · ")}
                （跑过的不给删）
              </Text>
            ) : null}
            {run.agents.map((a, i) => {
              if (a.spawnedAt) return null;
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
                      {`#${nextHorseNo + pendingAgents.indexOf(a) + 1}  ${agentLabel(a)}`}
                    </Text>
                    <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                      ▼
                    </Text>
                  </Pressable>
                  {run.committee ? null : (
                  <Pressable
                    style={s.iconBtn}
                    disabled={pendingAgents.length <= 1 && spawnedList.length === 0}
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
                        opacity:
                          pendingAgents.length <= 1 && spawnedList.length === 0
                            ? 0.3
                            : 1,
                      }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                  )}
                </View>
              );
            })}
            {run.committee ? null : (
            <Pressable style={s.addAgent} onPress={() => {
              const defAgent: AgentRef = preferences?.lastProvider
                ? { provider: preferences.lastProvider, model: preferences.lastModel }
                : { provider: "", model: "" };
              setRun((d) => d ? { ...d, agents: [...d.agents, defAgent] } : null);
            }}>
              <Text style={s.addAgentText}>+ 加一个</Text>
            </Pressable>
            )}
          </View>

          {run.committee ? (
            <View style={s.formSection}>
              <Text style={s.formSectionTitle}>委员会成员（两个，由这匹马派生）</Text>
              {[0, 1].map((mi) => {
                const m = run.committeeMembers?.[mi] ?? { provider: "", model: "" };
                return (
                  <View key={mi} style={s.agentRow}>
                    <Pressable
                      style={[s.chip, s.agentChip]}
                      onPress={() => {
                        setSearch("");
                        setPicker({
                          kind: "agent",
                          step: "provider",
                          index: mi,
                          provider: m.provider || "",
                          target: "members",
                        });
                      }}
                    >
                      <Text
                        style={m.provider ? s.chipText : s.chipMuted}
                        numberOfLines={1}
                      >
                        {`成员 ${mi + 1}  ${agentLabel(m)}`}
                      </Text>
                      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                        ▼
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}

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
                        : pendingAgents.length > 1
                          ? `全军出击 ×${pendingAgents.length}`
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
              ? `选择 Provider (${
                  picker.target === "members"
                    ? `成员 ${picker.index + 1}`
                    : `#${picker.index + 1}`
                })`
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
                      target: picker.target,
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
                      selected:
                        (picker.target === "members"
                          ? run.committeeMembers
                          : run.agents)?.[picker.index]?.provider === p.id,
                    })),
                    (item) => {
                      setSearch("");
                      setPicker({
                        kind: "agent",
                        index: picker.index,
                        step: "model",
                        provider: item.id,
                        target: picker.target,
                      });
                    }
                  )
                : renderPickList(
                    [
                      {
                        id: "",
                        label: "（默认 Model）",
                        sub: "使用 Provider 默认模型",
                        selected: !(picker.target === "members"
                          ? run.committeeMembers
                          : run.agents)?.[picker.index]?.model,
                      },
                      ...((modelsQ.data?.models ?? []) as Array<{ id: string; label: string }>).map((m) => ({
                        id: m.id,
                        label: m.label || m.id,
                        sub: m.label && m.label !== m.id ? m.id : undefined,
                        selected:
                          (picker.target === "members"
                            ? run.committeeMembers
                            : run.agents)?.[picker.index]?.model === m.id,
                      })),
                    ],
                    (item) => {
                      const provider = picker.provider;
                      const model = item.id;
                      const idx = picker.index;
                      const isMember = picker.target === "members";
                      setRun((d) => {
                        if (!d) return null;
                        if (isMember) {
                          const next = [...(d.committeeMembers ?? [])];
                          next[idx] = { provider, model };
                          return { ...d, committeeMembers: next };
                        }
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
            multiTplRef.current = "";
            multiTplSavedRef.current = "";
            setMultiTplSeed("");
            setMultiTplDirty(false);
            setMultiTplView("collapsed");
            singleTplRef.current = "";
            singleTplSavedRef.current = "";
            setSingleTplSeed("");
            setSingleTplDirty(false);
            setSingleTplView("collapsed");
            setArbTargetKey(null);
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
                  {arbTabs.map((label, i) => (
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
                  {hasMulti ? renderReviewConfig("multi") : null}
                  {renderReviewConfig("single")}
                <View style={{ width: pageW || undefined, flex: 1 }}>
              <SheetScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                  s.scrollBody,
                  { padding: layout.compact ? 16 : 24, paddingBottom: 40 },
                ]}
                keyboardShouldPersistTaps="handled"
              >
                <View style={s.formSection}>
                  {collapseRow(
                    `评审结论${
                      arbVerdictQ.data?.verdict
                        ? ` · ${(arbVerdictQ.data.verdict.split("\n", 1)[0] ?? "").trim()}`
                        : ""
                    }`,
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
                        {arbVerdictQ.data?.verdict || "（空）"}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {arbTodo.review?.status === "running" ? (
                  <View style={s.formSection}>
                    <Text style={s.pathText}>评审员正在审阅中，生成结论后可在此展开查看并下发…</Text>
                  </View>
                ) : arbVerdictQ.data?.verdict ? null : (
                  <View style={s.formSection}>
                    <Text style={s.pathText}>请先进行评审。</Text>
                  </View>
                )}

              <View style={s.formSection}>
                {collapseRow(
                  `整改向导词${sendDirty ? "（已修改未保存）" : ""}`,
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
      <Modal
        title={bindTarget ? `绑定会话 · #${bindTarget.seq ?? ""} ${bindTarget.title}` : ""}
        icon={<Icon name="Link" size={18} color={theme.colors.foreground} />}
        open={Boolean(bindTarget)}
        onOpenChange={(open) => {
          if (!open) setBindTarget(null);
        }}
      >
        <Modal.Content>
          <View style={{ gap: 14, paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, color: theme.colors.foregroundMuted, lineHeight: 18 }}>
              当前待办尚未关联会话。输入已有会话的待办编号（例如 44），将直接继承其会话并跳转：
            </Text>
            <StableInput
              initial={bindInput}
              onValue={setBindInput}
              placeholder="输入待办编号，例如 44"
              placeholderTextColor={theme.colors.foregroundMuted}
              style={[
                s.input,
                {
                  fontSize: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                },
              ]}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <Pressable
                style={[s.btn, { paddingHorizontal: 14, paddingVertical: 7 }]}
                onPress={() => setBindTarget(null)}
              >
                <Text style={s.btnText}>取消</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnPrimary, { paddingHorizontal: 16, paddingVertical: 7 }]}
                onPress={handleConfirmBind}
              >
                <Text style={[s.btnText, s.btnTextPrimary]}>确定并跳转</Text>
              </Pressable>
            </View>
          </View>
        </Modal.Content>
      </Modal>
      </View>
    );
  }
