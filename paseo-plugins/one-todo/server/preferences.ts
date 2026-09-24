import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { TodoPreferences } from "../shared/todo";

const DATA_DIR = join(homedir(), ".paseo", "plugin-data", "one-todo");
const PREF_FILE = join(DATA_DIR, "preferences.json");

let prefCache: TodoPreferences | null = null;

export function getPreferences(): TodoPreferences {
  if (prefCache) return prefCache;
  try {
    if (existsSync(PREF_FILE)) {
      const raw = readFileSync(PREF_FILE, "utf8");
      prefCache = JSON.parse(raw);
    } else {
      prefCache = {};
    }
  } catch {
    prefCache = {};
  }
  return prefCache ?? {};
}

export function savePreferences(
  patch: Partial<TodoPreferences>,
): TodoPreferences {
  const current = getPreferences();
  const next: TodoPreferences = { ...current, ...patch };
  prefCache = next;
  try {
    mkdirSync(dirname(PREF_FILE), { recursive: true });
    writeFileSync(PREF_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // ignore write error
  }
  return next;
}
