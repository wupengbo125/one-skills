import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 需求文档（干活的马写的 audit-list.md）不放仓库里：放临时目录，路径由插件按马的工作区指定。
 * 同一个键永远算出同一个路径，派马时把路径写进提示词，评审时按同一个路径读回来。
 */
const TASK_DOC_DIR = join(tmpdir(), "one-todo", "需求");

function safeKey(key: string): string {
  return key.replace(/[^\w.-]+/g, "_").slice(-80) || "unknown";
}

export function taskDocPath(key: string): string {
  return join(TASK_DOC_DIR, `${safeKey(key)}.md`);
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

/** 派马时塞进提示词的那一行：告诉这匹马需求文档写哪去。 */
export function taskDocHint(key: string): string {
  return `需求文档路径：${taskDocPath(key)}\n`;
}
