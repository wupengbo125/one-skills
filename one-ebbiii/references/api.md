# ebbiii API 调用细节

统一鉴权 Header：
`Authorization: Bearer $EBBIII_API_TOKEN`
`Content-Type: application/json`

环境变量：
- `EBBIII_API_TOKEN`：个人设置页生成的长期 Token
- `EBBIII_BASE_URL`：默认 `http://localhost:3000`

```bash
# 调用前检查
[ -z "$EBBIII_API_TOKEN" ] && echo "请先 export EBBIII_API_TOKEN='...'"
```

## 1. 添加问答卡片 POST /api/v1/cards

```bash
curl -s -X POST "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards" \
  -H "Authorization: Bearer $EBBIII_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是 JavaScript 事件循环中的微任务与宏任务？",
    "answer": "微任务（如 Promise.then, MutationObserver）在当前宏任务结束后立即清空执行；宏任务（如 setTimeout, setInterval, I/O）在下一轮事件循环中依次执行。"
  }'
```

响应：
```json
{
  "success": true,
  "data": { "id": "01JFA9XYZ...", "deck_id": 1, "question": "...", "answer": "...", "created_at": "2026-08-24T14:00:00Z" }
}
```

## 2. 搜索已有卡片 GET /api/v1/cards?q=...

```bash
curl -s -X GET "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards?q=事件循环" \
  -H "Authorization: Bearer $EBBIII_API_TOKEN"
```

## 3. 修改卡片 PATCH /api/v1/cards/:id

```bash
curl -s -X PATCH "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards/01JFA9XYZ..." \
  -H "Authorization: Bearer $EBBIII_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "answer": "更新后的精炼答案（不超过200字）" }'
```

## 4. 删除卡片 DELETE /api/v1/cards/:id

```bash
curl -s -X DELETE "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards/01JFA9XYZ..." \
  -H "Authorization: Bearer $EBBIII_API_TOKEN"
```
