---
name: one-memory
description: "Use when: 记住/存入记忆、回忆/想一下分层记忆与画像、维护 one-memory 记忆库时使用。"
argument-hint: "recall | remember | lint"
---

# One Memory 树状分层长期记忆中枢

专门存储和维护**用户画像、多领域知识记忆 (金融/英语/数学等)、架构决策与本地资产**的长期记忆系统。

仓库根路径：`~/onespace/github/one-memory/`

---

## 树状记忆分层结构 (Hierarchical Layout)

```text
one-memory/
├── INDEX.md                         # 顶层树状总索引导航
└── memories/
    ├── system/                      # 【系统层】profile.md (画像), preferences.md (铁律)
    ├── finance/                     # 【金融层】macro/ (宏观), sectors/ (板块), strategies/ (策略)
    ├── learning/                    # 【学科层】english/ (英语), math/ (数学/量化)
    ├── infra/                       # 【资产层】omniroute-api.md, worldmonitor.md, servers.md
    └── meta/                        # 【元认知】lessons.md (踩坑), decisions.md (决策)
```

---

## 核心操作与执行逻辑

### 1. recall（回忆 / 想一下 / 逐级下钻）
当用户说“想一下…”、“回忆一下…”或需要查询特定领域记忆时：
1. **第 1 级（看大类）**：读取 `INDEX.md`，根据问题意图瞬间锁定所属领域（如金融宏观、股票策略、AI配置、交互铁律）。
2. **第 2 级（定位卡片）**：从大类表格中提取具体的 `memories/<domain>/<subpath>.md`。
3. **第 3 级（精准装载）**：仅读取该目标卡片文件并作答，**严禁跨大类全库扫描**。

### 2. remember（记住 / 树状沉淀）
当用户说“记住这个…”、“把关于 [某领域] 的结论存入记忆库…”时：
1. **定位层级**：判断属于现有大类（system/finance/learning/infra/meta）或按需建立新子分类目录。
2. **提炼写入**：执行“睡眠提炼法”，将内容萃取为 3~5 条高密度断言，写入对应 `memories/<domain>/<subpath>.md`。
3. **挂载索引**：在 `INDEX.md` 对应的大类表格中追加单行说明与标签。
4. **Git 同步**：
   ```bash
   cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): add <domain>/<name>" && git push
   ```

### 3. lint（巡检）
校验 `INDEX.md` 的大类树与物理目录、文件是否完全一致无死链。
