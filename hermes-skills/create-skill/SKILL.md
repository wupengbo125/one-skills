---
name: create-skill
description: 当用户要求创建、新建或修改 Skill (技能) 时触发此技能，规范创建前的 git pull 与创建后的 git commit/push 流程
---

# Create Skill

本 Skill 规范了个人小助手在创建或修改 Skill 时的标准工作流，确保代码仓库同步与版本自动提交。

## 适用场景
- 用户要求“创建 skill”、“新建技能”、“添加 skill”或修改现有的 Skill。

## 规范执行步骤

### 第一步：创建前拉取最新代码
在动笔创建或修改任何 Skill 文件**之前**，先在仓库根目录执行：
```bash
git pull
```

### 第二步：规范创建/更新 Skill
1. 在当前项目仓库的相对路径下创建 Skill 目录（例如 `./hermes-skills/<skill-name>/`）。
2. 创建 `SKILL.md` 文件，必须包含规范的 YAML frontmatter 头部（`name` 和 `description`）。
3. 详细编写 Skill 的触发逻辑、执行步骤与注意事项。

### 第三步：创建后提交与推送代码
完成 Skill 的创建或修改后，自动打包提交并推送到远程仓库：
```bash
git add .
git commit -m "feat(skill): add <skill-name> skill"
git push
# 若系统存在 cm 命令也可直接运行 cm 快速提交推送
```
