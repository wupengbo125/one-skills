---
name: one-openviking
description: "通过 OpenViking (ov) 显式管理长期记忆、知识资源与技能。当用户要求记忆、回忆、或管理 OpenViking 资源时触发。"
---

# One OpenViking (显式上下文与记忆管理)

本技能用于通过 `ov` CLI 显式操作 OpenViking 上下文数据库，替代不可控的隐式自动拦截。
所有操作必须**显式、白盒、按需加载**。

---

## 协议与分层路径规范 (`viking://`)

- **用户记忆**：`viking://user/memories/`
  - 偏好设定：`viking://user/memories/preferences/`
  - 经验/历史：`viking://user/memories/experience/`
- **公共资源/知识库**：`viking://resources/`
- **技能库**：`viking://user/skills/`

---

## 核心操作契约

### 1. 记忆沉淀（用户明确要求“记住”、“保存到记忆”、“记一下会话”时）
将对话内容、决策经验或会话总结直接沉淀到长期记忆：
```bash
# 纯文本直接写入用户记忆
ov add-memory "<会话总结或要记住的文本>"

# 结构化消息格式写入
ov add-memory '{"role":"user","content":"要记住的关键信息"}'
```

### 2. 语义回忆/检索（用户明确要求“回忆”、“查一下之前的记录”、“搜索知识库”时）
使用 `ov find` 进行语义检索：
```bash
# 1. 检索记忆/资源（先获取 L0/L1 摘要定位路径）
ov find "<查询关键词>"

# 2. 指定范围检索
ov find "<查询关键词>" --uri viking://user/memories/
```

### 3. 查看目录与结构（用户要求“查看有哪些记忆/资源”时）
```bash
# 列出根目录或指定目录
ov ls viking://user/memories/

# 查看目录树（控制层级）
ov tree viking://resources/ -L 2
```

### 4. 精确读取详情（L2 按需加载）
定位到具体 URI 后，才读取完整内容：
```bash
ov read <viking://URI>
```

### 5. 关键词精确匹配
```bash
ov grep "<关键词>" --uri <viking://URI>
```

---

## 执行原则
1. **绝不静默拦截**：仅在用户明确发出记忆、查询、回忆指令时调用 `ov`。
2. **分层加载**：优先使用 `ov find` 或 `ov tree` 查看 L0 摘要与 L1 概览，确认命中后才使用 `ov read` 读取 L2 完整内容，杜绝 Token 浪费。
3. **白盒输出**：检索到结果后，简要说明出自哪个 `viking://` 路径及核心结论。
