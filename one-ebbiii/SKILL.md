---
name: one-ebbiii
description: 自动向 ebbiii 记忆系统添加、检索和管理问答闪卡/笔记。当用户要求记录卡片、记入温故、添加闪卡、或者沉淀问答知识时触发。
disable-model-invocation: true
---
# ebbiii 闪卡与问答记忆管理 Skill

用于让 AI Agent 自动化读取环境变量，将对话中的核心知识点沉淀为 **问答卡片 (Flashcards)** 存入用户的 ebbiii  艾宾浩斯复习系统。

## 环境变量依赖

在调用 API 前，确保环境中已配置以下变量：

- `EBBIII_API_TOKEN`: 用户在 ebbiii「个人设置页」生成的专属长期 API Token。
- `EBBIII_BASE_URL`: ebbiii 部署实例的基础 URL（如 `https://ebbiii.<your-account>.workers.dev` 或 `http://localhost:3000`）。若未设置，默认回退至 `http://localhost:3000`。

```bash
# 环境变量检查
if [ -z "$EBBIII_API_TOKEN" ]; then
  echo "请先在系统设置页生成 Token 并配置 export EBBIII_API_TOKEN='...'"
fi
```

## 核心规则与约束

1. **问答结构化**：每张卡片必须包含明确的 `question`（问题）和 `answer`（答案）。
2. **字数极简限制**：
  - **答案（answer）必须简明扼要，严禁冗长，字数绝对不能超过 200 个字**。
  - 提取知识的核心骨架或关键结论，用户复习时能一目了然。
3. **查重防重复**：在添加重要知识卡片前，建议先通过 `GET /api/v1/cards?q=<关键词>` 查询是否已有相同主题的卡片。

---

## API 规范与调用示例

统一鉴权 Header：
`Authorization: Bearer $EBBIII_API_TOKEN`
`Content-Type: application/json`

### 1. 添加问答卡片 (POST /api/v1/cards)

```bash
curl -s -X POST "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards" \
  -H "Authorization: Bearer $EBBIII_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是 JavaScript 事件循环中的微任务与宏任务？",
    "answer": "微任务（如 Promise.then, MutationObserver）在当前宏任务结束后立即清空执行；宏任务（如 setTimeout, setInterval, I/O）在下一轮事件循环中依次执行。"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "01JFA9XYZ...",
    "deck_id": 1,
    "question": "...",
    "answer": "...",
    "created_at": "2026-08-24T14:00:00Z"
  }
}
```

### 2. 搜索已有卡片 (GET /api/v1/cards?q=...)

```bash
curl -s -X GET "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards?q=事件循环" \
  -H "Authorization: Bearer $EBBIII_API_TOKEN"
```

### 3. 修改卡片内容 (PATCH /api/v1/cards/:id)

```bash
curl -s -X PATCH "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards/01JFA9XYZ..." \
  -H "Authorization: Bearer $EBBIII_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "更新后的精炼答案（不超过200字）"
  }'
```

### 4. 删除卡片 (DELETE /api/v1/cards/:id)

```bash
curl -s -X DELETE "${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards/01JFA9XYZ..." \
  -H "Authorization: Bearer $EBBIII_API_TOKEN"
```

---

## AI Agent 操作工作流

1. **提取核心**：根据用户输入或对话内容，提炼出 1 个精准问题及 1 段不超过 200 字的精简解答。
2. **调用接口**：使用 `curl` 或 HTTP 客户端向 `${EBBIII_BASE_URL}/api/v1/cards` 发送 POST 请求。
3. **极简反馈**：添加成功后仅向用户简要输出「✓ 已添加至Ebbiiii：[问题摘要]」。

