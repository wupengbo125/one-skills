---
type: concept
title: LLM Wiki 纯 Prompt 无代码知识库系统
description: 介绍基于 one-wiki 的全功能无代码 Wiki 知识库体系，专注于个人永久知识库 $one_llmwiki_dir/ 的增量编译与检索。
---

# LLM Wiki 纯 Prompt 无代码知识库系统

`one-wiki` 实现了纯 Prompt 驱动的全功能无代码 Wiki 知识库体系，专门服务于个人唯一永久知识库仓库（默认路径 `$one_llmwiki_dir/`）。

## 核心架构与功能模块

Skill 入口位于 [`one-wiki/SKILL.md`](file://$github_dir/one-skills/one-wiki/SKILL.md)，包含四大操作：

1. **素材摄入与增量编译 (ingest)**：把日常对话、聊天记录或离线 Markdown 素材编译入统一 Wiki 体系，支持 Obsidian 双链与置信度标签。
2. **语义 Lint 巡检 (lint)**：自动扫描元数据缺失、矛盾事实、重复定义及断裂指针。
3. **Wiki 问答检索 (query)**：支持基于全局索引的高质量多跳推理问答。
4. **长文档大纲推理 (parse)**：长文本全貌大纲提取与知识结构映射。

## 与其他 Wiki 系统的协作

```mermaid
flowchart LR
    LLMWiki["one-wiki<br/>(面向个人永久知识库 $one_llmwiki_dir/)"]
    CodeWiki["one-code-wiki<br/>(面向项目本地代码库 onewiki/)"]

    CodeWiki -.->|代码库上下文| LLMWiki
```

## 相关知识库关系

- [Code Wiki 源码知识库](file://$github_dir/one-skills/onewiki/wiki-systems/code-wiki.md) 专注当前 repository 代码维度的 Wiki。
- [技能安装与管理系统](file://$github_dir/one-skills/onewiki/core/skill-installer.md) 负责将 `one-wiki` 部署至应用环境。
