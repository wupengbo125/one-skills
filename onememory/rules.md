# Project Rules Memory

（本文件记录行为规则与项目知识，上限 150 行，超限触发同类合并。）

## Entries

宪法与规则只做用户全局分发，禁止项目级软链
- Date: 2026-09-14
- Context: 讨论 Qoder 加载不到宪法时，用户否决我"顺手给项目根也链一份"的提议
- Instructions:
  - `one-agents.md`（宪法索引）一律经 `USER_GLOBAL_RULES` 分发到各 Agent 工具的用户级记忆文件，不得往任何项目根写 `AGENTS.md` / `CLAUDE.md`，也不得凭空生成 `one-context.md`
  - 每个工具的全局记忆位靠逆向/实测确认（读二进制里的加载器枚举逻辑，不信文档与猜测），确认结论以注释形式写进 `install.sh` 对应数组上方，供下次选型复用
  - 接入新 Agent 工具时只增删 `USER_GLOBAL_RULES` / `USER_GLOBAL_DIRS` 条目，不改分发流程

「移植/改成另一种语言」= 替换，不是并存
- Date: 2026-09-18
- Context: 用户要求把 one-orca-race 的 race.py 改成 shell 脚本，我保留了 race.py 与新脚本并存，被明确斥责（"迁移和复制是两个概念"）
- Instructions:
  - 用户说"移植 / 迁移 / 改成 X"时，必须删除旧实现，仓库里只留一份
  - 不要为了"稳妥"保留旧文件、也不要额外复制出多份入口
  - 旧实现若已入库，删除即可，需要时 `git checkout` 可恢复

用户给过的事实（端口/隧道名/配置）禁止臆造，以用户所给为准
- Date: 2026-09-19
- Context: 配 DERP-over-FRP 时用户已在 frpc.toml 与面板里建好 `tailscale_derp:8443` / `tailscale_stun:3478`，我却自编了 `one_derp:10002`，被斥"狗东西""蠢货"
- Instructions:
  - 配置文件、隧道名、端口、路径等已由用户提供时，先读用户的文件原样沿用，再谈方案；不要先凭印象写一套"看起来合理"的
  - 输出方案前先确认事实来源（读文件/命令输出），禁止自信地把猜测值写给用户当可执行步骤

Orca worktree 落点统一到 /home/ctyun/onespace/worktree
- Date: 2026-09-19
- Context: 用户要求把 Orca 建的 worktree 从默认 ~/orca/workspaces 挪到 ~/onespace/worktree
- Category: Environment Configuration
- Instructions:
  - 落点按 project setup 逐仓库配置：`orca project setup-update --setup <setup-id> --worktree-base-path /home/ctyun/onespace/worktree`（setup id 查 `orca project setups --json`）；之后该仓库新 worktree 落在 `<base>/<repo>/<name>`
  - `orca worktree create` 本身没有指定路径的参数，只能靠 setup 上的 worktreeBasePath
  - 本机 11 个仓库已全部设置；改完偶发一次 "runtime closed the connection"，重试即可

Orca CLI 集成坑点（worktree / terminal / agent id）
- Date: 2026-09-19
- Context: Discovered by Agent while 排查 one-orca-race 里 codebuddy 建不出终端的问题
- Category: Troubleshooting & Debugging
- Instructions:
  - Orca 完全不支持 CodeBuddy：`--agent codebuddy` → `Unknown TUI agent`，Orca 包里搜 `codebuddy` 零命中。CodeBuddy 只能走「建 worktree + 终端里跑 `codebuddy` 命令 + `terminal send` 发 prompt」这条路
  - `prime-agent` 是 2026-08 出的**另一个独立 Agent 产品**，与 CodeBuddy Code 无关（Orca 的 agent 列表里有它、本机 CodeBuddy 装在 `prime-agent-node/` 目录下，都是巧合，不能据此推断等价）。**禁止**把 `prime-agent` 软链或归一化指向 `codebuddy`，那等于让 Orca 拉起错误的产品
  - Orca 建的分支带命名空间前缀（`refs/heads/<user>/<name>`），所以 `branch:<name>` 选择器匹配不到，必须用 `worktree create --json` 返回的 `result.worktree.id` 走 `id:` 选择器（`name:` 也可）
  - `orca terminal wait --for tui-idle` 会在 TUI 还在启动时就返回，不能在它后面接按键；要判断 codebuddy/claude 的 "Do you trust the files in this folder?" 弹窗只能轮询 `orca terminal read` 的文本
  - 脚本里开了 `set -euo pipefail` 时，`cmd | grep -q` 会因 grep 提前关管道让 pipefail 判为非 0，永远匹配不上；改用 `out="$(cmd || true)"` + `[[ "$out" == *x* ]]`
  - 查 Orca 支持什么：`orca agent-context --json`（234 条命令 schema）；`orca terminal read --screen` 才看得到 TUI 实际渲染，默认 read 是时序流

本机 Tailscale 自定义 DERP（经公共 FRP 中继）运维要点
- Date: 2026-09-19
- Context: Discovered by Agent while setting up a self-hosted DERP relay on host `one` behind the public FRP service at 192.140.188.104
- Category: Environment Configuration
- Instructions:
  - derper 需自行编译：`GOPROXY=https://goproxy.cn go install tailscale.com/cmd/derper@latest`（本机 Go 装在 `/usr/local/go`，ghcr.io/derper 镜像拉不下，daemon 走 IPv6 被 reset）
  - 新版 derper 非 root 运行时必须显式给 `-c <path>`（否则报 `-c <config path> not specified`），用 systemd `DynamicUser=yes + StateDirectory=derper` 配 `-c=/var/lib/derper/derper.key`
  - 自签证书免装 CA：derper 启动日志会打印 `CertName: sha256-raw:<指纹>`，把该值写进 derpMap 的 `CertName` 即为证书 pinning，iOS/Android 也无需安装根证书
  - 该 FRP 是面板型：隧道必须先在其网页面板创建且名字与类型匹配，frpc.toml 里的 remotePort 无效，写错会报 `proxy_not_found`
  - 「STUNPort: -1 关 STUN」会让该 region 从 `tailscale netcheck` 候选列表消失、回落官方 DERP，别关；代价是自报公网 endpoint 变成 127.0.0.1（经 FRP 后源地址丢失），对称 NAT 场景无害
  - 链路多绕一层免费 FRP 时，derper 默认 `-tcp-user-timeout=15s`（官方刻意设短）会在隧道拥塞时主动掐连接，症状是 ping 有回包但 SSH 连不上/中途断；这类中继要显式放宽 `-tcp-user-timeout=60s -tcp-write-timeout=60s`
  - tailnet ACL 无法用 CLI 修改（`tailscale policy` 子命令不存在），只能改网页或用 API key（用户的在 `~/onespace/github/dotfiles/rc/bash/exports` 的 `$tailscale_api_key`）PATCH `/api/v2/tailnet/-/acl`，返回体是 HuJSON，需带 `If-Match: etag`

检索脚本四份并存：改一份联动改全部
- Date: 2026-09-21
- Instructions:
  - `cp` 整份覆盖其余几份，别逐行手改
  - 不抽公共库：为解耦，别人只装一个 skill 也要能跑

技能文档禁写死源仓路径
- Date: 2026-09-21
- Instructions:
  - 脚本写 `<技能目录>/scripts/xxx.py`= 本 SKILL.md 处
  - 不写宿主名/兜底路径；数据仓默认优先、env 兜底
