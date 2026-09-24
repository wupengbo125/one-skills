import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  addTodoRpc,
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
  completeByAgentId,
  completeByWorkspaceId,
  handleStartTodo,
  stashWorkspaceProject,
} from "./server/executor";
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

  server.on("agent.turn_ended", (event) => {
    if (event.outcome.kind === "completed") return;
    const outcome =
      event.outcome.kind === "failed" ? "failed" : "canceled";
    const errMsg =
      event.outcome.kind === "failed" ? event.outcome.error.message : undefined;
    completeByAgentId(event.agent.id, outcome, errMsg);
  });

  server.on("workspace.archived", (event) => {
    stashWorkspaceProject(event.workspace.id, event.workspace.projectId);
    completeByWorkspaceId(
      event.workspace.id,
      event.workspace.archivedAt ?? undefined,
    );
  });

  return () => {};
}
