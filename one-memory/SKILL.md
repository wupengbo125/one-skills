---
name: one-memory
description: "Use when: 记住/存入记忆、回忆/想一下用户画像与偏好、维护 one-memory 记忆库时使用。"
argument-hint: "recall | remember | lint"
---

# One Memory 专属长期记忆中枢

专门存储和维护**用户画像、行为偏好、经验教训、架构决策与本地资产**的长期记忆系统。

仓库根路径：`~/onespace/github/one-memory/`

---

## 记忆分层标准

| 分类 | 对应文件 | 职责说明 |
| :--- | :--- | :--- |
| **画像 (Profile)** | `memories/profile.md` | 用户背景、投资与工作流关注领域 |
| **偏好 (Preferences)** | `memories/preferences.md` | 交互铁律（极简回答、暗号 aaa、中文优先、Skill 极简规范） |
| **教训 (Lessons)** | `memories/lessons.md` | 踩坑与反模式（如 Description 上下文膨胀教训） |
| **决策 (Decisions)** | `memories/decisions.md` | 重大架构选型与技术共识原因 |
| **资产 (Infra)** | `memories/infra/*.md` | 局域网 IP、Omniroute 网关、部署服务端口等 |

---

## 核心操作与执行逻辑

### 1. recall（回忆 / 想一下）
当用户说“想一下…”、“回忆一下…”或需要查询个人偏好与环境配置时：
1. 读取 `INDEX.md` 总索引文件。
2. 依据索引表格精准定位到目标单文件（如 `profile.md`、`decisions.md` 或 `infra/*.md`）。
3. 仅读取该目标文件，提取关键事实直接作答（严禁全库通读）。

### 2. remember（记住 / 总结对话并记住）
当用户说“记住这个…”、“把这次的结论存入记忆库…”或要求沉淀当前会话时：
1. **睡眠提炼法**：剔除对话中的废话与试错过程，仅提炼 3~5 条**高密度事实、断言或决策**。
2. **分类写入**：精准合并追加到上述对应分类文件（或在 `infra/` 下建新文件）。
3. **更新索引**：同步在 `INDEX.md` 追加单行记录与标签。
4. **Git 同步**：
   ```bash
   cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): update <category>" && git push
   ```

### 3. lint（巡检）
校验 `INDEX.md` 表格与 `memories/` 物理文件是否完全一致无死链。
