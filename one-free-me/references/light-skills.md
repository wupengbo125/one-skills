# 轻 Skill（light-skills）创建手册

用户明确说"创建轻 Skill"或"创建冷门记录"时触发，将低频专用技能文档（操作手册、避坑手册）写入 `light-skills/`。

海马体数据仓路径：`~/onespace/github/one-hippocampus/`

---

## 核心原则

- **分类目录**：按英文领域分类存放（如 `tech/`、`workflow/`）。
- **全中文命名**：文档文件名尽量使用中文（如 `light-skills/tech/某软件本地安装终极避坑手册.md`）。
- **轻 Skill 本质**：提炼操作方法（怎么做）、资源定位（在哪里）、关键事实。不用传统 Skill 的触发式加载，靠 BM25 检索 + index 大纲（index 条目即 description）。
- **"轻"的定义**：指**使用频度轻**（低频专用，如一年用一次的平台操作手册），不是内容轻——大手册照样放这里；平时不占上下文，用时按需检索。

---

## 执行步骤

1. **归档落盘**：
   - 写入 `~/onespace/github/one-hippocampus/light-skills/<英文分类>/<中文主题>.md`；
   - 若存在同名文档则章节追加，不存在则新建。
2. **更新大纲**：
   - 在 `~/onespace/github/one-hippocampus/light-skills/index.md` 追加文档指针与核心解决要点（= description）。
3. **增量同步索引**：
   ```bash
   python3 ~/onespace/github/one-skills/one-free-me/scripts/free_me.py sync "light-skills/<英文分类>/<中文主题>.md"
   ```
4. **提交 Git**：
   - 在 `~/onespace/github/one-hippocampus/` 执行提交。
5. **极简反馈**：一句话仅反馈写入路径与标题。
