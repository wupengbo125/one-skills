# 检索与展开卷轴 (scrolls)

卷轴库路径：`~/onespace/github/one-skills/one-scrolls/scrolls/`

---

## 检索第一准则：首选 BM25 全文检索

遇到任何**查卷轴、展开卷轴、查冷门技能、查避坑手册、查环境/工具/流程实操方案**时，**第一步直接执行 BM25 全文检索**：

```bash
python3 ~/onespace/github/one-skills/one-scrolls/scripts/scrolls.py search "<关键词>"
```

### SOP：
1. **执行检索**：提炼用户诉求的核心关键词（如 `FRP`、`代理`、`Cloudflare`、`显卡` 等），执行上述命令。
2. **定位卷轴**：BM25 检索毫秒级返回 Top-5 候选，包含分类、标题、锚点与高亮摘要。
3. **精准阅读**：Agent 根据摘要判定相关性，**仅精准读取最相关的 1~2 篇 Markdown 卷轴**。
4. **大纲兜底**：若检索无果，可直接查看大纲索引：`~/onespace/github/one-skills/one-scrolls/scrolls/index.md`。
