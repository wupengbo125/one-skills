---
name: create-skill
description: 规范 skill 的拉取、创建、修改流程。触发词："拉skill"/"pull skill"（拉取最新）、"创建skill"/"新建skill"（创建新 skill）、"改skill"/"更新skill"（修改现有 skill）
---

# Create Skill

本 Skill 规范了个人小助手在拉取、创建或修改 Skill 时的标准工作流。

## 什么值得存 skill
- **值得**：会重复遇到的复杂流程、踩过的坑、需要多步骤才能完成的任务
- **不值得**：一次性改动、改完就不再需要的任务（比如目录迁移、改个路径）

## 操作模式

### 模式一：拉取 skill（触发词："拉skill"、"pull skill"）
直接在仓库执行：
```bash
cd ~/onespace/github/one-skills && git pull
```
拉完后告诉用户更新了哪些 skill。

### 模式二：创建 skill（触发词："创建skill"、"新建skill"、"添加skill"）
1. **先拉取最新代码**
```bash
cd ~/onespace/github/one-skills && git pull
```
2. 在 `hermes-skills/<skill-name>/` 下创建 `SKILL.md`（含 YAML frontmatter：name + description）
3. **提交并推送**
```bash
git add . && git commit -m "feat(skill): add <skill-name>" && git push
```

### 模式三：修改 skill（触发词："改skill"、"更新skill"）
1. **先拉取最新代码**
```bash
cd ~/onespace/github/one-skills && git pull
```
2. 修改对应的 `SKILL.md`
3. **提交并推送**
```bash
git add . && git commit -m "feat(skill): update <skill-name>" && git push
```
