# 检索 (query)

先定范围：问的是笔记内容还是知识库资料；不确定就两边都查，再合并作答。

## 笔记侧

```bash
# 标题检索
node "$IMA_DIR/ima_api.cjs" "openapi/note/v1/search_note" \
  '{"search_type":0,"query_info":{"title":"<关键词>"},"start":0,"end":20}'

# 正文检索
node "$IMA_DIR/ima_api.cjs" "openapi/note/v1/search_note" \
  '{"search_type":1,"query_info":{"content":"<关键词>"},"start":0,"end":20}'

# 读正文（纯文本；MARKDOWN 不支持）
node "$IMA_DIR/ima_api.cjs" "openapi/note/v1/get_doc_content" \
  '{"note_id":"<id>","target_content_format":0}'
```

- 先标题后正文；标题无命中再走正文
- 需要全量浏览时用 `list_note`（`cursor` 首次传 `""`，`limit` ≤ 20）

## 知识库侧

```bash
node "$IMA_DIR/ima_api.cjs" "openapi/wiki/v1/search_knowledge" \
  '{"query":"<关键词>","cursor":"","knowledge_base_id":"<id>"}'
```

- 库 ID 来自 `get_addable_knowledge_base_list`，不要猜
- 结果含 `media_id`、`title`、`highlight_content`；要看原文再调 `get_media_info`

## 作答

1. 基于检索到的正文/片段回答，不补外部知识填空
2. 标明来源：笔记写《标题》，知识库写条目名
3. 没有命中就直说"没找到"，不要编造，也不要建议"要不要存一份"来掩盖空结果
