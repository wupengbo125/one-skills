import type { PluginServerContext } from "@getpaseo/plugin/server";
import { finishTodoRpc, removeWorktreeRpc, removeHorseRpc, resetTodoRpc, listInitialPromptsRpc, deleteInitialPromptRpc } from "./shared/todo";
import { listTodos } from "./server/store";
import {
  addTodoRpc,
  reviewDirsRpc,
  reviewAbortRpc,
  reviewContinueRpc,
  reviewSendRpc,
  reviewStartRpc,
  reviewVerdictRpc,
  createIssueRpc,
  fetchIssueRpc,
  handleAddTodo,
  handleListModels,
  handleListProjects,
  handleListProviders,
  handleListSkills,
  handleListTodos,
  handleListWorkspaces,
  handleRemoveTodo,
  handleUpdateTodo,
  reviewTemplateRpc,
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
} from "./server/todo";
import {
  cleanupWorkspaceBranches,
  completeByAgentId,
  reviveByAgentId,
  handleFinishTodo,
  handleResetTodo,
  handleStartTodo,
  stashWorkspaceProject,
} from "./server/executor";
import { horseBySession } from "./shared/todo";
import {
  cleanupReviewArtifacts,
  autoOn,
  turnTouchedCode,
  completeReview,
  autoStartReview,
  autoAdvanceReview,
  handleReviewAbort,
  handleReviewContinue,
  handleReviewDirs,
  handleReviewSend,
  handleReviewStart,
  handleReviewVerdict,
  handleReviewTemplate,
  handleListInitialPrompts,
  handleDeleteInitialPrompt,
  handleRemoveWorktree,
  handleRemoveHorse,
} from "./server/review";
import {
  handleCreateIssue,
  handleFetchIssue,
  handleListIssues,
} from "./server/github";

export default function contribute(server: PluginServerContext) {
  server.handle(listTodosRpc, () => handleListTodos());
  server.handle(addTodoRpc, (input) => handleAddTodo(input));
  server.handle(updateTodoRpc, (input) => handleUpdateTodo(input));
  server.handle(removeTodoRpc, (input) => handleRemoveTodo(input));
  server.handle(startTodoRpc, (input, ctx) => handleStartTodo(input, ctx));
  server.handle(finishTodoRpc, (input, ctx) => handleFinishTodo(input, ctx));
  server.handle(resetTodoRpc, (input, ctx) => handleResetTodo(input, ctx));
  server.handle(listProvidersRpc, (_input, ctx) => handleListProviders(ctx));
  server.handle(listModelsRpc, (input, ctx) => handleListModels(input, ctx));
  server.handle(listWorkspacesRpc, (_input, ctx) => handleListWorkspaces(ctx));
  server.handle(listProjectsRpc, (_input, ctx) => handleListProjects(ctx));
  server.handle(listIssuesRpc, (input, ctx) => handleListIssues(input, ctx));
  server.handle(fetchIssueRpc, (input) => handleFetchIssue(input));
  server.handle(createIssueRpc, (input) => handleCreateIssue(input));
  server.handle(listSkillsRpc, () => handleListSkills());
  server.handle(reviewDirsRpc, (input, ctx) =>
    handleReviewDirs(input, ctx),
  );
  server.handle(reviewStartRpc, (input, ctx) =>
    handleReviewStart(input, ctx),
  );
  server.handle(reviewVerdictRpc, (input, ctx) =>
    handleReviewVerdict(input, ctx),
  );
  server.handle(reviewSendRpc, (input, ctx) =>
    handleReviewSend(input, ctx),
  );
  server.handle(reviewAbortRpc, (input) => handleReviewAbort(input));
  server.handle(reviewContinueRpc, (input, ctx) =>
    handleReviewContinue(input, ctx),
  );
  server.handle(reviewTemplateRpc, (input) => handleReviewTemplate(input));
  server.handle(listInitialPromptsRpc, () => handleListInitialPrompts());
  server.handle(deleteInitialPromptRpc, (input) => handleDeleteInitialPrompt(input));
  server.handle(removeWorktreeRpc, (input, ctx) =>
    handleRemoveWorktree(input, ctx),
  );
  server.handle(removeHorseRpc, (input, ctx) =>
    handleRemoveHorse(input, ctx),
  );

  server.on("agent.turn_started", (event) => {
    // 会话又跑起来了：之前的失败作废，待办恢复进行中
    reviveByAgentId(event.agent.id);
  });

  server.on("agent.turn_ended", (event, { paseo }) => {
    const errMsg =
      event.outcome.kind === "failed" ? event.outcome.error.message : undefined;
    const outcome =
      event.outcome.kind === "failed"
        ? "failed"
        : event.outcome.kind === "canceled"
          ? "canceled"
          : "completed";
    // 评审员只翻评审状态，不碰待办本身
    if (completeReview(event.agent.id, outcome, errMsg)) {
      // 评审刚出结果：自动发回或收工
      const hit = listTodos().find((t) => t.review?.agentId === event.agent.id);
      if (hit) void autoAdvanceReview(hit.id, paseo);
      return;
    }
    // 报错只标失败，名单不动：马再跑起来由 turn_started 自动恢复
    if (outcome === "failed" || outcome === "canceled") {
      completeByAgentId(event.agent.id, outcome, errMsg);
      return;
    }

    // 干活马回合正常结束 (completed)：会话保持存活，直接自动触发审核
    const todo = listTodos().find(
      (t) => t.status === "running" && horseBySession(t.agents, event.agent.id),
    );
    if (!todo) return;

    // 只是说话没动代码的回合不拉评审（上次就是因为这条空跑了一轮）
    if (autoOn(todo) && turnTouchedCode(event.timeline ?? [])) {
      void autoStartReview(todo.id, paseo, event.agent.id);
    }
  });

  // 归档一律不碰待办：任务完没完由人点完成决定
  server.on("workspace.archived", (event) => {
    stashWorkspaceProject(event.workspace.id, event.workspace.projectId);
    void cleanupWorkspaceBranches(event.workspace.id);
    void cleanupReviewArtifacts(event.workspace.id);
  });

  return () => {};
}
