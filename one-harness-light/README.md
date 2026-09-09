# one-harness-light

轻量审查开发流程 (Harness Light) Pi 扩展包。

当 Agent 在会话中修改代码或文件时，自动触发轻量审查流程，确保改动与需求画等号。

---

## 机制

1. **动态规则注入**：每轮前通过 `before_agent_start` 动态挂载 `harness-rules.md` 审查准则。
2. **修改前提示**：Agent 执行 `edit` / `write` 时，UI 即时通知进入审查追踪状态。
3. **改动后强制卡点**：文件改动成功后，在工具返回结果中直接注入审查提醒，要求 Agent 修改完禁止直接 commit，必须派无记忆 Sub-agent 对比用户原始需求与 `git diff HEAD` 做等号审查。
4. **活蓝图同步与交付**：审查通过后判断是否更新活蓝图（`BLUEPRINT.md`），最后才允许提交。

---

## 安装与卸载

本插件为标准独立 Pi Package，支持按需手动安装：

### 安装 (Install)
```bash
# 全局安装
pi install /home/ctyun/onespace/github/one-skills/one-harness-light

# 或在当前仓库局部安装
pi install -l ./one-harness-light
```

### 卸载 (Remove)
```bash
pi remove one-harness-light
```

### 验证 (Verify)
```bash
pi list
```
