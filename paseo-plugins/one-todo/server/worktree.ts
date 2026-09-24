import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(repo: string, args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", repo, ...args], {
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
}

/**
 * 删除开跑时为任务创建的分支。worktree 目录由 Paseo 归档时自己清理，
 * 这里只删分支；任一步失败都静默跳过，不影响归档。
 */
export async function deleteBranches(
  repo: string,
  branches: string[],
): Promise<void> {
  for (const branch of branches) {
    if (!branch) continue;
    try {
      await git(repo, ["branch", "-D", branch]);
    } catch {
      try {
        await git(repo, ["worktree", "prune"]);
        await git(repo, ["branch", "-D", branch]);
      } catch {
        // 分支已不存在或无权删除：跳过
      }
    }
  }
}
