# One Super-Me (超级我)：数字化身与双通道记忆中枢

> **核心宗旨**：
> 1. **全域收敛（数据仓与应用层分离）**：海马体（`$github_dir/one-hippocampus/`）是**纯数据仓**，严禁污染个人知识库；客户端能力（BM25 检索、建库同步、记忆治理）**100% 封装在当前 Skill 客户端**（`client.py`）。
> 2. **文档正名**：Hook 自动提炼出的成果是**「文档」**（操作方法、资源位置、关键事实），**绝非「skill」**。
> 3. **中文文章命名规范**：顶层骨架英文；**所有具体的文章与文档文件名，必须 100% 使用中文**（如《本地私有服务启停实操指南.md》）。
> 4. **onewiki 单层平铺**：专供“AI 操作我电脑的独家实操避坑手册”（环境资产、独家操作、踩坑终极路线）。
> 5. **两级寻路与写入即同步**：由 `client.py` 驱动本地 BM25 检索（`.fts.db` 存在但不入 Git）；AI 检索**优先 BM25 查库，未命中时降级大模型语义兜底**；每次内容更新时，保存文件同时**顺便调用 sync 增量写入数据库**。

---

## 一、 核心愿景 (Vision)

One Super-Me 是用户的超级智能体工具与数字化身。
AI 拥有对人类用户的深度认知上下文：
* **用户基础画像**：知晓“我是谁”、生活与物理属性（例如车是电车还是油车）；
* **工程资产与路径**：知晓用户的 GitHub 根目录（`$github_dir`）、名下项目列表；
* **高频别名映射**：当用户说 `OneToDo`、`vfrp` 等代号时，AI 秒懂对应哪个工程、在什么路径执行常用操作；
* **自驱动查手册办事**：用户让 AI 办事时，AI **优先通过客户端 BM25 本地查库**，毫秒级定位对应独家实操手册；若未命中则**自动降级回退至大模型语义泛化理解**，自主闭环执行。

---

## 二、 双通道记忆输入与自动建库机制

```
                     ┌────────────────────────┐
                     │     用户交互与会话      │
                     └───────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼ (每轮 Hook 自动)              ▼ (主动显式指令)
        ┌──────────────────┐            ┌──────────────────┐
        │ 提炼操作/位置中文文档│            │ 独家实操避坑手册  │
        │ one-hippocampus  │            │ one-hippocampus  │
        │ /memory/         │            │ /onewiki/ (单层) │
        └────────┬─────────┘            └────────┬─────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼ (one-skills/one-super-me/client.py 同步)
                        ┌──────────────────┐
                        │ 本地 BM25 数据库 │
                        │ (.fts.db 极速搜) │
                        └────────┬─────────┘
                                 │
                                 ▼
        ┌──────────────────────────────────────────────────┐
        │           $github_dir/one-hippocampus            │
        │                 (纯数据仓)                       │
        │  🔥 hot.md     : 用户纯手动管理，不限条数        │
        │  ⚡ recent.md  : 自动更新，双阈值(2个月/100条)淘汰 │
        │  ❄️ INDEX.md   : 全局冷知识与功能文档总索引      │
        │  👤 system/    : 静态画像(profile)与别名(aliases)│
        └──────────────────────────────────────────────────┘
```

### 1. 通道 A：对话 Hook 自动提炼文档（被动潜意识）
* **运行机制**：每轮用户对话结束后，挂载的 Hook 钩子函数自动介入分析。
* **提炼内容（是「文档」，绝非「skill」）**：
  * **操作方法文档 (How-to)**：新事物怎么做、执行流程规范与排障步骤；
  * **资源定位文档 (Where-is)**：什么东西在哪里、路径配置、服务入口；
  * **事实与认知 (What-is)**：会话中透露的重要事实与上下文；
  * **用户画像同步**：自动补齐/更新静态画像（`system/profile.md`）与别名表（`system/aliases.md`）。
* **存储原则**：按中文主题聚合归并，存入 `$github_dir/one-hippocampus/memory/`；
* **客户端同步**：调用 `python3 client.py sync <相对路径>` 同步 BM25 索引。

