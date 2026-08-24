---
name: one-ov-teach
description: "AI 智能体的上下文数据库"
disable-model-invocation: true
---
官网：[https://www.openviking.ai](https://www.openviking.ai) · 在线体验：[https://openviking.ai/studio](https://openviking.ai/studio) · GitHub：[https://github.com/volcengine/OpenViking](https://github.com/volcengine/OpenViking) · 文档：[https://docs.openviking.ai/](https://docs.openviking.ai/)

---

## OpenViking 是什么

OpenViking 是面向 AI 智能体的开源上下文数据库。记忆、资源、技能统一存放在 `viking://` 协议下的虚拟文件系统里，智能体用 `ls`、`tree`、`find` 浏览自己的上下文，不必去查一个黑盒向量库。内容写入时会处理成三层——L0 摘要、L1 概览、L2 详情——按需加载。每次检索都留下轨迹，可以查看，也可以调试。完整介绍见入门文档。

OpenViking Studio 实验场——在线 Demo，打开浏览器就能试，无需安装。

## 为什么用 OpenViking

- **一个文件系统装下所有上下文。** 记忆、资源、技能各有一个 `viking://` URI。智能体像开发者操作文件一样，确定地定位和操作上下文。→ Viking URI · 上下文类型
- **分层加载省 token。** 每条内容写入时生成 L0（摘要）、L1（概览）、L2（详情）三层，任务需要多深就加载多深。→ 上下文分层
- **目录递归检索。** 向量检索先定位得分最高的目录，再逐层向下探索，结果连同周边上下文一起返回。→ 检索机制
- **检索过程可观察。** 每次查询都保留目录浏览轨迹。结果不对时，能看到它出自哪条路径。→ 检索机制
- **会话沉淀为记忆。** 会话提交后，OpenViking 异步提取用户偏好和智能体经验，写入长期记忆。→ 会话管理

各部分如何配合：见架构。设计思路：The Database Paradigm for Context Engineering（页内可切换中文）。

```
viking://
├── resources/              # 资源：项目文档、代码库、网页等
│   └── my_project/
│       ├── docs/
│       │   ├── api/
│       │   └── tutorials/
│       └── src/
└── user/
    └── {user_id}/
        ├── memories/
        │   └── preferences/
        │       ├── writing_style
        │       └── coding_habits
        ├── resources/
        │   └── private_project/
        ├── skills/
        │   ├── search_code
        │   └── analyze_data
        └── peers/
            └── web-visitor-alice/
```

三个加载层级：

- **L0（摘要）**：一句话总结，用来快速判断相关性。
- **L1（概览）**：核心信息和使用场景，供规划阶段决策。
- **L2（详情）**：完整原始数据，只在需要时读取。

每个目录都带自己的 L0/L1 层，读完整文件之前就能判断相关性：

```
viking://resources/my_project/
├── .abstract               # L0：约 100 tokens——快速判断相关性
├── .overview               # L1：约 2k tokens——结构和要点
└── docs/
    ├── .abstract
    ├── .overview
    └── api/
        ├── auth.md         # L2：完整内容，按需加载
        └── endpoints.md
```

## 评测结果

OpenViking 0.3.22 的评测覆盖长对话用户记忆（LoCoMo）和多轮智能体任务（tau2-bench）。完整结果和实验设置（含知识库问答）见评测报告，复现脚本在 ./benchmark。

记忆评测使用 Doubao 2.0 Pro 作为 VLM，使用 Doubao-embedding-vision-251215 作为 Embedding 模型。

- **用户记忆（LoCoMo）**：接入 OpenViking 后，三种 Agent 集成的准确率都到 80–83%，原生记忆只有 24–57%；同时输入 token 减少 34.3%–91.0%，查询时延降低 58.45%–66.10%。
- **智能体经验（tau2-bench）**：经验记忆让任务成功率在 Retail 提升 6.87pp、Airline 提升 11.87pp（对比同一 LLM 无记忆）。

## 快速开始

> 💡 **想先看看实际效果？** 试试 OpenViking Studio——官方托管的在线实例，带上下文实验场、语义检索和多智能体 Hub，无需安装。

需要 Python 3.10 或更高版本。

```bash
pip install openviking --upgrade
openviking-server init      # 交互式向导：提供商、模型、ov.conf
openviking-server doctor    # 校验配置
openviking-server           # 启动
```

或者在后台运行：

```bash
nohup openviking-server > /data/log/openviking.log 2>&1 &
```

`init` 引导你完成提供商配置，并写入 `~/.openviking/ov.conf`。它支持火山引擎、OpenAI、Codex OAuth、Kimi、GLM 和本地 Ollama——选 Ollama 时还能检测并安装运行时，按你的硬件拉取合适的模型。`doctor` 检查配置文件、Python 版本、提供商连通性和磁盘空间，不需要先启动服务器。

手写 `ov.conf` 的模板、各提供商示例、环境变量、Windows 配置和 CLI/客户端配置，见配置指南和快速入门文档。

服务器跑起来之后：

```bash
ov status
ov add-resource https://github.com/volcengine/OpenViking # --wait
ov ls viking://resources/
ov tree viking://resources/volcengine -L 2
# 没加 --wait 的话，语义处理需要等一段时间
ov find "what is openviking"
ov grep "openviking" --uri viking://resources/volcengine/OpenViking/docs/zh
```

重建已有索引：`ov reindex <uri> --mode vectors_only` 只刷新向量；`--mode semantic_and_vectors` 先重新生成语义产物（`.abstract.md`、`.overview.md`）再刷新向量；添加 `--recursive=false` 可只刷新目标目录自身的语义产物及 L0/L1 向量；`--mode prune_orphans` 清理源文件已不存在的向量记录（加 `--dry-run` 可预览）。没有 `semantic` 或 `full` 这样的模式别名。

客户端配置可以用 `ov config` 交互式初始化；有多台服务器时，用 `ov config switch` 切换。

Rust CLI 通过 `npm i -g @openviking/cli` 安装，也可以从源码构建：`cargo install --git https://github.com/volcengine/OpenViking ov_cli`，见 CLI 安装。官方 Docker 镜像也已提供，见部署指南。

## 接入你的 Agent

集成会把 OpenViking 的召回注入 Agent 上下文，并自动提交会话记忆：

- Claude Code
- Codex
- OpenClaw
- Hermes
- Cursor
- Trae
- OpenCode
- pi
- Agent Plugins 1.0
- MCP 客户端
- LangChain / LangGraph

各 Agent 的接入步骤：Agent 集成总览。

## OpenViking Helper（Beta）

OpenViking Helper 是一个桌面控制台，目前处于 Beta 阶段，支持 macOS 和 Windows x64：

- **可视化接入本地 Agent**：检测 OpenViking CLI、Claude Code、Codex、Cursor、Trae 和 OpenCode，并配置支持的插件、MCP、Hook 和 CLI 接入。
- **查看会话轨迹**：解析 Claude Code、Codex 和 Trae 的会话，展示 OpenViking 的召回、Prompt 注入、MCP 调用、捕获和提交事件。
- **管理本地记忆与技能**：查看本地 memory / rule 文件和 `SKILL.md` 技能，并同步到 OpenViking。

## VikingBot

VikingBot 是构建在 OpenViking 之上的 AI 智能体框架：

```bash
pip install "openviking[bot]"
openviking-server --with-bot
ov chat   # 在另一个终端运行
```

官方 Docker 镜像内置 VikingBot，默认随服务器和控制台 UI 一起启动。详情见 VikingBot 指南。

## 生产部署

生产环境建议把 OpenViking 作为独立 HTTP 服务运行——见服务器部署和部署指南。

## 商业版本

**开源版本不会被削弱。** 本仓库的 OpenViking 以 AGPLv3 完整开源：不锁功能、不需要注册账号、不需要激活码，按上面的生产部署自行部署即可用于生产环境，并且会一直如此。

下面两个版本解决的是「谁来运维、部署在哪」，不是「能不能用」。

### ☁️ 商业化 SaaS 版

由**火山引擎**官方托管，开箱即用，不用自建也不用运维。

- **个人版** — 面向个人开发者，最多 50 个文件免费试用，借助 VikingDB 获得远超本地硬件的扩展能力。
- **企业版** — 面向团队的多用户上下文管理、协作与权限、企业级 SLA 与技术支持。
开源版用户可以用迁移工具平滑迁入。

### 🏢 私有化部署版

部署在**你自己的环境**里，数据不出域。

- **在线部署** — 部署到你自己的云账号 / VPC，支持 BYOC，可连公网获取更新与授权。
- **离线部署** — 完全内网、无外网连接的环境，适用于政企、金融、制造等强合规场景。
在开源版基础上增加分布式部署能力与官方技术支持，通过激活码激活。

> 只想自己跑开源版？完全没问题，不需要联系任何人，直接看快速开始。

## 研究

OpenViking 开源了 VikingMem 论文中描述的部分核心能力：

> **VikingMem: A Memory Base Management System for Stateful LLM-based Applications**
> Jiajie Fu, Junwen Chen, Mengzhao Wang, Aoxiang He, Maojia Sheng, Xiangyu Ke, Yifan Zhu, and Yunjun Gao.
> arXiv:2605.29640, 2026。已被 VLDB 2026 接收。

## 合作伙伴

OpenViking 欢迎与其他开源项目合作建设上下文数据生态。目前已确认的合作项目包括：

- deer-flow - 开源的长周期 SuperAgent 框架
- NoKV - AI 原生的分布式文件系统
- loopx - 轻量级循环工程状态内核
- Hermes Agent - 与用户共同成长的智能体

有兴趣加入我们的合作伙伴列表？请在社区提交 issue 来申请加入。

## 社区与贡献

OpenViking 还在早期阶段，要做的事还很多。

- **文档**：docs.openviking.ai · FAQ
- **博客**：blog.openviking.ai
- **团队**：关于我们
- **交流**：📱 飞书群 · 💬 微信群 · 🎮 Discord · 🐦 X
- **贡献**：修 bug、加新功能都欢迎——见 CONTRIBUTING_CN.md

## 安全与隐私

本项目重视安全问题。
漏洞报告方式和受支持的版本，见 SECURITY.md

## 许可证

OpenViking 各组件采用不同的许可证：

- **主项目**：AGPLv3——详见 LICENSE
- **crates/ov_cli**：Apache 2.0——详见 LICENSE
- **examples**：Apache 2.0——详见 LICENSE
- **third_party**：各三方项目保留其原有协议

