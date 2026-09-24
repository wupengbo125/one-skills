import type { TodoIsolation } from "../shared/todo";

export type PlacementInput = {
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  workspaceId?: string;
  workspaceName?: string;
  cwd?: string;
  isolation?: TodoIsolation;
};

export type PlacementFields = {
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  isolation?: TodoIsolation;
  workspaceId?: string;
  workspaceName?: string;
  cwd?: string;
};

/**
 * Narrows the flat placement fields a caller may send. A workspace target keeps
 * its projectId/projectPath when present, so a stale workspace can still fall
 * back to its project directory (see server/executor.ts).
 */
export function toPlacement(input: PlacementInput): PlacementFields {
  const hasProject = Boolean(input.projectId || input.projectPath);
  const hasWorkspace = Boolean(input.workspaceId);
  return {
    projectId: input.projectId || undefined,
    projectName: hasProject
      ? input.projectName?.trim() || undefined
      : undefined,
    projectPath: input.projectPath || undefined,
    isolation: input.isolation ?? (hasProject ? "local" : undefined),
    workspaceId: input.workspaceId || undefined,
    workspaceName: hasWorkspace
      ? input.workspaceName?.trim() || undefined
      : undefined,
    cwd:
      hasProject || hasWorkspace ? undefined : input.cwd?.trim() || undefined,
  };
}
