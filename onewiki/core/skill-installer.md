---
type: subsystem
title: 技能安装与管理分发系统
description: 详细说明 install.sh 与 install-others.sh 如何管理 Agent 技能向项目本地及用户全局环境的安装与卸载流程。
---

# 技能安装与管理分发系统

`one-skills` 的核心分发机制建立在交互式 Bash 脚本 [`install.sh`](file:///home/pengbo/home/github/one-skills/install.sh) 与辅助扩展脚本 [`install-others.sh`](file:///home/pengbo/home/github/one-skills/install-others.sh) 之上。该系统负责将独立的 Skill 目录与通用 Agent 规则（如 [`AGENTS.md`](file:///home/pengbo/home/github/one-skills/AGENTS.md)）批量部署或卸载到目标环境。

## 关键文件与角色

- [`install.sh`](file:///home/pengbo/home/github/one-skills/install.sh)：主安装与管理入口。内置 ANSI 菜单系统（`select_menu`），支持多维技能源扫描、交互式单选/多选，支持安装/卸载到项目本地或全局环境。
- [`install-others.sh`](file:///home/pengbo/home/github/one-skills/install-others.sh)：扩展源安装脚本，针对第三方技能库（如 `anth-skills`, `matt-skills`）提供增强的分发手段。
- [`one-agents.md`](file:///home/pengbo/home/github/one-skills/one-agents.md)：项目规则模板源文件。在分发时拷贝为根目录下的 `AGENTS.md` / `CLAUDE.md`，或安装到全局 IDE 配置目录。
- [`user-say.md`](file:///home/pengbo/home/github/one-skills/user-say.md)：项目本地安装初始化文件，用于记录用户对 AI 的自定义全局补充指令。

## 目标分发位置与路径映射

安装系统支持 4 种安装与卸载模式：

1. **安装到当前项目 (`./.agents/skills`)**：
   - 技能文件拷贝到 `./.agents/skills/<skill_name>/`。
   - 规则文件（`one-agents.md`）拷贝到项目根目录 `./AGENTS.md` 与 `./CLAUDE.md`。
   - 自动检测并初始化空配置文件 `./user-say.md`。
2. **卸载自当前项目**：
   - 删除对应 `./.agents/skills/<skill_name>/` 目录或根目录规则文件。
3. **安装到用户全局**：
   - 技能安装至 `~/.claude/skills`、`~/.gemini/config/skills`、`~/.gemini/antigravity/skills`、`~/.config/opencode/skills`。
   - 规则安装至全局提示词文件：`~/.claude/CLAUDE.md`、`~/.gemini/GEMINI.md`、`~/.gemini/config/AGENTS.md` 等。
4. **卸载自用户全局**：
   - 清除各全局配置目录下的对应文件夹与规则文件。

## 运行流程

```mermaid
sequenceDiagram
    autonumber
    actor User as 开发者
    participant Installer as install.sh
    participant Src as 技能源目录
    participant Target as 目标路径 (.agents / 全局)

    User->>Installer: 运行 ./install.sh
    Installer->>Src: 扫描 SKILL_SOURCES (包含默认 $SCRIPT_DIR 及外部路径)
    Installer->>User: 弹出 ANSI 菜单选择技能源
    User-->>Installer: 确认技能源
    Installer->>User: 选择操作模式 (项目本地 / 全局; 安装 / 卸载)
    User-->>Installer: 确认操作模式
    Installer->>User: 多选勾选目标 Skills / AGENTS 规则
    User-->>Installer: 确认勾选列表
    Installer->>Target: 物理拷贝 / 覆盖 / 删除技能与规则文件
    Installer->>User: 输出处理完成汇总报告
```

## 相关知识库关系

- [Code Wiki 源码知识库](file:///home/pengbo/home/github/one-skills/onewiki/wiki-systems/code-wiki.md) 用于解析本系统及其分发的各个 Skill 内容。
- [代码实现工作流](file:///home/pengbo/home/github/one-skills/onewiki/workflows/implementation-workflows.md) 在开发修改本安装器代码时必须遵守暗号校验与规约。
