---
type: PRD
title: install.sh 自动检查目标项目 .gitignore
description: 安装 skill 到当前项目时，检查并补充 .agents 到 .gitignore 忽略规则
tags:
  - prd
---

# install.sh 自动检查目标项目 .gitignore

## 1. 背景与目标

install.sh 的"安装到当前项目"模式会创建 `.agents/` 目录，但不会检查目标项目的 `.gitignore` 是否忽略了该目录。如果目标项目没有忽略 `.agents`，这些 skill 文件会被意外提交到 git。

## 2. 需求描述

在 install.sh 的"安装到当前项目"（dest_idx==0）流程中，添加一步：检查当前目录的 `.gitignore` 是否包含 `.agents`，如果没有则追加一行 `.agents`。

## 3. 需求边界

### 3.1 明确包含 (In Scope)

- 仅在"安装到当前项目"模式下检查（dest_idx==0）
- 用 grep 检查，没有则追加

### 3.2 明确不包含 (Out of Scope)

- 不影响"卸载自当前项目"、"安装到用户全局"、"卸载自用户全局"模式
- 不检查其他目录（如 .pi、.ua）

## 4. 待确认与遗留问题

无。

## 5. 技术实施方案

在 install.sh 的 `dest_idx==0` 分支末尾，处理完所有 skill 后，添加：
```bash
[ -f "./.gitignore" ] || touch "./.gitignore"
grep -qF ".agents" "./.gitignore" || echo ".agents" >> "./.gitignore"
```

逻辑：先确保 .gitignore 存在（不存在则新建），再检查并追加。
