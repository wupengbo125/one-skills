# One Super-Me (超级我)

海马体记忆中枢与伴随模式引擎。

## 目录结构
```
one-skills/one-super-me/
├── super-me       # 统一 CLI 引擎 (BM25 检索 / 增量同步 / 全量重建 / 记忆治理)
├── 伴随模式.md    # 伴随模式核心规范 (由 one-agents.md 统一调度)
├── SKILL.md       # Skill 定义
└── README.md      # 本文档
```

## 核心命令
- `super-me search "<关键词>"`：BM25 极速检索
- `super-me sync "<相对路径>"`：增量同步单篇文档到 `.fts.db`
- `super-me rebuild`：全量重建索引库
- `super-me clean`：近期记忆 60天/100条 治理淘汰
