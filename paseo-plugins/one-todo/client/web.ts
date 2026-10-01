import { Linking, Platform } from "react-native";

// This plugin typechecks without the DOM library. Declare only what this module uses.
declare const window: {
  open(url: string, target: string, features: string): unknown;
  addEventListener(type: "keydown", handler: (e: { key?: string }) => void): void;
  removeEventListener(type: "keydown", handler: (e: { key?: string }) => void): void;
  confirm?(message: string): boolean;
};

/**
 * 电脑端（web）监听 Esc；手机端没有键盘，直接返回空的反注册函数。
 */
export function onEscape(handler: () => void): () => void {
  if (Platform.OS !== "web") return () => {};
  const onKey = (e: { key?: string }) => {
    if (e.key === "Escape") handler();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

export async function openExternal(url: string): Promise<void> {
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Linking.openURL(url);
}

export function confirmDialog(message: string): boolean {
  if (Platform.OS !== "web") return true;
  return typeof window.confirm === "function" ? window.confirm(message) : true;
}
