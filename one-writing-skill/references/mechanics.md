# Skill 格式细节

Matt `writing-for-agents` 的 skill 分支：当文档是 skill 时，什么会变（YAML 头、触发方式选择、路由技能）。其余写法见主 SKILL.md。

## 目录结构

```
my-skill/
├── SKILL.md          # 必需：YAML头 + Markdown正文
├── references/       # 按需加载的细则（文件夹，非单文件）
│   ├── rules.md
│   └── api.md
└── scripts/          # 可选：工具脚本
```

## 触发方式

两种选择，权衡两种负担：

- **model-invoked**（模型自动触发）：保留 `description`，Agent 自己触发，别的 skill 也能调它。照样可以手输它的名字：模型触发**包含**人手可达；description 只加 Agent 发现，从不去掉人的。description 是 skill 的顶层上下文指针，被迫常驻：永久上下文负担，换可发现性。内容全是参考的 model-invoked skill 也是共享参考的家：另一个 skill 能调它，多个 skill 需要的参考放一处。写法：省略 `disable-model-invocation`，写模型面向的 description，带触发分支（主 SKILL.md 的指针规则全适用）。
- **user-invoked**（手动触发）：把 description 从 Agent 可达性里剥掉：只有人输它的名字能调，别的 skill 也不能调。零上下文负担，但花认知负担：你是必须记住它存在的索引。写法：设 `disable-model-invocation: true`；`description` 变人读：一行总结，触发列表全删。

只在 Agent 必须自己够到、或别的 skill 必须调时才选 model-invoked。如果只手触发，做成 user-invoked，不付上下文负担。

两个 user-invoked skill 都需要的共享参考，两个都放不下：没有 description，谁也调不动谁。推到 skill 体系外的普通文件：任何 skill 都能指的外部参考。

## 按触发切分

切分的触发口（顺序切口在主 SKILL.md）：当你有个独立引导词该自己触发它（你在 prompt 里真用的触发词），或别的 skill 必须调它时，切出一个 model-invoked skill。你为新的常驻 description 付上下文负担，所以独立可达必须值这个钱。

## 路由技能

user-invoked skill 多到记不住时，堆起来的认知负担由**路由技能**治好：一个 user-invoked skill 列出其他 skill 什么时候用，人只记这一个。它只能提示、不能触发那些 skill：user-invoked 没 description，除了人谁也够不到。
