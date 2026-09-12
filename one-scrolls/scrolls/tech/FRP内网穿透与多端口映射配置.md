# FRP 内网穿透与多端口映射配置

## 1. 对应本地资产
* **客户端配置文件**：`/usr/local/frp/frpc.toml`
* **命令行快捷别名**：`vfrp`
* **系统服务单元**：`frpc.service`

## 2. 映射端口与服务定义
| 服务名 | 本地端口 | 公网穿透端口 | 说明 |
| :--- | :--- | :--- | :--- |
| `ssh` | `22` | `2222` | 远程终端维护 |
| `omniroute` | `20128` | `20128` | 局域网/公网 AI API 网关 |
| `lets-shape` | `6689` | `6689` | 个人待办 Web OS 底座 |

## 3. 运维实操与避坑
* **修改配置**：编辑 `/usr/local/frp/frpc.toml`
* **重启生效**：`sudo systemctl restart frpc`
* **状态检查**：`sudo systemctl status frpc`
* **避坑要点**：若公网无法访问，优先检查云服务器安全组对应端口是否开放，以及本机的 `ufw` 防火墙规则。
