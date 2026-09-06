# 寻路与执行协议 (Routing Reference)

任务涉及配置查询、经验排障或事实查找时，遵循以下优先级寻路：

---

## 寻路优先级

1. **项目代号消歧**：
   - 涉及特定项目代号时，查阅 `$github_dir/one-hippocampus/system/aliases.md` 获取对应工程路径与常用操作。
2. **BM25 极速检索**：
   - 优先执行脚本检索本地数据库：
     ```bash
     python3 scripts/free_me.py search "<关键词>"
     ```
     毫秒级输出命中段落，零 Token 消耗快速定位。
3. **语义索引兜底**：
   - 若 BM25 未命中，回退至大模型语义理解，查阅 `$github_dir/one-hippocampus/INDEX.md` 或 `freewiki/index.md` 结构导航。
4. **活跃记忆**：
   - 查阅 `hot.md`（高频常驻记忆）与 `recent.md`（近期活跃指针），命中时执行 `python3 scripts/free_me.py recent "<实体名>" "[指针]"` 刷新时间戳并置顶。
