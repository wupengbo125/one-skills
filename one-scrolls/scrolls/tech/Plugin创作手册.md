# Plugin 创作手册

> 从零创建一个 Paseo Plugin：骨架 → 接口 → 界面 → 存储 → 联调。
> 实例：`paseo-todo-plugin` / `paseo-race-plugin`；2026-09-23。

## 1. 骨架（最小可跑）

```
my-plugin/
  paseo-plugin.json      # id / description / requirements.paseo
  package.json           # typecheck: tsc --noEmit
  tsconfig.json
  index.server.ts        # export default function contribute(server)
  index.client.tsx       # export default function contribute(client)
  shared/                # defineRpc + zod schema（前后端共用）
  server/                # 业务处理
  client/                # 界面
```

`paseo-plugin.json` 示例：

```json
{
  "id": "my-plugin",
  "requirements": { "paseo": ">=0.9.0" },
  "description": "一句话说明"
}
```

客户端注册入口：

```tsx
export default function contribute(client: PluginClientContext) {
  client.addSurface("my-surface", MySurface);
  client.addSidebarItem({ id: "my", title: "我的", icon: "Box", surface: "my-surface" });
  return () => {};
}
```

服务端注册入口：

```ts
export default function contribute(server: PluginServerContext) {
  server.handle(myRpc, (input, ctx) => handleMy(input, ctx));
  server.on("agent.turn_ended", (event) => { /* 收尾 */ });
  return () => {};
}
```

## 2. RPC 与 Schema

- 用 `defineRpc({ name, input: z.object(...), output: z.object(...) })` 放 `shared/`。
- `callPluginRpc` / `server.handle` **input、output 都会 parse**——两端 schema 必须对得上，缺字段直接抛。
- 测 schema 别用 `require("zod")`（ESM 环境没有），用：
  ```bash
  node --input-type=module -e 'import {z} from "zod"; ...'
  ```
- patch / 更新类字段：`undefined` 在 JSON 序列化会**丢掉**（等于不改）；要**清空**传 `""`，不要传 `undefined`/`null`（看 schema 是否 optional）。
- optional 清空惯例：`value || undefined` 或 `trim() || undefined`。

## 3. 持久化

- 数据放：`~/.paseo/plugin-data/<plugin-id>/`（自建 `server/store.ts` 读写 JSON 即可）。
- 每条记录用 zod `normalize` 一遍再吐给前端，防旧数据缺字段。

## 4. 界面（React Native 表面）

- 组件从 `@getpaseo/plugin/client/react-native` 取：`Modal` / `TextInput` / `Icon` / `useToast`。
- `Modal` 是受控：`{ title, icon, open, onOpenChange }`；多弹层用一个 `modalOpen = a || b || c`，关闭走统一 `closeOverlays`。
- 表单输入框一律包一层 `StableInput`（见 §5），**禁止**裸 `TextInput` 绑 live state 当受控 value。
- 空配置别显示成错误态：无 agent 时 meta 行直接省略 agent 段，不要写「未配置 Agent」占位吓人。
- 列表 / 过滤：pill 只留有语义的两档就够（如「待办」「Issue」），不要「全部」和来源列表搅在一起。
- 点「存入 / 导入」成功后：写库 + toast + **不要**自动打开「开跑」弹窗；单行 pending 用按 key 的 state（如 `importingRef`），不要全局 mutation `isPending`（会整表转圈）。

## 5. 输入框 / 语音与 IME（必读）

语音、中文输入法在组合期被打断 → 断字。三条根因都踩过：

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

- 打开表单：`setFormGen((g) => g + 1)`，key 用 `add-title-${formGen}` 这类。
- 新增框 `initial=""`；编辑/开跑框 `initial` = 打开时种子。
- 父级 state 只做校验和提交，不回写输入框。
- 非受控后要「清空可见文本」必须 **换 key 重挂**，只 `setState("")` 清不掉。

## 6. 联调流程（每改必跑）

```bash
npm run typecheck
npx prettier --write client/** shared/** server/**
npx prettier --check  client/** shared/** server/**
paseo plugin reload <id>
paseo plugin ls <id>          # 要 running、无 ERROR
paseo plugin logs <id>        # 要看到 Plugin ready
```

改 `shared/*Rpc` 后额外用 `node --input-type=module` 把 input/output 样例 parse 一遍再交工。

## 7. 创作顺序（推荐）

1. 定 id + `paseo-plugin.json` + 空 `contribute` 两侧 → reload 确认 `Plugin ready`；
2. 写 `shared` RPC + zod → server handle 通 → 再 client 调；
3. store 落盘 `~/.paseo/plugin-data/<id>/`；
4. surface + sidebar 先能打开空页；
5. 表单 / 列表 / 业务流；输入框从第一天就用 `StableInput`；
6. typecheck + prettier + reload + 语音/IME 实测。

## 8. 关键事实

1. Plugin = `paseo-plugin.json` + 两侧 `contribute` + `shared` RPC；没有就先跑通空壳。
2. zod 双端校验、`undefined` 丢键、清空传 `""`。
3. 数据在 `~/.paseo/plugin-data/<id>/`。
4. 表单非受控 `defaultValue` + 代际 key；受控 value + initial 回灌 effect = 语音断字。
5. 验证闭环：typecheck → prettier → `paseo plugin reload` → logs 里 `Plugin ready`。

## 9. 相关路径

- 参考实现：`paseo-todo-plugin/`、`paseo-race-plugin/`
- 数据：`~/.paseo/plugin-data/<plugin-id>/`
- 命令：`paseo plugin reload|ls|logs <id>`
