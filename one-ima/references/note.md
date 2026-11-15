# 笔记写入 (note)

三个入口，先判定走哪个：

| 场景 | 判断 | 目标 |
| :--- | :--- | :--- |
| 一句话 / 清单 / 灵感 | 内容短、无标题需求 | 追加到《大本子》 |
| 读书笔记 | 用户说"记到《书名》" | 追加到《书名》同名笔记 |
| 整篇内容 | 用户给了长文、文章、对话总结，或明确说"新建" | 新建一篇笔记 |

## 通用：新建笔记

```bash
node "$IMA_DIR/ima_api.cjs" "openapi/note/v1/import_doc" \
  '{"content_format":1,"content":"<markdown 正文>","folder_name":"<可选：笔记本名>"}'
```

- `content_format` 固定 `1`（MARKDOWN）
- 标题写进正文第一行 `# <YYYY-MM-DD> <中文标题>`，接口本身没有 title 字段
- 返回 `data.note_id`，反馈时带上

## 通用：定位已有笔记

```bash
node "$IMA_DIR/ima_api.cjs" "openapi/note/v1/search_note" \
  '{"search_type":0,"query_info":{"title":"<标题关键词>"},"start":0,"end":20}'
```

- 命中多条 → 列出候选让用户选，不猜
- 唯一命中 → 告知"追加到《X》"，然后 append

追加：

```bash
node "$IMA_DIR/ima_api.cjs" "openapi/note/v1/append_doc" \
  '{"note_id":"<id>","content_format":1,"content":"<markdown>"}'
```

## 1. 大本子（条目模式）

- 先 `search_note` 标题 `大本子`
- 不存在 → `import_doc` 新建，正文 `# 大本子`
- 存在 → `append_doc`，内容为一条 `- <用户原话>`；用户说明了归属（如"集会""电影""宠物"）就写成 `## <小节>` 再跟条目，没说明就直接 `-`
- 不新建每篇小文件，不预设分类

## 2. 读书笔记

- 目标笔记标题 = 书名本身，如《认知觉醒》《正念的奇迹》
- 先 `search_note` 标题关键词，存在则追加，不存在则 `import_doc` 新建
- 追加内容格式：

```markdown
## YYYY-MM-DD

<用户原话>

```

- 不要建"书目索引"之类的额外笔记

## 3. 整篇内容（文档模式）

- 一次 `import_doc`，标题 `YYYY-MM-DD <中文标题>`
- 保留用户原文；需要整理时保留原有小标题层级，不擅自改写措辞
- 同一主题已有多篇时，不合并、不改名，新建即可（IMA 侧靠搜索召回，不靠目录）
