---
name: one-config-omni-model-to-your-app
description: "Use when: 需要配置 AI Token 时使用。"
---

# 本地 AI Token 与模型配置规范

当项目、脚本或容器需要填写/配置大模型凭证时，统一使用本地局域网提供的凭据。

## 核心凭据

* **API Key**：读取环境变量 `$AI_API_KEY`（在 `dotfiles/rc/bash/exports` 中定义）
* **Base URL**：`http://100.102.228.46:20128/v1`（对应环境变量 `$AI_API`）
* **默认模型**：`one-luna`（组合模型，后台自带自动故障切换与重试）

## 典型配置示例

### 1. 项目 .env 配置文件
```env
OPENAI_BASE_URL="http://100.102.228.46:20128/v1"
OPENAI_API_KEY="${AI_API_KEY}"
OPENAI_MODEL="one-luna"
```

### 2. 代码中直接调用
* **Python**: `base_url=os.getenv("AI_API", "http://100.102.228.46:20128/v1")`, `api_key=os.getenv("AI_API_KEY")`, `model="one-luna"`
* **Node.js**: `baseURL: process.env.AI_API || 'http://100.102.228.46:20128/v1'`, `apiKey: process.env.AI_API_KEY`, `model: 'one-luna'`
