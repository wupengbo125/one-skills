# 创建轻 Skill 手册

用户明确说“创建轻 Skill”或“创建冷门技能”时触发，将低频专用技能文档（操作手册、避坑指南）写入 `light-skills/`。

轻 Skill 数据仓路径：`~/onespace/github/one-skills/light-skills/`

---

## 核心原则

- **分类目录**：按英文领域分类存放（如 `tech/`、`workflow/`）。
- **全中文命名**：文档文件名尽量使用中文（如 `light-skills/tech/某软件本地安装终极避坑手册.md`）。
- **轻 Skill 本质**：提炼实操方法（怎么做）、资源定位（在哪里）、关键避坑事实。平时不占系统上下文，用时通过 BM25 检索精准加载。
- **“轻”的定义**：指**使用频度轻**（低频专用，平时不用，查到即用），不是内容轻。

---

## 执行步骤

1. **归档落盘**：
   - 写入 `~/onespace/github/one-skills/light-skills/<英文分类>/<中文主题>.md`；
   - 若存在同名文档则章节追加，不存在则新建。
2. **更新大纲**：
   - 在 `~/onespace/github/one-skills/light-skills/index.md` 追加文档指针与核心解决要点（= 描述）。
3. **增量同步索引**：
   ```bash
   python3 ~/onespace/github/one-skills/one-light-skills/scripts/light_skills.py sync "<英文分类>/<中文主题>.md"
   ```
4. **提交 Git**：
   - 在 `~/onespace/github/one-skills/` 执行本地 commit 并 push。
5. **极简反馈**：一句话仅反馈写入路径与标题。
