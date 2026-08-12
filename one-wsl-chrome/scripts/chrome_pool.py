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
