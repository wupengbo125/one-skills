---
name: install-doubao-skill
description: "仅豆包环境使用，专属豆包技能安装/更新/删除。默认不自动触发，仅当用户手动指定本技能或明确要求执行豆包技能安装、更新、删除时才使用。"
argument-hint: "用户需求描述"
disable-model-invocation: true
---

# 安装豆包技能 (Install Doubao Skill)

豆包 Agent 的个人技能统一从源仓库 `~/onespace/github/one-skills`（GitHub: wupengbo125/one-skills）物理复制到运行目录 `/runtime/user_skills/`。本技能定义唯一正确的安装流程。

## 平台机制（必须遵守）

1. **物理复制，不用软链接**：目标目录必须是真实文件副本，禁止 `ln -s` 软链接。平台不识别软链接，装完不生效。
2. **云端索引只增不删**：豆包客户端（用户 App）的技能列表来自云端索引。Agent 本地删除旧技能，客户端不会自动消失，需用户在豆包 App 技能管理里手动删除。
3. **Agent 本地必须同步删除旧技能**：若 Agent 本地保留旧技能，用户客户端手动删除后，本地旧技能会再次同步回客户端（旧技能回灌）。Agent 本地删干净，才能阻止回灌。
4. **装完立即生效**：新技能无需重开会话即可加载。

## 安装流程

### 1. 拉取仓库最新状态

```bash
cd ~/onespace/github/one-skills && git pull --ff-only
```

### 2. 确定技能清单

- 仓库内所有 `one-*` 目录即最新技能集（每个含 SKILL.md）。
- 仓库根目录的非目录文件（one-agents.md、one-context.md 等）和 `onememory/` 不是技能，不安装。

### 3. 安装 / 更新技能（物理复制）

对仓库每个 `one-*` 技能目录，覆盖安装到 `/runtime/user_skills/`：

```bash
S=/home/user/onespace/github/one-skills
R=/runtime/user_skills
for n in <仓库内每个 one-* 技能名>; do
  rm -rf "$R/$n"
  cp -aL "$S/$n" "$R/$n"   # -L 解引用软链，保证是物理副本
done
```

### 4. 删除旧技能

对比已安装目录与仓库清单：仓库中已删除或已改名的技能，Agent 本地对应目录必须移出/删除：

```bash
for n in <本地存在但仓库已无的旧技能名>; do
  mv "$R/$n" /tmp/ 或 rm -rf "$R/$n"
done
```

- 改名技能的旧目录（如 one-harness-light → one-harness-lite、one-light-skills → one-scrolls）同样删除，只留新名。
- **保留用户自加的非仓库技能**：code-review、grilling、implement-spec、improve-codebase-architecture 不属于 one-skills 仓库，永不删除。

### 5. 验证

```bash
diff -rq <仓库技能目录> <安装目录>   # 应无差异
find /runtime/user_skills -type l    # 应无输出（无软链）
```

## 交付说明

- 向用户说明：客户端若仍显示旧技能，需用户在豆包 App 技能管理手动删除（云端索引只增不删）；Agent 本地已删，不会回灌。
