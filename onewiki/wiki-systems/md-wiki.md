---
type: concept
title: Markdown Wiki 个人文档库系统
description: 介绍基于 one-md-wiki 的个人通用 Markdown 知识库组织、增量更新与一致性巡检体系。
---

# Markdown Wiki 个人文档库系统

`one-md-wiki` 是面向个人通用 Markdown 文档、笔记及知识资料库的管理技能。区别于直接针对代码的 [Code Wiki](file://$github_dir/one-skills/onewiki/wiki-systems/code-wiki.md)，`one-md-wiki` 侧重于将分布式的 Markdown 素材整理、索引并保持一致性。

## 模块结构与组件

入口文件为 [`one-md-wiki/SKILL.md`](file://$github_dir/one-skills/one-md-wiki/SKILL.md)，引用 `one-md-wiki/references/` 中的规范文件：

- [`common.md`](file://$github_dir/one-skills/one-md-wiki/references/common.md)：基础契约，规定通用 Markdown 页面的链接关系、frontmatter 元数据格式及检索提示词原则。
- [`ingest.md`](file://$github_dir/one-skills/one-md-wiki/references/ingest.md)：Markdown 知识库摄入与分类流程。
- [`query.md`](file://$github_dir/one-skills/one-md-wiki/references/query.md)：个人笔记与知识库的查询策略。
- [`lint.md`](file://$github_dir/one-skills/one-md-wiki/references/lint.md)：文档质量与死链巡检。

## 典型操作

1. **`ingest`**：从原始 Markdown 目录提取实体与概念，生成主题索引与语义连接网络。
2. **`query`**：依据提问在 Markdown Wiki 中检索答案，返回带有精确参考文档链接的总结。
3. **`lint`**：检查损坏的相对路径链接、缺失元数据以及重叠废弃的笔记内容。

## 相关知识库关系

- [Code Wiki 源码知识库](file://$github_dir/one-skills/onewiki/wiki-systems/code-wiki.md) 专门处理代码文件与运行时关系。
- [LLM Wiki 纯 Prompt 知识库](file://$github_dir/one-skills/onewiki/wiki-systems/llm-wiki.md) 提供针对 `$github_dir/one-llmwiki/` 的无代码自动化扩展。
