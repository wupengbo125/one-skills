import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  addTodoRpc,
  arbitrationDirsRpc,
  arbitrationSendRpc,
  arbitrationStartRpc,
  arbitrationVerdictRpc,
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
  handleStartTodo,
  stashWorkspaceProject,
} from "./server/executor";
import {
  cleanupArbitrationBranch,
  completeArbitration,
  handleArbitrationDirs,
  handleArbitrationSend,
  handleArbitrationStart,
  handleArbitrationVerdict,
} from "./server/arbitration";
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
  server.handle(arbitrationDirsRpc, (input, ctx) =>
    handleArbitrationDirs(input, ctx),
  );
  server.handle(arbitrationStartRpc, (input, ctx) =>
    handleArbitrationStart(input, ctx),
  );
  server.handle(arbitrationVerdictRpc, (input, ctx) =>
    handleArbitrationVerdict(input, ctx),
  );
  server.handle(arbitrationSendRpc, (input, ctx) =>
    handleArbitrationSend(input, ctx),
  );

  server.on("agent.turn_ended", (event) => {
    const errMsg =
      event.outcome.kind === "failed" ? event.outcome.error.message : undefined;
    const outcome =
      event.outcome.kind === "failed"
        ? "failed"
        : event.outcome.kind === "canceled"
          ? "canceled"
          : "completed";
    // 判官只翻仲裁状态，不碰待办本身
    if (completeArbitration(event.agent.id, outcome, errMsg)) return;
    if (event.outcome.kind === "completed") return;
    completeByAgentId(event.agent.id, outcome, errMsg);
  });

  server.on("workspace.archived", (event) => {
    stashWorkspaceProject(event.workspace.id, event.workspace.projectId);
    cleanupWorkspaceBranches(event.workspace.id);
    void cleanupArbitrationBranch(event.workspace.id);
    completeByWorkspaceId(
      event.workspace.id,
      event.workspace.archivedAt ?? undefined,
    );
  });

  return () => {};
}
