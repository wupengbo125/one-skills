---
name: one-write-skill
description: 写或改 skill 时用。决定 SKILL.md 写什么、references 怎么分、description 怎么写才触发得准。
argument-hint: "新技能名 / 要改的技能"
---

# 写 Skill

写或改 skill 时，按这套规矩来。格式细节见 [references/mechanics.md](references/mechanics.md)。

## 核心原则

### 1. description 是唯一触发器
Agent 靠 description 决定什么时候自动加载这个技能。写"什么场景该用我"，别写功能介绍。一个分支一句触发词，别堆同义词。

### 2. 渐进披露
- 主文件只放**每一步都要用的**
- 按需查的细则（规则、API、例子）挪到 `references/` 文件夹
- 主文件里放一行指针："详见 references/xxx.md"
- 判断标准：每个分支都要用的留主文件，只有部分分支用的挪走

### 3. 每步要有完成标准
模糊的"理解到位了"会让 Agent 提前收工。写成可检查的："每个改到的文件都核对过"。

### 4. 用引导词压缩
"快、确定、低开销" → 一个词 `tight`。复用模型已有的词（red/green、tracer bullet），别自己造。

### 5. 别说"不要X"
"别想大象"反而让 Agent 想大象。直接写要它做什么。

### 6. 单一事实来源
同一句话别写两处。环境里能查到的（命令、目录）别复制进 skill。

### 7. 删 no-op
模型默认就会做的事不用写进 skill，写了只白占上下文。
