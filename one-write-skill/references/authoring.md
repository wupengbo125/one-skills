# Anthropic 官方 skill-creator 干货提炼

Anthropic 官方 skill-creator 是个完整 eval 流程（跑测试、grader、benchmark、viewer），那部分工程化东西这里不抄。只抄"写 skill 本身"的干货，和 Matt 的写作原则互补。

## 开工前先问 4 个

1. 这个 skill 让 Agent 做什么？
2. 什么用户话头/场景会触发它？
3. 输出长什么样？
4. 要不要写测试 case？有客观可验输出的（文件转换、数据抽取、代码生成）要写；主观输出（文风、审美）不用。

## 目录结构

```
skill-name/
├── SKILL.md          # 必需
├── references/       # 按需加载的文档
├── scripts/         # 可执行脚本（确定性、重复任务）
└── assets/           # 输出里要用的文件（模板、图标、字体）
```

## 三层加载预算

| 层 | 内容 | 预算 |
|---|---|---|
| 1. 元数据 | name + description | 常驻，~100 词 |
| 2. SKILL.md 正文 | 触发后才进上下文 | <500 行 |
| 3. 打包资源 | 指针触发才加载 | 不限；scripts 可不进上下文直接跑 |

接近 500 行就往下推，加一层目录 + 指针。大 reference 文件（>300 行）加目录。

## description 要"pushy"

Anthropic 实测 Claude 倾向**欠触发**——该用不用。所以 description 别谦虚，把触发场景写全：

- 差："How to build a simple fast dashboard..."
- 好："...Make sure to use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, **even if they don't explicitly ask for a 'dashboard.'**"

## 按变体组织 references

一个 skill 支持多领域/多框架时，按变体分文件：

```
cloud-deploy/
├── SKILL.md          # 流程 + 选择
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

Agent 只读相关那份。

## 写指令的口气

- **祈使句**开头。
- **解释 why**，别堆 MUST/NEVER。今天的模型聪明，给它理解，它能举一反三。看到自己在写全大写 ALWAYS/NEVER 或超死板结构，就是黄牌——换个说法讲清楚为什么这件事重要。
- 别过拟合到几个例子上。你和用户在 2-3 个例子上反复迭代只是为了快；写出来的 skill 要能在一百万次不同 prompt 上都 work。遇到顽固问题，换比喻、换工作方式，别加死硬规则。

## 找重复劳动

跑 2-3 个真实测试 prompt，看 Agent 的 transcript：
- 如果每个测试都独立写了同一个 `create_docx.py` / `build_chart.py`——这就是信号：把脚本收进 `scripts/`，主文件告诉它用这个。
- 别让每次调用都重新造轮子。

## 写完验证

1. 写 2-3 个真实用户会说的 prompt（不是抽象请求，是带文件路径、上下文、口语、可能有错别字的）。
2. 跑一遍看输出。
3. 让用户反馈，改，再跑。
4. 有客观输出时，跑 with-skill vs 不带 skill 对比，量化看 skill 到底加了什么。

## description 优化（进阶）

做完 skill 后，专门优化 description 的触发准确率：

- 写 20 个 query：8-10 个 should-trigger（不同说法、正式/口语、没点名 skill 但需要的、和别的 skill 竞争但该赢的），8-10 个 should-not-trigger。
- **should-not-trigger 最难的是 near-miss**：共享关键词但其实该触发别的 skill。别写"写个 fibonacci"这种一眼无关的负例——那测不出东西。
- query 要够实质：Claude 只在它自己搞不定的复杂多步任务上才会查 skill。"读这个 PDF"这种简单任务，description 再好也不触发。

## 核心循环

想清楚做什么 → 写草稿 → 跑真实 prompt → 和用户一起看输出 → 改 → 重复。别写完就交差。
