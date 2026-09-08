# 本地 AI 网关接入与模型配置 (Omniroute)

## 1. 核心端点与环境变量
* **Base URL**：`http://100.102.228.46:20128/v1`（对应环境变量 `$AI_API`）
* **API Key**：读取环境变量 `$AI_API_KEY`（在 `dotfiles/rc/bash/exports` 中定义）
* **主力模型**：`one-luna`（局域网聚合组合模型，具备渠道自动重试与故障转移）

## 2. 标准接入规范

### 1. 项目 .env 配置文件
```env
OPENAI_BASE_URL="http://100.102.228.46:20128/v1"
OPENAI_API_KEY="${AI_API_KEY}"
OPENAI_MODEL="one-luna"
```

### 2. 代码中直接调用
* **Python**:
  ```python
  import os
  from openai import OpenAI

  client = OpenAI(
      base_url=os.getenv("AI_API", "http://100.102.228.46:20128/v1"),
      api_key=os.getenv("AI_API_KEY"),
  )
  response = client.chat.completions.create(
      model="one-luna",
      messages=[{"role": "user", "content": "Hello"}],
  )
  ```
* **Node.js**:
  ```javascript
  import OpenAI from 'openai';

  const client = new OpenAI({
      baseURL: process.env.AI_API || 'http://100.102.228.46:20128/v1',
      apiKey: process.env.AI_API_KEY,
  });
  const response = await client.chat.completions.create({
      model: 'one-luna',
      messages: [{ role: 'user', content: 'Hello' }],
  });
  ```
