# 查资料与记忆检索

- **用户画像与偏好**：涉及个人身份、习惯、喜好或配置，直接读取 `system/profile.md`。
- **历史流水**：用户主动询问最近干了什么或查近期历史时，读取 `memory/<YYYY-MM>/index.md` 尾部。
- **分类导航与归档**：未命中时查阅 `freewiki/index.md`，或直接查阅 `memory/<YYYY-MM>/`。

## 检索脚本命令 (`scripts/free_me.py`)

- **本地全文检索**：`python3 scripts/free_me.py search "<关键词>"`
- **增量同步索引**：`python3 scripts/free_me.py sync "<相对路径>"`
- **全量重建索引**：`python3 scripts/free_me.py rebuild`