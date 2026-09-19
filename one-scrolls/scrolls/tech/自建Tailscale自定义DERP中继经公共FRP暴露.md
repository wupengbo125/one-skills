# 自建 Tailscale 自定义 DERP 中继（经公共 FRP 暴露）

> 首次落地：2026-09-19，宿主 `one`（Ubuntu 22.04）。官方 DERP 最近节点 `lax` 175ms，自建后降到 **55-60ms**，Windows / iPhone 均切到 `relay "frp"`。

## 1. 什么时候需要这个

- 本机是 `MappingVariesByDestIP: true` 的**对称 NAT**，打洞成功率低，设备间长期走官方 DERP
- 官方 DERP 在无国内节点（或绕路），实测 160-230ms
- 手上已有一条**公共 FRP 通道**，且本机到 FRP 服务器延迟很低（本机 25ms）

收益：中继延迟从 175ms → 55ms；打洞成功后自动回 direct，中继只做兜底。

安全性：DERP 只转发 WireGuard 已加密的包，FRP 服务商看不到明文内容。

## 2. 本机资产清单

| 项 | 位置 / 值 |
| --- | --- |
| derper 二进制 | 自编译 `/usr/local/bin/derper`（tailscale.com v1.102.4） |
| Go 工具链 | `/usr/local/go`（1.24.5，aliyun 镜像装的） |
| systemd 服务 | `/etc/systemd/system/derper.service` |
| 证书目录 | `/etc/derper/`（`ca.crt` `192.140.188.104.crt/.key`） |
| derper 私钥 | `/var/lib/derper/derper.key`（DynamicUser 自动创建） |
| derper 监听 | `127.0.0.1:8443` TLS、`127.0.0.1:3478` STUN |
| frpc 配置 | `/home/ctyun/frp/frpc.toml`（隧道 `tailscale_derp` TCP 8443、`tailscale_stun` UDP 3478） |
| FRP 服务端 | `192.140.188.104:7000`，公网入口 `192.140.188.104:8443 / :3478` |
| tailnet | `tail06668e.ts.net`，ACL 里 `derpMap.Regions["900"]` |
| IPv4/IPv6 转发 | `/etc/sysctl.d/99-tailscale.conf` |

## 3. 完整操作步骤

### 3.1 自签证书（SAN 必须是 IP）

公网入口是 `IP:端口`、没有域名、80 端口拿不到 → 无法 ACME；用自签 + 证书 pinning（见 3.5）。

```bash
sudo mkdir -p /etc/derper && cd /etc/derper
sudo openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes -keyout ca.key -out ca.crt \
  -subj "/CN=One DERP CA" -addext "basicConstraints=critical,CA:TRUE"
sudo openssl req -newkey rsa:2048 -nodes -keyout server.key -out s.csr -subj "/CN=192.140.188.104"
printf 'subjectAltName=IP:192.140.188.104\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n' | sudo tee san.ext >/dev/null
sudo openssl x509 -req -in s.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out 192.140.188.104.crt -days 3650 -sha256 -extfile san.ext
sudo cp server.key 192.140.188.104.key && sudo rm -f s.csr server.key san.ext
sudo chmod 644 ca.crt 192.140.188.104.crt && sudo chmod 640 192.140.188.104.key ca.key
sudo chgrp docker 192.140.188.104.key ca.key     # 给 derper 的 SupplementaryGroups 读
```

**证书文件名必须等于 `-hostname` 的值**（`manual` 模式读 `<certdir>/<hostname>.crt|.key`）。

### 3.2 编译 derper

`ghcr.io/yangchuansheng/*` 镜像拉不下（docker daemon 走 IPv6 被 reset，Docker Hub 被墙），直接编译最稳：

```bash
curl -4 -o /tmp/go.tgz https://mirrors.aliyun.com/golang/go1.24.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf /tmp/go.tgz
sudo env PATH=/usr/local/go/bin:/usr/bin:/bin GOBIN=/usr/local/bin \
  GOPROXY=https://goproxy.cn,direct go install tailscale.com/cmd/derper@latest   # 约 2.5 分钟
```

### 3.3 systemd 服务

```ini
[Unit]
Description=Tailscale DERP relay exposed via FRP
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/derper \
  -hostname=192.140.188.104 \
  -certmode=manual \
  -certdir=/etc/derper \
  -a=127.0.0.1:8443 \
  -stun-port=3478 \
  -http-port=-1 \
  -tcp-user-timeout=60s \
  -tcp-write-timeout=60s \
  -c=/var/lib/derper/derper.key
DynamicUser=yes
SupplementaryGroups=docker
StateDirectory=derper
Restart=always
RestartSec=3
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

`-certmode=manual` 时非 443 端口也走 HTTPS；`-http-port=-1` 关掉 80（ACME 用不上）。

### 3.4 frpc 追加两条代理

```toml
[[proxies]]
name = "tailscale_stun"
type = "udp"
localIP = "127.0.0.1"
localPort = 3478
remotePort = 3478

[[proxies]]
name = "tailscale_derp"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8443
remotePort = 8443
```

### 3.5 tailnet ACL 加 derpMap（region 900）

启动 derper 后看日志，它会**直接打印证书指纹**，抄进 `CertName`：

```
journalctl -u derper -n 10
  {"Name":"custom","RegionID":900,"HostName":"192.140.188.104",
   "CertName":"sha256-raw:05b614b1ba99ac360fbf8bbafc54b8dffd19cb1701ec438d1a8def1fa0850e96"}
