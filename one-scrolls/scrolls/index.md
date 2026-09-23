Scroll Index

---

## 🛠️ 1. Technology

- [代理服务节点切换与运维](./tech/代理服务节点切换与运维.md)
  - **核心解决**：Mihomo/Clash 核心进程运维、TUN 模式配置、端口冲突排查与订阅节点故障切换。
- [FRP内网穿透与多端口映射配置](./tech/FRP内网穿透与多端口映射配置.md)
  - **核心解决**：`/usr/local/frp/frpc.toml` 多端口穿透（SSH:2222, AI网关:20128, WebOS:6689）与自启服务运维。
- [Tailscale局域网流量代理出口配置](./tech/Tailscale局域网流量代理出口配置.md)
  - **核心解决**：TUN 模式下允许 LAN、白名单保留及避免 Tailscale 节点断连避坑。
- [自建Tailscale自定义DERP中继经公共FRP暴露](./tech/自建Tailscale自定义DERP中继经公共FRP暴露.md)
  - **核心解决**：对称 NAT 机器上自建 DERP（derper 自编译 + 自签 IP 证书 + `CertName` pinning 免装 CA），借公共 FRP 的 TCP/UDP 隧道暴露，ACL `derpMap` region 900 经 API 增量下发；含面板型 FRP 必须先在网页建隧道、`-c` 必填、别关 STUN、`tcp-user-timeout` 15s 会掐 SSH 等 10 条坑，官方 DERP 175ms 降到 55ms。
- [显卡供电开关与硬件管理](./tech/显卡供电开关与硬件管理.md)
  - **核心解决**：显卡硬件供电策略切换、电源状态监控、风扇转速与发热避坑处理。
- [本地AI网关接入与模型配置](./tech/本地AI网关接入与模型配置.md)
  - **核心解决**：Omniroute 本地聚合网关接口调试、`one-luna` 聚合模型路由、Python 与 Node.js 代码端点配置。
- [NextJS部署Cloudflare手册](./tech/NextJS部署Cloudflare手册.md)
  - **核心解决**：Next.js App Router 项目通过 OpenNext 部署至 Cloudflare Workers，配置 D1/R2 绑定与 GitHub Actions 自动 CI/CD。
- [OpenViking上下文数据库接入指南](./tech/OpenViking上下文数据库接入指南.md)
  - **核心解决**：OpenViking 开源上下文数据库架构说明、本地与服务器部署、各 Agent 集成与分层加载规范。
- [WSL控制Windows宿主Chrome自动化](./tech/WSL控制Windows宿主Chrome自动化.md)
  - **核心解决**：WSL Linux 环境下通过 PowerShell 与 CDP 跨系统拉起并控制 Windows 宿主 Chrome，提取 Cookie 与执行网页自动化。
- [关于Moshi左右切换失败的问题](./tech/关于Moshi左右切换失败的问题.md)
  - **核心解决**：Moshi 滑动需先由 moshi-hook 确认复用器状态；bashrc 里的 printf 转义污染了 App 捕获的 SSH_CONNECTION（报到"无法确认复用器状态"），已删。含状态确认三步骤、手势层级映射（tab/workspace/session）与排错手法。
- [CodeServer网页版VSCode远程改文件部署手册](./tech/CodeServer网页版VSCode远程改文件部署手册.md)
  - **核心解决**：手机/浏览器改 Linux 本机文件的自建方案：code-server 安装避坑（release 资产名无 v 前缀）、密码只用 common_password（systemd user 服务须自行 source exports 注入 $PASSWORD）、只监听 127.0.0.1 由 `tailscale serve --https` 出 HTTPS；附选型对比（File Browser 已归档）与 curl 302/200 验证法；第 10 节给出手机场景正确解——自研 fileweb（文件列表+全屏编辑，零依赖）。**code-server 本体已于 2026-09-15 卸载，fileweb 为现役方案。**
- [PaseoPlugin创作手册](./tech/PaseoPlugin创作手册.md)
  - **核心解决**：从零创建 **Paseo 插件**（非 VS Code）：骨架（`paseo-plugin.json` + 两侧 `contribute` + shared RPC）、zod 双端校验与 `undefined`/`""` patch、数据落 `~/.paseo/plugin-data/<id>/`、RN 表单 StableInput（语音/IME 断字修法）、`paseo plugin reload` 验证闭环与推荐创作顺序。

---

## 🧘 2. Mindset

- [每日感悟与心法提炼指南](./mindset/每日感悟与心法提炼.md)
  - **核心解决**：从 Wiki 概念库均匀抽取概念并结合 Raw 原始语境深度凝练中英双语心法金句（程序自动化执行）。
