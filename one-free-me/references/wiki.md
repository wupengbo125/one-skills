# 记到海马体 (Freewiki Reference)

> 用户说"**记到海马体**"时触发。将具有实操指导价值的避坑与实操沉淀写入 `$github_dir/one-hippocampus/freewiki/`。
> **本质定位**：此专区为实操规程与避坑「文档库」，严禁称作「Skill」。

---

## 执行步骤

1. **确定分类目录**：
   - 分类目录必须全英文（小写连字符），严格禁止创建中文目录名。
   - 优先归入现有英文分类目录；无对应分类时新建英文目录。
2. **写入文件**：
   - 路径：`$github_dir/one-hippocampus/freewiki/<英文分类>/<中文主题>.md`
   - 文件名必须 100% 为全中文。
   - 若已存在同主题文件，在对应章节追加；若不存在，新建文件。
3. **更新索引**：
   - 在 `freewiki/index.md` 对应分类下登记该文档指针与核心解决要点。
4. **Git 推送**：
   ```bash
   cd $github_dir/one-hippocampus
   git add freewiki/
   git commit -m "docs: <中文主题>"
   git push
   ```
5. **极简反馈**：仅反馈写入路径与登记状态。
