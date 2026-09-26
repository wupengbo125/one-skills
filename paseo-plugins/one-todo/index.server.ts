import type { PluginServerContext } from "@getpaseo/plugin/server";
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
  completeByWorkspaceId,
  reviveByAgentId,
  handleStartTodo,
  stashWorkspaceProject,
} from "./server/executor";
import {
  cleanupReviewArtifacts,
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
  server.handle(reviewAbortRpc, (input, ctx) =>
    handleReviewAbort(input, ctx),
  );
  server.handle(reviewContinueRpc, (input, ctx) =>
    handleReviewContinue(input, ctx),
  );
  server.handle(reviewTemplateRpc, (input) => handleReviewTemplate(input));

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
    if (event.outcome.kind === "completed") {
      const done = completeByAgentId(event.agent.id, outcome, errMsg);
      if (done?.status === "done") void autoStartReview(done.id, paseo);
      return;
    }
    const finished = completeByAgentId(event.agent.id, outcome, errMsg);
    if (finished?.status === "done") void autoStartReview(finished.id, paseo);
  });

  server.on("workspace.archived", (event, { paseo }) => {
    stashWorkspaceProject(event.workspace.id, event.workspace.projectId);
    cleanupWorkspaceBranches(event.workspace.id);
    void cleanupReviewArtifacts(event.workspace.id);
    completeByWorkspaceId(
      event.workspace.id,
      event.workspace.archivedAt ?? undefined,
    );
    // 归档可能把待办推成「已完成」：开着自动的就接着发起评审
    for (const t of listTodos()) {
      if (t.status === "done" && (t.autoReview?.maxRounds ?? 0) !== 0) {
        void autoStartReview(t.id, paseo);
      }
    }
  });

  return () => {};
}
