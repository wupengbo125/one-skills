# 查资料与记忆检索指南

海马记忆仓数据仓路径：`~/onespace/github/one-hippocampus/`

```
memory/     每日流水        <YYYY-MM>/<YYYY-MM-DD>.md
personal/   preferences.md 偏好、profile.md 画像
rules.md    全局规则（跨项目 AI 行为规范）
INDEX.md    总索引
```

---

## 一、 意图分流：先选手段

「最近」「有哪些」「哪一类」这类问句里没有可搜的内容词，索引里搜不到；先按下表挑手段。

| 问法 | 手段 |
| :--- | :--- |
| 某个词、某句话是怎么说的（概念、踩坑、技术决策、方案、原话） | BM25 检索：`python3 scripts/fts.py search "<关键词>"` |
| 某个方面、某一类里都有什么 | 从索引进：读总索引 `~/onespace/github/one-hippocampus/INDEX.md`，顺双链下钻 |
| 最近、流水、时间 | 列目录：`ls ~/onespace/github/one-hippocampus/memory/<YYYY-MM>/`，再读对应当日文件 |
| 偏好、习惯、喜不喜欢 | 读 `~/onespace/github/one-hippocampus/personal/preferences.md` |
| 画像、身份、信仰、健康、出行 | 读 `~/onespace/github/one-hippocampus/personal/profile.md` |
| 全局规则、跨项目行为规范 | 读 `~/onespace/github/one-hippocampus/rules.md` |

**完成标准**：一条路走空或对不上就换下一条，各条都走完才算查完；回答里说清走了哪几条。

### 检索执行与结果处理 SOP：
1. **执行检索**：提炼用户诉求的核心关键词（如 `代理`、`FRP`、`显卡` 等），走上表第一行的检索命令。
2. **定位文档**：BM25 检索毫秒级返回 Top-5 候选，包含文档路径、分类、匹配标题与带高亮 `【】` 的原生上下文摘要。
3. **精准阅读**：Agent 根据返回的摘要判定相关性，**仅精准读取最相关的 1~2 篇 Markdown 文档**，切勿盲目全读。
4. **关键词调优**：若未命中或结果不足，精简或更换关键词（拆成 1~2 个核心词）再次检索。

---

## 二、 兜底大纲与索引维护

- **全局总索引**：`~/onespace/github/one-hippocampus/INDEX.md`
- **全量重建索引**：若发现新写入的文档检索不到，或索引库异常，运行重建：
  ```bash
  python3 scripts/fts.py rebuild
  ```