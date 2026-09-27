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

/** 派马时塞进提示词的那一行：让这匹马把需求整理成平铺计划写进需求文档。 */
export function taskDocHint(key: string): string {
  return `把上面的需求整理成平铺计划列给用户，并写到：${taskDocPath(key)}\n`;
}
