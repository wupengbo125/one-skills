# WSL 环境下控制 Windows Chrome 自动化指南

在 WSL 环境下通过 Python 脚本控制 **Windows 宿主 Chrome**，无需在 Linux 内安装原生浏览器。

## 核心原理

> **WSL 内无需安装 Chrome**。当需要浏览器自动化时，通过 `ChromePool` 调用 PowerShell 在 Windows 侧以 `--remote-debugging-port` 启动 Chrome，再利用 Playwright 通过 CDP (Chrome DevTools Protocol) 跨 `127.0.0.1` 连接控制。

## 环境准备

在 Python 虚拟环境中安装 `playwright`（无需执行 `playwright install` 浏览器二进制）：
```bash
pip install playwright
```

## 基础使用示例

```python
import asyncio
from chrome_pool import ChromePool

async def main():
    pool = ChromePool()
    browser, context = await pool.start(index=1)
    
    page = await context.new_page()
    await page.goto("https://example.com")
    print(await page.title())
    
    await pool.cleanup()

asyncio.run(main())
```

## 典型场景

### 1. 提取 Cookies 供 yt-dlp 使用（绕过 YouTube/TikTok 人机验证）
```python
async def get_cookies_for_ytdlp(url):
    pool = ChromePool()
    browser, context = await pool.start(index=1)
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto(url)
    input("在打开的 Chrome 中完成登录或验证码，然后回车继续...")
    cookies = await context.cookies()
    # 写入 Netscape 格式供 yt-dlp --cookies 使用
    with open("cookies.txt", "w") as f:
        f.write("# Netscape HTTP Cookie File\n\n")
        for c in cookies:
            domain = c['domain']
            flag = "TRUE" if domain.startswith('.') else "FALSE"
            f.write(f"{domain}\t{flag}\t{c['path']}\tTRUE\t9999999999\t{c['name']}\t{c['value']}\n")
    await pool.cleanup()
    return "cookies.txt"
```

### 2. 自动化登录网站
```python
async def login(username, password):
    pool = ChromePool()
    browser, context = await pool.start(index=1)
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto("https://example.com/login")
    await page.fill('input[name="username"]', username)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await pool.cleanup()
```

### 3. 多实例隔离运行
```python
# 启动 3 个独立 Chrome 窗口，各自拥有独立 Profile 与调试端口
pool = ChromePool(win_profile_base=r"C:\tmp\profiles", base_debug_port=9222)
browser1, ctx1 = await pool.start(index=1)  # port 9222
browser2, ctx2 = await pool.start(index=2)  # port 9223
browser3, ctx3 = await pool.start(index=3)  # port 9224
```

## 工作机制

1. 从 WSL 调用 `powershell.exe` 启动 Windows 下的 `chrome.exe`，带 `--remote-debugging-port=<port>` 和隔离的 `--user-data-dir`。
2. 轮询 `127.0.0.1:<port>` 直至 CDP 端口就绪。
3. 从 `http://127.0.0.1:<port>/json/version` 获取 WebSocket 调试 URL。
4. Playwright 通过 `connect_over_cdp(ws_url)` 建立连接。
5. 返回 `(browser, context)` 元组，获得完整的 Playwright 异步 API 访问能力。

## 注意事项

- `cleanup()` 仅关闭 Playwright CDP 连接，**不会**杀掉 Windows Chrome 进程（保留给人工操作）。
- 每个 `index` 独立使用 `C:\tmp\chrome_profiles\profile_<index>` 用户数据目录。
- 依赖 Windows 默认安装的 Chrome：`C:\Program Files\Google\Chrome\Application\chrome.exe`。

---

## 附录：ChromePool 完整源码 (`chrome_pool.py`)

