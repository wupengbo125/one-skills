# 检索与展开卷轴 (scrolls)

卷轴库路径：`~/onespace/github/one-skills/one-scrolls/scrolls/`

```
index.md    大纲索引（卷轴少，一眼看完）
tech/       实操手册（FRP、代理、Cloudflare…）
mindset/    心法
```

---

## 意图分流：先选手段

「有哪些卷轴」「XX 相关的」这类问句检索也搜不到；先按下表挑手段。

| 问法 | 手段 |
| :--- | :--- |
| 某个词、某句话是怎么说的（`FRP`、`代理`、`Cloudflare`） | `python3 ~/onespace/github/one-skills/one-scrolls/scripts/scrolls.py search "<关键词>"` |
| 有哪些、某一类相关的 | 读大纲索引 `scrolls/index.md`，按类下钻 |

**完成标准**：一条路走空就换下一条，两条都走完才算查完；回答里说清走了哪几条。

### SOP：
1. **执行检索**：提炼用户诉求的核心关键词（如 `FRP`、`代理`、`Cloudflare`、`显卡` 等），走上表第一行的检索命令。
2. **定位卷轴**：BM25 检索毫秒级返回 Top-5 候选，包含分类、标题、锚点与高亮摘要。
3. **精准阅读**：Agent 根据摘要判定相关性，**仅精准读取最相关的 1~2 篇 Markdown 卷轴**。
