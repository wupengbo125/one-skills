# Plugin 输入框语音与 IME 断字避坑

> 症状：Paseo Plugin 侧边栏表单里用语音输入/中文输入法，字词被截断、只蹦出一半。
> 适用：`@getpaseo/plugin/client/react-native` 的 `TextInput` / 自封装输入组件；Paseo 桌面壳 RN 渲染。
> 实例：`paseo-todo-plugin` 添加待办标题/内容；结案 2026-09-23。

## 1. 机制（为什么会断字）

语音/输入法组合（IME composition）期间，只要原生 `TextInput` 的受控 `value` 被 JS 回写，或组件在组合中被重挂，组合即中断，已说的字词丢掉、只保留 fragment。

断字三条根因（按踩坑顺序）：

1. **父级同步回灌**：`useEffect(() => setLocal(initial), [initial])`，父级 `initial={parentState}` 每键变化 → effect 把值写回子组件 → 组合被打断。
   - 早期 `StableInput` 曾有此 effect；删掉后**内容框（多行）不再断**——这是「内容框修好了」的直接原因。
2. **受控 value 每键回写**：仍保留 `value={v}` + 每键 `setV`/`setState`。父级因 `initial={formValue}` 变化导致 `memo` 失效，全量重渲染，单行标题框的 IME 更敏感。
   - 本轮标题框仍断的根因：只删了 (1)，没做非受控化。
3. **key 不随打开变 / key 含易变 id**：表单关了再开、或 id 跳变，导致 `TextInput` 重挂或 `defaultValue` 不刷新。

## 2. 正确写法（Paseo Plugin 专用）

**非受控 `defaultValue` + 只向上冒烟，不在输入期间受控回写**：

```tsx
const StableInput = memo(function StableInput({ initial, onValue, style, ... }) {
  const handleChange = useCallback((t: string) => onValue(t), [onValue]);
  return (
    <TextInput
      style={style}
      defaultValue={initial}   // 只在挂载时生效
      onChangeText={handleChange}
      // 不要 value={...}
      // 不要在 useEffect 里把 initial 写回
      placeholder={placeholder}
      multiline={multiline}
    />
  );
});
```

**打开表单时 bump generation，保证重挂并刷新 defaultValue**：

```tsx
const [formGen, setFormGen] = useState(0);
function openAdd() {
  setAddTitle(""); setAddPrompt("");
  setFormGen((g) => g + 1);   // 关键：换 key，让 defaultValue 生效
  setAddOpen(true);
}
// JSX
<StableInput key={`add-title-${formGen}`} initial="" onValue={onAddTitle} />
<StableInput key={`add-prompt-${formGen}`} initial="" onValue={onAddPrompt} />
```

**一律「稳定 key」**：`{域}-{formGen}` 或 `{域}-{id}-{formGen}`。禁止 `key="add-title"` 这种永不变的字符串（Modal 常驻子树时不重挂，旧文本/旧组合残留）。

**父级 state 只做校验与提交**（`canSubmitAdd`、submit payload），不再作为受控 `value` 源。`initial` 仅在 `open*` 时写入种子；输入过程中父级 `initial` 可以变，但子组件靠 `defaultValue` + 稳定 `key` 不受干扰。

## 3. 全部输入框检查清单（本插件）

| 表单 | key | initial 种子 |
| --- | --- | --- |
| 添加标题/内容 | `add-title-${formGen}` / `add-prompt-${formGen}` | `""`（open 时清空） |
| 编辑标题/内容 | `edit-title-${edit.id}-${formGen}` / `edit-prompt-…` | 打开时的 title/prompt |
| 开跑提示词/分支/cwd | `run-prompt-${run.id}-${formGen}` / `base-branch-${formGen}` / `new-branch-${formGen}` / `run-cwd-${formGen}` | draft 字段 |
| Picker 搜索 | `picker-search-${formGen}` | `""`；`openPicker`/切 step 时 `setSearch("")` + bump |

`formGen` bump 点：`openAdd` / `openEdit` / `openRun` / `openPicker` / provider→model 切换。

## 4. 排错检查单

1. `rg "value=\{" client/` —— 不应再有输入框受控 `value`（`StableInput` 内部也不许）。
2. `rg "useEffect" client/` —— 禁止把 `initial`/parent state 写回 TextInput 的 effect。
3. 每个 `StableInput` 是否带 `{域}-${…}-${formGen}`；`open*` 是否 bump `formGen`。
4. 非受控后要「清空可见文本」必须 **换 key 重挂**，只 `setState("")` 清不掉原生文本（`search` 同理：`setSearch("")` 要配 `formGen++`）。
5. 验证：`npm run typecheck` + `npx prettier --check` + `paseo plugin reload <id>` + 真机/桌面壳语音输入标题连续说 10 秒不丢字。

## 5. 关键事实

1. **内容框为何修好**：删掉了 `useEffect(() => setV(initial), [initial])`，父级不再回灌打断组合。
2. **标题框为何仍断**：只剩受控 `value={v}`；`initial={addTitle}` 每键变 → `memo` 失效 → 单行 IME 被 `value` 回写打断。
3. **修法**：全部输入框改 `defaultValue` 非受控 + 打开时 `formGen` bump 稳定 key；校验仍走父级 state。
4. **禁做**：受控 `value` + 每键 setState 写回；`useEffect` 同步 initial；用会变的字符串做 key 却指望 defaultValue 刷新。
5. 插件热重载命令：`paseo plugin reload paseo-todo-plugin`；日志 `paseo plugin logs paseo-todo-plugin`。

## 6. 相关路径

- 代码：`paseo-todo-plugin/client/todo.tsx`（`StableInput` / `formGen` / 各表单 key）
- 数据：`~/.paseo/plugin-data/paseo-todo-plugin/todos.json`
- 卷轴库：`one-skills/...` 见 `scrolls/index.md` → 本篇
