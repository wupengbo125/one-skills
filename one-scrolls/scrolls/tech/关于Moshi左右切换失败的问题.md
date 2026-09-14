# 关于 Moshi 左右切换失败的问题

> 症状：iPhone 上 Moshi 连本机、进入 Herdr 后左右滑动，弹「无法切换窗口 / Moshi 无法确认复用器状态，请检查 app hook」。
> 排查与结案：2026-09-14。

## 1. 机制（先理解这个才能排错）

Moshi 的滑动手势**不是直接发按键**，而是三步：

1. 先通过本机后端 `moshi-hook` 确认"当前在哪个复用器、什么状态"（`moshi-hook context` / 网关 `/v1/session/options`）；
2. 确认成功后才发 `Ctrl-B + 序号` 去切；
3. **确认失败 → 就弹上面那句**（报错里"检查 app hook"指的就是 `moshi-hook`）。

## 2. 根因（已修复）

`dotfiles/rc/bash/bashrc.personal` 末尾曾有一行：

```sh
printf '\e[?1000l\e[?1002l\e[?1003l\e[?1006l'   # 关闭鼠标上报模式
```

它每次交互式 shell 启动都输出，且**紧贴** shell 启动后第一条命令的输出、中间零分隔符。Moshi 在会话开启时读 pty 抓 `$SSH_CONNECTION`，于是把这串 ESC 粘到了客户端 IP 前面：

```
捕获值: \x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l100.113.223.11 51453 100.77.177.59 2222
→ moshi-hook: no process with SSH_CONNECTION=<脏值>
```

脏值缓存在 App 内、跟着该会话走，**不会自愈** → 该会话内每次滑动都失败（日志里每秒重试一次）。这也是"经常而不是总是"的原因：抓取与实际输出存在**时序竞态**。

**修复**：删掉那行 printf。需要重置鼠标模式改为按需调用 `mouseoff()`（定义在 `dotfiles/rc/bash/functions`）。
**严禁把那行 printf 加回 bashrc。**

## 3. 定位手法（可复用）

| 目的 | 操作 |
| :--- | :--- |
| 开详细日志 | 给 `moshi-hook.service` 加 drop-in：`ExecStart=` + `ExecStart=/home/ctyun/.local/bin/moshi-hook serve -v`，再 `daemon-reload && restart`（**排查完必须撤掉**） |
| 看日志 | `~/.local/state/moshi/hook.log`；关键事件 `gateway events: context request failed/resolved`、字段 `kind=`、`sshConnection=` |
| 手动复现状态确认 | `moshi-hook context --ssh-connection "<clientip> <clientport> <serverip> <serverport>"`（脏值会报 `no process with SSH_CONNECTION=`；不在复用器里会返回 `kind=shell`） |
| 复现转义污染 | `env -i HOME=$HOME TERM=xterm script -qec 'bash -ic "echo CAP=X"' /dev/null \| cat -v` |

## 4. 查清的关键事实

1. **手势映射**：单指左右滑 = 切 **tab**（≈tmux 的 window）；双指上下滑 = 切 **workspace**（≈tmux 的 session）；herdr 的 **session** 是独立后台服务（`herdr session list`），单指滑动**永远不会**切 session。
2. **"没有可切换目标"是另一个错**：状态能确认、键也发出去了，但只有 1 个 tab 时焦点原地不动，App 会换成另一句更具体的报错。日志指纹：短时间内连续多次 `tab.focus` 指向**同一个** tab。
3. **排错走过的无效方向**（都已被实测排除，别再走）：怀疑 Tailscale SSH 抢占 22 端口 → Tailscale SSH 下状态解析实测是成功的；怀疑 herdr 版本 / 多客户端争用 → 0.8.2 升到 0.9.0 后问题依旧。真凶是转义污染，**与端口、Tailscale 全无关**。

## 5. 本机连接现状（2026-09-14 起双端口并存）

| 端口 | 谁在服务 | 鉴权 | 用途 |
| :--- | :--- | :--- | :--- |
| 22（tailnet） | tailscaled | Tailscale 身份 | 原生 `tailscale ssh` / `ssh ctyun@one` |
| 2222（仅 tailnet IP） | 系统 sshd | 密钥 | Moshi 走这条 |

- 配 2222 的原因：Tailscale SSH 只接管 tailnet 的 22 端口（官方限制，不可改端口），Moshi 需要系统 sshd 这条官方支持路径，同时保留原生鉴权。
- **避坑：2222 在本机有两个含义** —— Tailscale IP:2222 是本机 sshd；公网:2222 是 frpc 映射到本机 22（见 FRP 卷轴）。别混淆。
- 副作用及修复：普通 sshd 不像 Tailscale SSH 会注入 LANG，`~/.profile` 已补 `LANG=zh_CN.UTF-8` 默认值，否则中文乱码。

## 6. 相关路径

- moshi-hook 日志：`~/.local/state/moshi/hook.log`
- herdr 事件日志：`~/.config/herdr/herdr-server.log`（事件 `tab.focus` / `workspace.create`；**UTC 时间，比本机 CST 慢 8 小时**）
- 会话实时状态：`herdr api snapshot`、`herdr session list --json`
- 本次修复涉及：`dotfiles/rc/bash/bashrc.personal`、`dotfiles/rc/bash/functions`