```python
import asyncio
import subprocess
import socket
import json
import urllib.request

from playwright.async_api import async_playwright, Browser, BrowserContext


class ChromePool:
    """WSL 环境下管理 Windows Chrome 多实例的连接池。

    通过 PowerShell 启动 Windows Chrome（带 --remote-debugging-port），
    再用 Playwright connectOverCDP 连接，实现 WSL Python 控制 Windows Chrome。
    """

    POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
    CHROME_WIN = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

    def __init__(self, win_profile_base: str = r"C:\tmp\chrome_profiles",
                 base_debug_port: int = 9222):
        self.win_profile_base = win_profile_base
        self.base_debug_port = base_debug_port
        self._pids: list[int] = []          # Chrome 进程 PID（Windows 侧）
        self._pw = None                     # Playwright 实例
        self._browsers: list[Browser] = []
        self._started = False

    async def start(self, index: int) -> tuple[Browser, BrowserContext]:
        """启动第 index 个 Chrome 并返回 (browser, context)。

        index 从 1 开始。每个实例使用独立的 profile 和调试端口。
        """
        if not self._started:
            self._pw = await async_playwright().start()
            self._started = True

        port = self.base_debug_port + index - 1
        win_profile = f"{self.win_profile_base}\\profile_{index}"

        # 确保 profile 目录存在（同步，不创建 async 子进程）
        self._ensure_dir(win_profile)

        # 启动 Chrome（同步，不创建 async 子进程）
        pid = self._launch_chrome(port, win_profile)
        self._pids.append(pid)

        # 等待 CDP 端口就绪
        await self._wait_for_port(port, timeout=15)

        # 获取 WebSocket URL 并连接（Playwright 1.60 用 HTTP URL 会 400，需用 ws://）
        ws_url = await self._get_ws_url(port)
        browser = await self._pw.chromium.connect_over_cdp(ws_url)
        self._browsers.append(browser)

        # connect_over_cdp 的默认 context 即 Chrome 的持久化上下文
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        return browser, context

    async def cleanup(self):
        """断开 Playwright 连接，但不杀 Chrome 进程（留给用户手动关闭）。"""
        for browser in self._browsers:
            try:
                await browser.close()
            except Exception:
                pass
        self._browsers.clear()

        if self._pw:
            try:
                await self._pw.stop()
            except Exception:
                pass
            self._pw = None
            self._started = False

    # ── 内部方法 ──────────────────────────────────────────────

    @staticmethod
    def _ensure_dir(win_path: str):
        """通过 PowerShell 确保 Windows 目录存在。"""
        ps_cmd = f"New-Item -ItemType Directory -Force -Path '{win_path}' | Out-Null"
        subprocess.run(
            [ChromePool.POWERSHELL, "-Command", ps_cmd],
            capture_output=True, timeout=10,
        )

    @staticmethod
    def _launch_chrome(port: int, win_profile_dir: str) -> int:
        """通过 PowerShell 启动 Chrome，返回 PID。"""
        arg1 = f"--remote-debugging-port={port}"
        arg2 = f"--user-data-dir={win_profile_dir}"
        ps_cmd = (
            f"$p = Start-Process -FilePath '{ChromePool.CHROME_WIN}' "
            f"-ArgumentList '{arg1}','{arg2}' -PassThru; "
            f"Write-Output $p.Id"
        )
        result = subprocess.run(
            [ChromePool.POWERSHELL, "-Command", ps_cmd],
            capture_output=True, timeout=15,
        )
        pid_str = result.stdout.decode().strip()
        if not pid_str or not pid_str.isdigit():
            raise RuntimeError(f"Chrome 启动失败，PID 为空。stderr: {result.stderr.decode().strip()}")
        return int(pid_str)

    @staticmethod
    async def _get_ws_url(port: int) -> str:
        """从 CDP HTTP 端点获取 WebSocket debugger URL。"""
        url = f"http://127.0.0.1:{port}/json/version"
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(None, lambda: urllib.request.urlopen(url, timeout=5))
        data = json.loads(resp.read())
        return data["webSocketDebuggerUrl"]

    @staticmethod
    async def _wait_for_port(port: int, timeout: float = 15.0):
        """轮询 TCP 端口直到可用。"""
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            try:
                sock = socket.create_connection(("127.0.0.1", port), timeout=1)
                sock.close()
                return
            except (ConnectionRefusedError, OSError):
                await asyncio.sleep(0.3)
        raise TimeoutError(f"端口 {port} 在 {timeout}s 内未就绪")
```
