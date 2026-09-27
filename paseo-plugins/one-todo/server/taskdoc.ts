import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 需求文档放临时目录 requirements/ 下，路径由插件按马的工作区指定。
 */
const TASK_DOC_DIR = join(tmpdir(), "one-todo", "requirements");

function safeKey(key: string): string {
  return key.replace(/[^\w.-]+/g, "_").slice(-80) || "unknown";
}

export function taskDocPath(key: string): string {
  const name = `${safeKey(key)}.md`;
  const newPath = join(TASK_DOC_DIR, name);
  if (!existsSync(newPath)) {
    const oldPath = join(tmpdir(), "one-todo", "需求", name);
    if (existsSync(oldPath)) return oldPath;
  }
  return newPath;
}

export function ensureTaskDocDir(): void {
  mkdirSync(TASK_DOC_DIR, { recursive: true });
}

export function readTaskDoc(key: string | undefined): string | undefined {
  if (!key) return undefined;
  try {
    return readFileSync(taskDocPath(key), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}
