# 记到海马体 (freewiki 实操手册)

用户明确说“记到海马体”时触发，将本机操作规程、避坑手册写入 `freewiki/`。

海马体数据仓路径：`~/onespace/github/one-hippocampus/`

---

## 核心原则 (遵循 PRD)
- **分类目录**：按英文领域分类存放（如 `tech/`、`workflow/`）。
- **全中文命名**：文档文件名 100% 使用中文（如 `freewiki/tech/某软件本地安装终极避坑手册.md`）。
- **正名为「文档」**：提炼操作方法（怎么做）、资源定位（在哪里）、关键事实，严禁称作“skill”。

---

## 执行步骤

1. **归档落盘**：
   - 写入 `~/onespace/github/one-hippocampus/freewiki/<英文分类>/<中文主题>.md`；
   - 若存在同名文档则章节追加，不存在则新建。
2. **更新大纲**：
   - 在 `~/onespace/github/one-hippocampus/freewiki/index.md` 追加文档指针与核心解决要点。
3. **增量同步索引**：
   ```bash
   python3 ~/onespace/github/one-skills/one-free-me/scripts/free_me.py sync "freewiki/<英文分类>/<中文主题>.md"
   ```
4. **提交本地 Git**：
   - 在 `~/onespace/github/one-hippocampus/` 执行提交（遵循宪法：本地 commit，不 push）。
5. **极简反馈**：一句话仅反馈写入路径与标题。