```

```json
"derpMap": { "Regions": { "900": {
  "RegionID": 900, "RegionCode": "frp", "RegionName": "FRP Relay",
  "Nodes": [{
    "Name": "custom", "RegionID": 900,
    "HostName": "192.140.188.104", "IPv4": "192.140.188.104",
    "DERPPort": 8443, "STUNPort": 3478,
    "CertName": "sha256-raw:05b614b1ba99ac..."
  }] } } }
```

`CertName` 是证书 pinning —— **所有平台（含 iOS/Android）都不用安装自签 CA**。

### 3.6 修改 ACL 的正确姿势（CLI 不支持）

`tailscale policy` 子命令不存在；只能网页或 API。API 做法：

```bash
export TS_API_KEY="$(grep tailscale_api_key ~/onespace/github/dotfiles/rc/bash/exports | cut -d'"' -f2)"
curl -sS -u "$TS_API_KEY:" -D - -o /tmp/acl.cur.json \
  https://api.tailscale.com/api/v2/tailnet/-/acl        # 从响应头取 ETag
# 改 /tmp/acl.cur.json（返回体是 HuJSON，带注释，别用 json 库解析）
curl -sS -X POST -u "$TS_API_KEY:" -H "Content-Type: application/hujson" \
  -H "If-Match: <etag>" --data-binary @/tmp/acl.cur.json \
  https://api.tailscale.com/api/v2/tailnet/-/acl
```

- `tailnet` 位置填 `-`（表示 key 所属 tailnet）
- 必须带 `If-Match: <etag>`，否则并发覆盖别人的改动
- 已有 `derpMap` 时只把 `"900"` 合并进现有 `Regions`，**不要整段覆盖**

### 3.7 验证

```bash
tailscale netcheck                       # Nearest DERP: FRP Relay / frp ≈ 59ms
tailscale status                         # 设备行出现 relay "frp"
timeout 15 curl -sik --http1.1 -H "Upgrade: derp" -H "Connection: Upgrade" \
  https://192.140.188.104:8443/derp      # 期望 101 Switching Protocols + Derp-Version: 2
```

## 4. 避坑清单（按踩坑顺序）

1. **面板型 FRP 必须先建隧道**：`frpc.toml` 里的 `remotePort` 无效，名字和类型要和网页面板一致，否则报 `proxy_not_found`。隧道名/端口**以面板为准，不要自己编**。
2. **derper 非 root 运行必须给 `-c <path>`**，否则直接 `log.Fatalf: -c <config path> not specified`。配 `StateDirectory=derper` 让它自动建目录。
3. **不要加 `-verify-clients`**：流量经 FRP 后源地址全变成 `127.0.0.1`，客户端验证必失败。
4. **不要关 STUN**：试过 `STUNPort: -1`，结果该 region 从 `tailscale netcheck` 候选里消失、回落官方 `sfo`。保留 3478。
5. **经 FRP 的 STUN 会误报本机公网 endpoint 为 `127.0.0.1`**：无害（对称 NAT 本来打不了洞），别去修它。
6. **`tcp-user-timeout` 默认 15s 会掐连接**：链路多绕一层免费 FRP，拥塞时 derper 主动断连，症状是「ping 有回包但 SSH 连不上/中途断」。已放宽到 60s。
7. **frpc.toml 的 `[[proxies]]` 头别漏**：漏了会把下一个 `name` 塞进上一张表，TOML 解析失败，frpc 起不来。改完必跑 `./frpc verify -c ./frpc.toml`。
8. **别用 `pkill -f "frpc -c ..."` 重启**：模式串会匹配到自己的 bash 命令行，把自己 SIGTERM 掉。用 `kill $(pgrep -x frpc)`，本机有 systemd user 守护会自动拉起。
9. **免费 FRP 可能限速**：大流量前先测速；带宽不够就换有独立公网 IP 的 VPS 装 derper（那时可加 `--verify-clients`）。
10. **API key 别写进文档**：从 dotfiles 的 `$tailscale_api_key` 取。

## 5. 排障速查

| 现象 | 排查 |
| --- | --- |
| netcheck 里没有 `frp` | 查 `STUNPort` 是否被设成 -1；查 ACL 是否真的下发（`Regions.900`）；`journalctl -u derper` |
| 有 `frp` 但设备仍走旧 relay | 客户端需重连（手机关开一次 Tailscale） |
| ping 通但 SSH/应用连不上 | 查 derper 超时参数（坑 6）；测各包大小 `tailscale ping --size 1300 <peer>` 排除 MTU |
| derper 起不来 | `journalctl -u derper`：缺 `-c`？证书文件名与 `-hostname` 不一致？8443 被占？ |
| 隧道 `proxy_not_found` | 面板里建对应名字+类型的隧道 |
| DERP 兜底时吞吐低 | 免费 FRP 限速，考虑换 VPS |

## 6. 相关告警（无关 DERP 但要懂）

- `Subnet routing is enabled, but IP forwarding is disabled`：本机 advertise 了 `0.0.0.0/0` + `::/0`（exit node），需 `net.ipv4.ip_forward=1` **且** `net.ipv6.conf.all.forwarding=1`，已写进 `/etc/sysctl.d/99-tailscale.conf`。
- `Tailscale can't reach the configured DNS servers`：控制面下发的上游 DNS（`CorpDNS: true`）不可达；MagicDNS 实测正常（`getent hosts <主机名>` 能解析），不影响设备互访与上网。
