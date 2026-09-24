# Paseo Plugin 创作手册

> 从零创建一个 **Paseo** 插件（不是 VS Code 扩展）：骨架 → 接口 → 界面 → 存储 → 联调。
> 实例：`paseo-plugins/one-todo`；2026-09-23。

## 1. 骨架（最小可跑）

```
my-paseo-plugin/
  paseo-plugin.json      # id / description / requirements.paseo
  package.json           # typecheck: tsc --noEmit
  tsconfig.json
  index.server.ts        # export default function contribute(server)
  index.client.tsx       # export default function contribute(client)
  shared/                # defineRpc + zod schema（前后端共用）
  server/                # 业务处理
  client/                # 界面
```

`paseo-plugin.json`：

```json
{
  "id": "my-paseo-plugin",
  "requirements": { "paseo": ">=0.9.0" },
  "description": "一句话说明"
}
```

客户端注册：

```tsx
export default function contribute(client: PluginClientContext) {
  client.addSurface("my-surface", MySurface);
  client.addSidebarItem({ id: "my", title: "我的", icon: "Box", surface: "my-surface" });
  return () => {};
}
```

服务端注册：

```ts
export default function contribute(server: PluginServerContext) {
  server.handle(myRpc, (input, ctx) => handleMy(input, ctx));
  server.on("agent.turn_ended", (event) => { /* 收尾 */ });
  return () => {};
}
```

## 2. RPC 与 Schema

- `defineRpc({ name, input: z.object(...), output: z.object(...) })` 放 `shared/`。
- `callPluginRpc` / `server.handle` **input、output 都会 parse**——两端 schema 必须对得上。
- 测 schema 别用 `require("zod")`（ESM 环境没有），用：
  ```bash
  node --input-type=module -e 'import {z} from "zod"; ...'
  ```
- patch：`undefined` JSON 序列化会**丢掉**（等于不改）；**清空传 `""`**。
- optional 清空惯例：`value || undefined` 或 `trim() || undefined`。

## 3. 持久化

- 数据：`~/.paseo/plugin-data/<plugin-id>/`（自建 `server/store.ts` 读写 JSON）。
- 每条记录用 zod `normalize` 一遍再吐给前端。

## 4. 界面（Paseo 插件 React Native 表面）

- 从 `@getpaseo/plugin/client/react-native` 取：`Modal` / `TextInput` / `Icon` / `useToast`。
- `Modal` 受控：`{ title, icon, open, onOpenChange }`；多弹层一个 `modalOpen`，关闭走 `closeOverlays`。
- 输入框一律包 `StableInput`（见 §5），禁止裸 `TextInput` 绑 live state 当受控 value。
- 空配置别显示成错误态：无 agent 时省略 agent 段，不写「未配置 Agent」。
- 过滤 pill 只留有语义的两档，不要「全部」和来源搅在一起。
- 「存入/导入」成功：写库 + toast + **不要**自动打开开跑弹窗；单行 pending 按 key，不要全局 `isPending`。

## 5. 输入框 / 语音与 IME

语音、中文输入法组合期被打断 → 断字。三条根因：

1. `useEffect(() => setLocal(initial), [initial])` 父级回灌；
2. 受控 `value={v}` + 每键 setState，父级 `initial` 一变 `memo` 就废；
3. `key` 写死不变，重开表单不重挂。

正确姿势：

```tsx
const StableInput = memo(function StableInput({ initial, onValue, ... }) {
  const handleChange = useCallback((t: string) => onValue(t), [onValue]);
  return <TextInput defaultValue={initial} onChangeText={handleChange} ... />;
});
```

- 打开表单：`setFormGen((g) => g + 1)`，key 用 `add-title-${formGen}`。
- 新增框 `initial=""`；编辑框 `initial` = 打开时种子。
- 父级 state 只做校验和提交，不回写输入框。
- 非受控后清空可见文本必须 **换 key 重挂**。

## 6. 联调流程（每改必跑）

```bash
npm run typecheck
npx prettier --write client/** shared/** server/**
npx prettier --check  client/** shared/** server/**
paseo plugin reload <id>
paseo plugin ls <id>          # running、无 ERROR
paseo plugin logs <id>        # 看到 Plugin ready
```

改 `shared/*Rpc` 后用 `node --input-type=module` 把 input/output 样例 parse 一遍。

## 7. 创作顺序（推荐）

1. 定 id + `paseo-plugin.json` + 空两侧 `contribute` → reload 确认 `Plugin ready`；
2. 写 `shared` RPC + zod → server handle 通 → 再 client 调；
3. store 落盘 `~/.paseo/plugin-data/<id>/`；
4. surface + sidebar 先能打开空页；
5. 表单 / 列表 / 业务流；输入框第一天就用 `StableInput`；
6. typecheck + prettier + reload + 语音/IME 实测。

## 8. 关键事实

1. **这是 Paseo 插件**，不是 VS Code 扩展：`paseo-plugin.json` + 两侧 `contribute` + `shared` RPC。
2. zod 双端校验、`undefined` 丢键、清空传 `""`。
3. 数据在 `~/.paseo/plugin-data/<id>/`。
4. 表单非受控 `defaultValue` + 代际 key；受控 value + initial 回灌 = 语音断字。
5. 验证闭环：typecheck → prettier → `paseo plugin reload` → logs 里 `Plugin ready`。

## 9. 相关路径

- 参考实现：`paseo-plugins/one-todo/`
- 数据：`~/.paseo/plugin-data/<plugin-id>/`
- 命令：`paseo plugin reload|ls|logs <id>`
