# Paseo 给 Claude Code 切换模型的方法

Paseo 内置集成 Claude Agent SDK（非 ACP 协议，切勿配 `extends: "acp"` 与 `--acp`）。通过在 `~/.paseo/config.json` 的 `agents.providers.claude` 中配置 `env` 环境变量，即可将官方模型槽位强制重定向为指定代理与自定义模型。

---

## 1. 配置文件路径

`~/.paseo/config.json`

## 2. 配置内容

在 `agents.providers.claude` 中直接注入 `env`：

```json
"claude": {
  "env": {
    "ANTHROPIC_BASE_URL": "http://100.77.177.59:20128",
    "ANTHROPIC_AUTH_TOKEN": "sk-5e2af274e0e4e907-8a950e-46823488",
    "ANTHROPIC_MODEL": "agy/gemini-3.7-flash-medium",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "agy/gemini-3.7-flash-medium",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "agy/gemini-3.7-flash-medium",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "agy/gemini-3.7-flash-medium",
    "ANTHROPIC_DEFAULT_FABLE_MODEL": "agy/gemini-3.7-flash-medium",
    "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "1000000"
  },
  "enabled": true
}
```

## 3. 重载生效

```bash
paseo reload
```

## 4. 关键重定向变量

- `ANTHROPIC_BASE_URL`: 中转/代理 API 地址（如 Omni）。
- `ANTHROPIC_AUTH_TOKEN`: 对应的 API Key。
- `ANTHROPIC_MODEL`: 默认模型。
- `ANTHROPIC_DEFAULT_SONNET_MODEL` / `ANTHROPIC_DEFAULT_OPUS_MODEL` / `ANTHROPIC_DEFAULT_HAIKU_MODEL`: 覆盖 Paseo 界面选择官方模型时的实际请求目标。