### 2. 通道 B：用户主动触发沉淀（主动显意识）
* **运行机制**：非 Hook 方式，由用户明确下达记录、整理手册指令（如“记一下”、“沉淀到 onewiki”）。
* **存储位置**：**`$github_dir/one-hippocampus/onewiki/`**（智能体内部独家实操专区，单层平铺）。
* **内容本质**：AI 操作我电脑的独家实操避坑手册（环境资产、本地私有操作、踩坑跑通路线）。
* **索引规范**：最外层维护 `index.md`，登记每篇手册解决什么操作、对应什么本地资产；
* **客户端同步**：调用 `python3 client.py sync "onewiki/<中文手册名称>.md"` 同步 BM25 索引。

---

## 三、 产品化安装与运行架构 (Install & Runtime)

One Super-Me 采用“安装器 + 外层宿主后壳 + 纯粹运行时客户端 + 通用解耦配置”的清晰分层：

```
one-super-me/
├── install.sh         # 【安装器】：环境检测、宿主 Stop 钩子挂接、Skill 软链
├── uninstall.sh       # 【卸载器】：一键注销后壳与软链，不留系统垃圾
├── hooks/             # 【宿主后壳模板】：被宿主事件触发，调用 client.py ingest
│   ├── claude/stop.sh # Claude Code Stop 事件钩子
│   └── omp/stop.sh    # OMP / Pi Agent 事件钩子
└── client.py          # 【业务客户端】：负责 search、sync、rebuild、clean、ingest
```

### 1. 一键安装与卸载
```bash
# 安装：自动检测环境、初始化 ~/.config/one-super-me/config.env、挂接 Stop 钩子并建库
./install.sh

# 卸载：干净移除宿主钩子与全局软链，保留用户数据
./uninstall.sh
```

### 2. 通用大模型配置 (`~/.config/one-super-me/config.env`)
解耦大模型端点，绝不硬编码私有局域网 IP 或个人账号：
```bash
OPENAI_BASE_URL="https://api.openai.com/v1" # 或本地网关/Ollama
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-4o-mini"
ONE_HIPPOCAMPUS_DIR="/home/ctyun/onespace/github/one-hippocampus"
```

### 3. 客户端指令 (`client.py`)
```bash
# 1. 关键字 BM25 极速检索（最快寻路）
python3 client.py search "<关键词>"

# 2. 数据摄入与提炼（模型分析提取增量并顺便写入 .fts.db）
python3 client.py ingest --text "<会话文本>"

# 3. 增量同步单篇文档索引
python3 client.py sync "<相对路径>"

# 4. 全量重建海马体 .fts.db 索引
python3 client.py rebuild

# 5. 治理近期记忆（执行 60 天 / 100 条双阈值淘汰）
python3 client.py clean
```
---

## 四、 海马体纯数据仓目录拓扑 (`$github_dir/one-hippocampus`)

数据仓内部不含业务执行脚本，只存 Markdown 与本地数据：

```
$github_dir/one-hippocampus/
├── .gitignore               # 忽略 .fts.db 等本地检索库
├── .fts.db                  # 本地 BM25 检索数据库（本地存在，不入 git）
├── INDEX.md                 # 海马体总索引：负责冷知识、各模块与全局文档总导航
├── hot.md                   # 热记忆：纯人工手动维护（不限条数），外部AI宿主永远常驻调用
├── recent.md                # 近期记忆：系统自动维护更新，双阈值（2个月 / 100条）淘汰
├── system/                  # 用户系统配置
│   ├── profile.md           # 基础静态画像（车型油电、环境习惯）
│   └── aliases.md           # 项目代号与高频别名表（如 OneToDo、vfrp）
├── memory/                  # Hook 自动提炼文档池（按中文主题聚合，非 skill）
│   ├── methods/             # 操作方法：如《本地服务部署与重启.md》
│   ├── locations/           # 资源定位：如《局域网机器与服务端口.md》
│   └── facts/               # 事实认知：如《量化回测核心规则.md》
└── onewiki/                 # 独家实操避坑手册专区（单层扁平，严禁二级子目录）
    ├── index.md             # 总索引表：登记每篇手册解决什么操作、针对什么资产
    ├── 某软件本地安装终极避坑手册.md
    ├── 本地私有服务启停实操指南.md
    └── WSL环境显卡驱动配置备忘.md
```
