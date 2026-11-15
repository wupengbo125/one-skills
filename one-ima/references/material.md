# 资料入库 (material)

文件、PDF、Office、图片、网页 → IMA 知识库。**上传流程以 `$IMA_DIR/knowledge-base/SKILL.md` 为准，本文件只给路由与目标。**

## 目标库

先确认库可用，不要硬编码 ID：

```bash
node "$IMA_DIR/ima_api.cjs" "openapi/wiki/v1/get_addable_knowledge_base_list" '{"limit":50}'
```

- 优先用用户点名的库；未点名时用列表里的第一个（当前为 `Pengbo的知识库`）
- 列表为空 → 告知用户没有可写入的知识库，停止

## 文件上传

严格按 `knowledge-base/SKILL.md`：

1. `preflight-check.cjs` 原始文件预检 → `pass=false` 立即终止并说明原因，不重试、不换文件兜底
2. `check_repeated_names` 重名检查 → `is_repeated=true` 问用户保留两者（追加 `_YYYYMMDDHHmmss`）还是取消
3. `create_media` 拿 `media_id` + 临时 COS 凭证 → `code≠0` 终止
4. `cos-upload.cjs` 上传原始字节，不转码 → 非零退出立即停止，**不得**再调 `add_knowledge`
5. `add_knowledge`：`title` = 文件名，`knowledge_base_id` 用上一步确认的库，根目录省略 `folder_id`

凭证只用于本次上传，用完即弃。

## 网页 / 公众号文章

```bash
node "$IMA_DIR/ima_api.cjs" "openapi/wiki/v1/import_urls" \
  '{"knowledge_base_id":"<id>","folder_id":"","urls":["<url>"]}'
```

- 一次 1~10 个 URL，`folder_id` 必填，根目录传空串
- 读 `results[url].ret_code` 判断逐条结果，失败的那条直接报给用户

## 反馈

一句话：入库标题 + 落在哪个库（+ 重名时如何处理的）。
