---
name: one-memory
description: "Use when: 记住/存入记忆、回忆/想一下用户画像与偏好、维护 one-memory 记忆库时使用。"
argument-hint: "recall | remember | lint"
---

# One Memory 专属长期记忆库

专门用于存储和检索**用户画像、行为偏好/铁律、本地基础设施与服务凭证**的长期记忆中枢。

记忆仓库根路径：`~/onespace/github/one-memory/`

---

## 记忆分层结构

* `memories/profile.md`：用户画像（技术流派、投资关注领域、宏观视野）
* `memories/preferences.md`：行为偏好与铁律（极简结论、暗号 aaa、中文交互、Skill 极简原则）
* `memories/infra/`：基础设施与凭据（omniroute 代理、服务端口、局域网 IP 等）

---

## 核心操作

### 1. recall（回忆 / 想一下）
当用户说“想一下…”、“回忆一下…”或需要查询个人偏好与环境配置时：
1. 读取 `INDEX.md` 总索引。
2. 依据索引定位到 `profile.md` / `preferences.md` / `infra/*.md`。
3. 仅读取对应目标文件提取关键信息并回答。

### 2. remember（记住 / 存入记忆）
当用户明确要求“记住这个…”、“存入记忆库…”时：
1. 识别属于【画像】/【偏好】/【基础设施】，归入对应文件。
2. 更新 `INDEX.md` 索引说明。
3. 自动执行 Git 提交与远程推送：
   ```bash
   cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): update <category>" && git push
   ```

### 3. lint（巡检）
检查 `INDEX.md` 与实际文件是否一一对应无死链。
