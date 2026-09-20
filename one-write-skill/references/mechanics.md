# Skill 格式细节

## 目录结构

```
my-skill/
├── SKILL.md          # 必需：YAML头 + Markdown正文
├── references/       # 按需加载的细则（文件夹，不是单文件）
│   ├── rules.md
│   └── api.md
└── scripts/          # 可选：脚本
```

## YAML 头

```yaml
---
name: my-skill
description: 干什么 + 什么时候触发（"用户说X时"）
argument-hint: "可选参数说明"
disable-model-invocation: true   # 可选
---
```

## 两种调用方式

**model-invoked**（默认）：有 description，Agent 自动判断触发。永远占上下文。

**user-invoked**：写 `disable-model-invocation: true`，只有人手动输入才触发，零上下文占用。

只手动用的技能就选后者。

## 路由技能

user-invoked 技能多了记不住时，做一个路由技能：一个 user-invoked 技能列出其他技能什么时候用，人只记这一个。它只能提示，不能触发其他技能（user-invoked 没有 description，只有人能调）。

## 主文件 vs references

| 放主文件 | 放 references/ |
|---|---|
| 每个分支都要用的 | 只有部分分支用的 |
| 步骤本身 | 规则、API、例子 |
| 流程骨架 | 细节、长文档 |

主文件里放一行指针："详见 references/xxx.md"。
