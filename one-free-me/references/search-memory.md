# 查资料与记忆检索

- **用户画像与偏好**：涉及个人身份、习惯、喜好或配置，直接读取 `system/profile.md`。
- **历史流水**：用户主动询问最近干了什么或查近期历史时，读取 `history/<YYYY-MM>.md` 尾部。
- **全局检索**：查资料统一先搜 `python3 scripts/free_me.py search "<关键词>"`。
- **分类导航**：未命中时查阅 `freewiki/index.md`。
- **归档记忆**：亦可直接查阅 `memory/<YYYY-MM>/`。