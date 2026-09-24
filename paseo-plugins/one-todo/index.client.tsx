import type { PluginClientContext } from "@getpaseo/plugin/client";
import { TodoSurface } from "./client/todo";

export default function contribute(client: PluginClientContext) {
  client.addSurface("todo", TodoSurface);
  client.addSidebarItem({
    id: "todo",
    title: "待办",
    icon: "ListTodo",
    surface: "todo",
  });
  client.addCommandCenterItem({
    id: "open-todo",
    title: "打开待办列表",
    icon: "ListTodo",
    context: "global",
    onSelect({ openSurface }) {
      openSurface("todo");
    },
  });
  return () => {};
}
