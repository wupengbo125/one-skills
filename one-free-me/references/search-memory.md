# 查资料与记忆检索

1. **首选全局检索（查所有）**：查任何资料先执行 `python3 scripts/free_me.py search "<关键词>"` 秒搜全库。
2. **用户画像**：涉及个人身份、习惯、喜好或配置，直接读取 `system/profile.md`。
3. **历史流水**：主动询问最近干了什么，读取 `memory/<YYYY-MM>/index.md` 尾部。
4. **分类导航**：未命中时查阅 `freewiki/index.md`，或直接查阅 `memory/<YYYY-MM>/`。

## 索引维护命令 (`scripts/free_me.py`)

- **增量同步**：`python3 scripts/free_me.py sync "<相对路径>"`
- **全量重建**：`python3 scripts/free_me.py rebuild`