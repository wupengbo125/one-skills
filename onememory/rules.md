# Project Rules Memory

（本文件记录行为规则与项目知识，上限 150 行，超限触发同类合并。每条规则正文 ≤100 字、建议约 60 字，只写「动作 + 关键对象」；纯命令属知识，不入规范。）

## Entries

宪法与规则只做用户全局分发，禁止项目级软链
- Date: 2026-09-14
- Instructions:
  - 规则只经 `USER_GLOBAL_RULES` 分发到各工具用户级记忆位，禁止项目根写 `AGENTS.md`/`CLAUDE.md` 或生成 `one-context.md`
  - 全局记忆位靠逆向/实测确认，结论注释进 `install.sh` 对应数组上方
  - 接入新工具只增删 `USER_GLOBAL_RULES`/`USER_GLOBAL_DIRS`，不改分发流程

「移植/改成另一种语言」= 替换，不是并存
- Date: 2026-09-18
- Instructions:
  - 用户说"移植/迁移/改成 X"时删除旧实现，仓库只留一份
  - 不为"稳妥"保留旧文件或多份入口
  - 旧实现已入库则删除，`git checkout` 可恢复

用户给过的事实（端口/隧道名/配置）禁止臆造
- Date: 2026-09-19
- Instructions:
  - 用户提供过的配置/隧道名/端口/路径先读原文件原样沿用，再谈方案
  - 输出方案前确认事实来源（读文件/命令），禁止把猜测值当可执行步骤

Orca worktree 落点统一到 /home/ctyun/onespace/worktree
- Date: 2026-09-19
- Category: Environment Configuration
- Instructions:
  - Orca worktree 落点统一配到 /home/ctyun/onespace/worktree（逐仓库 setup 的 worktreeBasePath）
  - `orca worktree create` 无路径参数，只能靠 setup 的 worktreeBasePath
  - 本机 11 仓库已设；偶发 "runtime closed the connection" 重试即可

Orca CLI 集成坑点（worktree / terminal / agent id）
- Date: 2026-09-19
- Category: Troubleshooting & Debugging
- Instructions:
  - Orca 不支持 CodeBuddy；CodeBuddy 走「建 worktree + 终端跑 codebuddy + terminal send」
  - `prime-agent` 是另一独立产品，禁止软链/归一化指向 `codebuddy`
  - 分支带 `<user>/<name>` 前缀，`branch:` 选择器匹配不到，用 `worktree create --json` 返回的 id 走 `id:` 选择器
  - `orca terminal wait --for tui-idle` 在 TUI 启动时就返回，判断 trust 弹窗只能轮询 `orca terminal read`
  - 查 Orca 能力与 TUI 实际渲染用其 `agent-context` / `terminal read --screen` 接口

本机 Tailscale 自定义 DERP（经公共 FRP 中继）运维要点
- Date: 2026-09-19
- Category: Environment Configuration
- Instructions:
  - derper 需自编译（GOPROXY 用国内镜像）
  - 非 root 跑 derper 须显式给 `-c` 指向 StateDirectory 下的 key
  - 自签证书免装 CA：启动日志的 `CertName` 写进 derpMap 即 pinning
  - FRP 是面板型：隧道先在面板建且名字类型匹配，`frpc.toml` 的 `remotePort` 无效
  - 别关 STUN（`STUNPort:-1`）：region 从 netcheck 消失、回落官方 DERP
  - 免费 FRP 多层中转时放宽 derper 的 tcp 超时（默认 15s 拥塞掐线）
  - tailnet ACL 只能网页或 API key 改（PATCH `/api/v2/tailnet/-/acl`，带 `If-Match: etag`）

检索脚本四份并存：改一份联动改全部
- Date: 2026-09-21
- Instructions:
  - `cp` 整份覆盖其余几份，别逐行手改
  - 不抽公共库：别人只装一个 skill 也能跑

技能文档禁写死源仓路径
- Date: 2026-09-21
- Instructions:
  - 脚本写 `<技能目录>/scripts/xxx.py`（本 SKILL.md 处），不写宿主名/兜底路径
  - 数据仓默认优先、env 兜底

paseo-todo 空 agent 占位不许显示成错误
- Date: 2026-09-23
- Category: Troubleshooting & Debugging
- Instructions:
  - 新建待办 agents=[{provider:"",model:""}] 是占位，开跑时再选 Provider
  - metaLine 禁止渲染「未配置 Agent」；无 provider 时省略 agent 段
  - 交付前必查：列表文案不得把正常占位报成错误

卷轴/手册按用户点名主题写全册，禁止收窄单点
- Date: 2026-09-23
- Context: 批评写成语音专篇；又纠正须是 Paseo 且标题写明软件名
- Instructions:
  - 按用户原话主题写完整手册，不收窄成单点/避坑专篇
  - 标题写明软件名（如 PaseoPlugin创作手册），禁止只写 Plugin
  - 宿主写错（非用户点名）=整篇作废重写

Paseo 插件仓库布局与命名
- Date: 2026-09-23
- Context: 用户定稿目录/id/数据路径约定
- Instructions:
  - 插件放 `paseo-plugins/<名>/`；待办插件目录 `one-todo`、id `one-todo`
  - 数据在 `~/.paseo/plugin-data/<id>/`；改 id 必须迁数据目录
  - 不用把宿主名/类型词粘进 id（如 `paseo-*-plugin`）

Lore Bloom 摄入工作流：raw 根即收件箱
- Date: 2026-09-25
- Instructions:
  - 资料直接丢 raw/ 根目录，不分类不建子目录；ingest 只扫根目录
  - 摄入后原文移到 raw/ingested/YYYY-MM/，内容不改不删，移动即标记
  - 知识层 lorebloom/ 由 AI 自动归类，新领域先问用户
