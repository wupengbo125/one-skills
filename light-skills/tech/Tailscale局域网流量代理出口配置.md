# Tailscale 局域网流量代理出口配置

## 1. 对应本地资产
* **代理配置源**：`$github_dir/dotfiles/tools/mihomo/config.yaml`
* **运行时配置**：`~/bin/mihomo/config.yaml`
* **Tailscale 虚拟网络**：`100.64.0.0/10`，本机 IP `100.102.228.46`

## 2. 核心配置避坑要点
1. **允许局域网流量转发**：
   ```yaml
   allow-lan: true
   ```
2. **禁止在 tun 中排除 Tailscale 接口**：
   - 严禁配置 `exclude-interface: [tailscale0]`，否则手机或异地客户端挂载 Tailscale Exit Node 时无法正常通过代理上网。
3. **直连白名单必须保留**：
   - 在规则集（`rules`）中必须保留以下直连声明，确保 Tailscale 节点打洞与直连互通：
     ```yaml
     - IP-CIDR,100.64.0.0/10,DIRECT
     - DST-PORT,41641,DIRECT
     - DOMAIN-SUFFIX,ts.net,DIRECT
     ```
