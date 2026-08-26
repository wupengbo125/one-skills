---
name: one-create-memory-skill
description: "Use when: 需要创建记忆型 Skill (Memory Skill) 时使用。"
---

# 创建记忆型 Skill (Memory Skill) 规范

记忆型 Skill 是跨会话沉淀用户特定偏好、环境凭据或配置规则的轻量级载体。

## 核心铁律：Description 极简原则

`description` 会常驻注入到大模型的系统上下文。**严禁在 description 中写操作细节、配置参数或长篇说明。**

* ❌ **错误示范**：
  `description: "配置本地 AI 时使用。从 dotfiles export 读取 AI_API_KEY，使用 omniroute 代理及 one-luna 模型。"` （过长，浪费每轮对话上下文）
* ✅ **正确示范**：
  `description: "Use when: 需要配置 AI Token 时使用。"` （一句话短句，仅说明触发意图）

## 记忆型 Skill 创建流程

1. **确定命名**：以 `one-` 为前缀，语义清晰（如 `one-config-omni-model-to-your-app`）。
2. **编写 SKILL.md**：
   * 存储路径：`~/onespace/github/one-skills/<skill-name>/SKILL.md`。
   * Frontmatter 中的 `description` 严格控制在一句意图短句内。
   * 正文详细记录：背景事实、具体参数、凭据来源及操作代码示例。
3. **分发与链接**：
   * 创建后，自动软链接到各 Agent 全局 Skills 目录（如 `~/.claude/skills`、`~/.agents/skills` 等）。
