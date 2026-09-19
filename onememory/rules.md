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
  - tailnet ACL 无法用 CLI 修改（`tailscale policy` 子命令不存在），只能改网页或用 API key（用户的在 `~/onespace/github/dotfiles/rc/bash/exports` 的 `$tailscale_api_key`）PATCH `/api/v2/tailnet/-/acl`，返回体是 HuJSON，需带 `If-Match: etag`
