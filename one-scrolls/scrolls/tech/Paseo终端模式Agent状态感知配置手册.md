# Paseo 终端模式 Agent 状态感知配置手册

> 解决在 Paseo 终端（Terminal）运行 CLI Agent（如 Anti Gravity CLI、Codex 等）时，Paseo 无法感知 Agent 是在“正在运行”还是“回复完成待确认”的问题，实现精确的两态感知：**运行中** 与 **等待 Review**。

---

## 1. 核心状态机制

Paseo 终端状态机（`TerminalActivityTracker`）天然设计了如下状态流转：

| 实际状态 | Paseo 状态 | UI 表现 | 触发时机 |
| :--- | :--- | :--- | :--- |
| **运行中** | `working` | `running`（蓝色/转圈指示） | 用户敲入 Prompt，Agent 开始推理与调用工具 |
| **等待 Review** | `idle` + `finished` | `attention`（高亮提示徽标） | Agent 回复完毕、工具链执行结束，等待用户查看 |

> 用户查看/切换进入该终端标签页时，Paseo 会触发 `clearAttention` 清除未读标记，重新回到静默。

---

## 2. Paseo 终端底层原理

Paseo 在每次拉起工作区终端（PTY）时，会自动向终端进程环境中注入三个环境变量：
- `PASEO_TERMINAL_ID`：当前终端唯一 ID
- `PASEO_ACTIVITY_TOKEN`：安全校验 Token
- `PASEO_TERMINAL_ACTIVITY_URL`：Daemon 状态接收 HTTP 接口

CLI 汇报状态的官方指令：
```bash
paseo hooks <agent> <event>
```
底层会携带 Token 请求 Paseo Daemon 接口，将状态推送到终端状态机。

---

## 3. Anti Gravity CLI 接入配置

Anti Gravity CLI 支持全局生命周期钩子文件 `~/.gemini/config/hooks.json`。

### 3.1 配置文件定位
- 路径：`~/.gemini/config/hooks.json`（全局生效，跨所有项目）
- 钩子类型：
  - `PreInvocation`：模型收到 Prompt 准备开始生成与调用工具前触发。
  - `Stop`：当前 Turn 所有的推理、工具调用执行完毕，Agent 停止时触发。

### 3.2 配置内容

在 `~/.gemini/config/hooks.json` 中追加 `paseo-terminal-activity` 配置段：

```json
{
  "paseo-terminal-activity": {
    "PreInvocation": [
      {
        "command": "if [ -n \"$PASEO_TERMINAL_ID\" ]; then paseo hooks codex UserPromptSubmit >/dev/null 2>&1; fi; echo '{}'",
        "timeout": 5,
        "type": "command"
      }
    ],
    "Stop": [
      {
        "command": "if [ -n \"$PASEO_TERMINAL_ID\" ]; then paseo hooks codex Stop >/dev/null 2>&1; fi; echo '{}'",
        "timeout": 5,
        "type": "command"
      }
    ],
    "enabled": true
  }
}
```

### 3.3 关键技术点解析
1. **环境变量守卫**：`if [ -n "$PASEO_TERMINAL_ID" ]` 确保在普通终端（非 Paseo）跑 `agy` 时完全静默，零性能损耗、零报错。
2. **事件映射**：
   - `PreInvocation` 映射到 `codex UserPromptSubmit`（Paseo 解析为 `running`，状态机转为 `working`）。
   - `Stop` 映射到 `codex Stop`（Paseo 解析为 `idle`，状态机因从 `working` 转入而自动标记 `finished`，UI 显示为 `attention`）。
3. **输出契约**：结尾加 `echo '{}'`，满足 Anti Gravity Hook 要求的标准 JSON 标准输出，防止拦截主流程。

---

## 4. 验证方式

1. 打开 Paseo 并在某个工作区中新建一个 Terminal；
2. 启动 Anti Gravity CLI：
   ```bash
   agy
   ```
3. 发送任意任务提示词；
4. 观察 Paseo 左侧/顶部标签栏：
   - 正在思考与调用工具期间：标签页显示为 **running 状态（转圈）**；
   - 任务完成输出最终答案后：标签页自动变为 **attention 状态（等待 Review 徽标）**；
   - 点击该标签页查看后，徽标自动清除。

---

## 5. 常见避坑

1. **不要直接写死端口/URL**：Paseo 的 `PASEO_TERMINAL_ACTIVITY_URL` 端口是动态生成的，必须依赖环境变量。
2. **Hook 必须输出合法 JSON**：如果脚本无任何输出或输出非 JSON 格式报错，会干扰 Anti Gravity CLI 正常响应。
3. **多 Hook 并存**：`hooks.json` 顶层支持多个命名 hook 并存（如 `moshi-hook` 与 `paseo-terminal-activity`），引擎会自动按序执行，不要直接整文件覆盖导致旧 hook 丢失。
