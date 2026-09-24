import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { createIssueRpc, fetchIssueRpc, listIssuesRpc } from "../shared/todo";

const execFileAsync = promisify(execFile);

function parseIssueRef(ref: string): { repo: string; number: number } | null {
  const s = ref.trim();
  const url = s.match(/github\.com\/([^/]+\/[^/#]+)\/(?:issues|pull)\/(\d+)/i);
  if (url) return { repo: url[1], number: Number(url[2]) };
  const hash = s.match(/^(.+?\/.+?)#(\d+)$/);
  if (hash) return { repo: hash[1], number: Number(hash[2]) };
  const space = s.match(/^(.+?\/.+?)\s+(\d+)$/);
  if (space) return { repo: space[1], number: Number(space[2]) };
  return null;
}

export async function handleCreateIssue(
  input: RpcInput<typeof createIssueRpc>,
): Promise<{ number: number; url: string; repo: string }> {
  const args = ["issue", "create", "-R", input.repo, "--title", input.title];
  const body = input.body?.trim();
  if (body) args.push("--body", body);
  const { stdout } = await execFileAsync("gh", args, {
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env },
  });
  const out = stdout.trim();
  const urlM = out.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/);
  if (!urlM) {
    const n = out.match(/(\d+)\s*$/);
    if (!n) throw new Error(out || "创建 Issue 失败");
    return {
      number: Number(n[1]),
      url: `https://github.com/${input.repo}/issues/${n[1]}`,
      repo: input.repo,
    };
  }
  return { number: Number(urlM[1]), url: urlM[0], repo: input.repo };
}

export async function handleFetchIssue(input: RpcInput<typeof fetchIssueRpc>) {
  const parsed = parseIssueRef(input.ref);
  if (!parsed) {
    throw new Error("无法识别。格式：owner/repo#123 或 GitHub Issue 链接");
  }
  const { stdout } = await execFileAsync(
    "gh",
    [
      "issue",
      "view",
      String(parsed.number),
      "-R",
      parsed.repo,
      "--json",
      "title,body,number,url",
    ],
    { timeout: 20_000, maxBuffer: 1024 * 1024, env: { ...process.env } },
  );
  const data = JSON.parse(stdout) as {
    title: string;
    body?: string | null;
    number: number;
    url: string;
  };
  return {
    title: data.title,
    body: (data.body ?? "").trim(),
    number: data.number,
    repo: parsed.repo,
    url: data.url,
  };
}

async function remoteRepo(path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", path, "remote", "get-url", "origin"],
      { timeout: 8_000, maxBuffer: 64 * 1024 },
    );
    const url = stdout.trim();
    if (!url) return null;
    const m =
      url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/) ||
      url.match(/git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function handleListIssues(
  input: RpcInput<typeof listIssuesRpc>,
  { paseo }: PluginHandlerContext,
) {
  let projectEntries: { path: string; name: string; id: string }[] = [];
  try {
    const res = await paseo.projects.list();
    projectEntries = (res.projects ?? []).map((p) => ({
      path: p.projectRootPath,
      name: p.projectDisplayName || p.projectRootPath,
      id: p.projectId,
    }));
  } catch {
    projectEntries = [];
  }
  let projectPaths = projectEntries.map((p) => p.path);
  if (input.projectPath) {
    projectPaths = projectPaths.filter((p) => p === input.projectPath);
    if (projectPaths.length === 0 && input.projectPath) {
      projectPaths = [input.projectPath];
    }
  }

  const pathByRepo = new Map<
    string,
    { path: string; name: string; id: string }
  >();
  const repos: string[] = [];
  const seen = new Set<string>();
  for (const entry of projectEntries) {
    if (input.projectPath && entry.path !== input.projectPath) continue;
    const repo = await remoteRepo(entry.path);
    if (repo && !seen.has(repo)) {
      seen.add(repo);
      repos.push(repo);
      pathByRepo.set(repo, entry);
    }
  }

  if (repos.length === 0) {
    return {
      issues: [],
      repos: [],
      error: "没有本地 GitHub 仓库。先在 Paseo 里 Add project。",
    };
  }

  const issues: {
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
  }[] = [];
  let lastErr: string | undefined;

  for (const repo of repos) {
    try {
      const { stdout } = await execFileAsync(
        "gh",
        [
          "issue",
          "list",
          "-R",
          repo,
          "--state",
          "open",
          "--limit",
          "30",
          "--json",
          "number,title,url,state,updatedAt",
        ],
        { timeout: 20_000, maxBuffer: 1024 * 1024, env: { ...process.env } },
      );
      const list = JSON.parse(stdout) as {
        number: number;
        title: string;
        url: string;
        state: string;
        updatedAt?: string;
      }[];
      const bound = pathByRepo.get(repo);
      for (const it of list) {
        issues.push({
          repo,
          number: it.number,
          title: it.title,
          url: it.url,
          state: it.state,
          updatedAt: it.updatedAt,
          projectPath: bound?.path,
          projectName: bound?.name,
          projectId: bound?.id,
        });
      }
    } catch (err: unknown) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }

  issues.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return {
    issues,
    repos,
    ...(issues.length === 0 && lastErr ? { error: lastErr } : {}),
  };
}
