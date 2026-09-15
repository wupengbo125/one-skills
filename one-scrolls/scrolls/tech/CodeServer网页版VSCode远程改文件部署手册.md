# CodeServer 网页版 VSCode 远程改文件部署手册

手机 / 任意浏览器访问并修改 Linux 本机文件（写代码、改配置、改笔记），走 Tailscale 私有网 + HTTPS，不暴露公网。

## 1. 对应本地资产

- **程序**：`~/.local/lib/code-server/`（`~/.local/bin/code-server` 为软链）
- **配置**：`~/.config/code-server/config.yaml`
- **服务**：`~/.config/systemd/user/code-server.service`（user 级，开机自启）
- **数据**：`~/.local/share/code-server/`
- **对外地址**：`https://<节点名>.<tailnet>.ts.net:8765`（MagicDNS 域名，见 `tailscale status --json` 的 `Self.DNSName`）

## 2. 选型结论（2026-09）

| 方案 | 场景 | 备注 |
|---|---|---|
| **code-server** | 写代码、多文件工程、带终端 | 本卷轴方案；~220MB，内存占用约 300MB+ |
| copyparty | 浏览 / 上传下载 / 改文本文件 / 搜 / 看片 | Python 单文件零依赖，`python3 copyparty.py` 即跑，手机 UI 更友好 |
| Filestash | 聚合本地 + SFTP + S3 + 网盘 | 需要统一多后端入口时选它 |
| ~~File Browser~~ | — | **仓库 2026-08-31 已归档（read-only），新装不要用它** |

判断标准：只想看/传/小改 → copyparty；要写代码 → code-server。

## 3. 安装（不走 `curl | sh`）

```bash
V=4.137.0   # 注意：tag 是 v4.137.0，但资产文件名无 v 前缀
curl -fSL -o /tmp/cs.tgz "https://github.com/coder/code-server/releases/download/v${V}/code-server-${V}-linux-amd64.tar.gz"
mkdir -p ~/.local/lib && tar -xzf /tmp/cs.tgz -C ~/.local/lib
mv ~/.local/lib/code-server-${V}-linux-amd64 ~/.local/lib/code-server
ln -sf ~/.local/lib/code-server/bin/code-server ~/.local/bin/code-server
code-server --version
```

**避坑**：直接拼 `code-server-v${V}-linux-amd64.tar.gz` 会 404。先查资产真实名：
`curl -sSL https://api.github.com/repos/coder/code-server/releases/latest | grep '"name"'`

## 4. 配置：密码只用 common_password

`~/.config/code-server/config.yaml` —— **不要写明文密码**：

```yaml
bind-addr: 127.0.0.1:8765
auth: password
cert: false
```

code-server 的 `--password` 官方只接受 **`$PASSWORD` 环境变量** 或配置文件。取通用密码的方式见第 5 节。

## 5. systemd user 服务（关键坑：user session 没有 bashrc 变量）

`~/.config/systemd/user/code-server.service`：

```ini
[Unit]
Description=code-server (VS Code in browser)
After=network-online.target

[Service]
Type=simple
WorkingDirectory=%h
ExecStart=/bin/bash -c 'set -a; . %h/onespace/github/dotfiles/rc/bash/exports; export PASSWORD="$common_password"; exec %h/.local/lib/code-server/bin/code-server --config %h/.config/code-server/config.yaml'
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

**避坑**：
- systemd **user** 服务的环境里没有 `~/.bashrc` 的变量，`common_password` 取不到 → 必须在 ExecStart 里显式 `. .../rc/bash/exports`。
- 全站密码统一走 `common_password`（同 `ompw`、`mihomo.py` 的做法），不给单服务随机生成密码。

```bash
systemctl --user daemon-reload && systemctl --user enable --now code-server
```

## 6. 暴露：Tailscale Serve（HTTPS）

```bash
tailscale serve --https 8765 --bg 8765
tailscale serve status      # 确认 proxy 到 http://127.0.0.1:8765
# 关闭：tailscale serve --https=8765 off
```

服务本身只监听 `127.0.0.1`，HTTPS 与证书由 Tailscale 提供，**仅 tailnet 内可见**，无需公网 IP。

## 7. 验证手法

```bash
# 本地
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8765/login          # 200
PW=$(bash -c 'set -a; . ~/onespace/github/dotfiles/rc/bash/exports; echo "$common_password"')
curl -s -o /dev/null -w "%{http_code}\n" -d "password=$PW" http://127.0.0.1:8765/login   # 302 = 密码正确
curl -s -o /dev/null -w "%{http_code}\n" -d "password=wrong"  http://127.0.0.1:8765/login # 200 = 拒绝
```

**避坑**：在本机 `curl https://<域名>.ts.net:8765` 常报 `Could not resolve host`，这是本机 DNS 没走 MagicDNS，**不代表服务有问题**；手机装了 Tailscale App 会自动解析，正常访问。

## 8. 手机使用要点

- Safari / Chrome 打开域名，「添加到主屏幕」≈ 原生 App。
- 装中文插件：`Ctrl+Shift+X` 搜 `Chinese (Simplified)`。
- 小屏写代码建议横屏；纯查看 / 改几行足够。
- 端口 8765 需带在 URL 上（想免端口可改 `tailscale serve --https 443 --bg 8765`）。

## 9. 常用运维

```bash
systemctl --user status|restart|stop code-server
journalctl --user -u code-server -f      # 看日志
```
