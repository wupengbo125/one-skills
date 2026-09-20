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

## 安装流程（暴力更新：先删所有，再全量装）

### 1. 拉取仓库最新状态

```bash
cd ~/onespace/github/one-skills && git pull --ff-only
```

### 2. 删除并全量复制安装（物理复制）

```bash
rm -rf /runtime/user_skills/one-*
cp -aL /home/user/onespace/github/one-skills/one-* /runtime/user_skills/
```

### 3. 安装本技能自身

本技能名不是 `one-*` 开头，通配符不会带上，需单独复制：

```bash
rm -rf /runtime/user_skills/install-doubao-skill
cp -aL /home/user/onespace/github/one-skills/install-doubao-skill /runtime/user_skills/
```

> 旧技能、改名技能、仓库已删除的技能一并清空，无需逐个对比。
> 非 one-* 的用户自加技能（code-review、grilling、implement-spec、improve-codebase-architecture）不受影响，保留。
> 仓库根目录的非目录文件（one-agents.md、one-context.md 等）和 `onememory/` 不是技能，不安装。

### 4. 验证

```bash
diff -rq <仓库技能目录> <安装目录>   # 应无差异
find /runtime/user_skills -type l    # 应无输出（无软链）
```

### 5. 同步全局偏好

安装完成后，把当前已装技能清单写入豆包全局偏好（`manage_preference`），让每个新会话自动知道有哪些技能可用：

```bash
ls -d /runtime/user_skills/*/ | xargs -n1 basename | sort
```

把输出拼成一句话（如"已装技能：one-memory、one-wiki、one-write-skill……"），调 `manage_preference` action=add 写入。已有同主题偏好则 action=update 替换。

## 交付说明

- 向用户说明：客户端若仍显示旧技能，需用户在豆包 App 技能管理手动删除（云端索引只增不删）；Agent 本地已删，不会回灌。
