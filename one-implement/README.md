# one-implement

极简实现流程 (One Implement) 扩展包。

平铺计划，最小化实现，确保改动与需求画等号，严防多改。

---

## 机制

1. **动态规则注入**：每轮前通过 `before_agent_start` 动态挂载 `SKILL.md` 极简实现准则。
2. **修改前提示**：Agent `edit`/`write` 时，UI 即时通知进入极简实现追踪状态。
3. **改动后强制卡点**：文件改动成功后，在工具返回结果中直接注入审查提醒，要求 Agent 改动完成后必须做等号审查，杜绝多改。
4. **活蓝图同步与交付**：审查通过后判断是否更新活蓝图（`BLUEPRINT.md`），最后才允许提交。

---

## 安装与卸载

本插件为标准独立 Pi Package，支持按需手动安装：

### 安装 (Install)
```bash
# 全局安装
pi install /home/ctyun/onespace/github/one-skills/one-implement

# 或在当前仓库局部安装
pi install ./one-implement
```

### 卸载 (Remove)
```bash
pi remove one-implement
```

### 验证 (Verify)
```bash
pi list
```
