---
name: one-wsl-chrome
description: |
  Use this skill whenever you need to control or automate a browser in this WSL environment.
  Since WSL does not have a native Linux Chrome installation, this skill provides a way to 
  launch and connect to the Windows Chrome browser from WSL using Playwright CDP (Chrome DevTools Protocol).
  
  Trigger this skill when:
  - You need to automate a web browser (login, click, fill forms, scrape pages, take screenshots)
  - You need to extract cookies from a logged-in Chrome session (e.g. to bypass bot detection for yt-dlp)
  - A task requires browser automation and `playwright install` would fail because there is no GUI/Chromium in WSL
  - The user says "open Chrome", "use the browser", "extract cookies", "log into the website automatically"
  - Any tool or script reports that Chrome/browser is not available in WSL
---

# WSL Chrome Automation Skill

This skill allows you to control **Windows Chrome** from WSL Python scripts, without needing a native Linux browser installation.

## Key Principle

> **WSL has no Chrome.** When any browser automation is needed in this environment, use `ChromePool` to launch and connect to the Windows Chrome via CDP (Chrome DevTools Protocol) over `127.0.0.1`.

## Location

The core script is located at:
```
scripts/chrome_pool.py
```

## Setup

Install `playwright` Python package in the target virtualenv:
```bash
pip install playwright
# No need to run 'playwright install' – we connect to the existing Windows Chrome
```

## Usage

```python
import asyncio
import sys
from scripts.chrome_pool import ChromePool

async def main():
    pool = ChromePool()
    browser, context = await pool.start(index=1)
    
    page = await context.new_page()
    await page.goto("https://example.com")
    print(await page.title())
    
    await pool.cleanup()

asyncio.run(main())
```

## Common Use Cases

### 1. Extract Cookies for yt-dlp (bypass YouTube/TikTok bot detection)
```python
async def get_cookies_for_ytdlp(url):
    pool = ChromePool()
    browser, context = await pool.start(index=1)
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto(url)
    input("Complete any login/captcha in Chrome, then press Enter...")
    cookies = await context.cookies()
    # Write to Netscape format for yt-dlp --cookies flag
    with open("cookies.txt", "w") as f:
        f.write("# Netscape HTTP Cookie File\n\n")
        for c in cookies:
            domain = c['domain']
            flag = "TRUE" if domain.startswith('.') else "FALSE"
            f.write(f"{domain}\t{flag}\t{c['path']}\tTRUE\t9999999999\t{c['name']}\t{c['value']}\n")
    await pool.cleanup()
    return "cookies.txt"
```

### 2. Automate Login to a Website
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

### 3. Multiple Isolated Chrome Instances
```python
# Start 3 separate Chrome windows with independent profiles and ports
pool = ChromePool(win_profile_base=r"C:\tmp\profiles", base_debug_port=9222)
browser1, ctx1 = await pool.start(index=1)  # port 9222
browser2, ctx2 = await pool.start(index=2)  # port 9223
browser3, ctx3 = await pool.start(index=3)  # port 9224
```

## How It Works

1. Calls `powershell.exe` from WSL to launch `chrome.exe` with `--remote-debugging-port=<port>` and an isolated `--user-data-dir`.
2. Polls `127.0.0.1:<port>` until the CDP endpoint is ready.
3. Fetches the WebSocket debugger URL from `http://127.0.0.1:<port>/json/version`.
4. Connects Playwright via `connect_over_cdp(ws_url)`.
5. Returns a `(browser, context)` tuple for full Playwright async API access.

## Notes

- `cleanup()` closes the Playwright connection but does **not** kill the Chrome process — the window stays open for the user.
- Each `index` gets its own isolated Windows Chrome profile under `C:\tmp\chrome_profiles\profile_<index>`.
- Requires Windows Chrome to be installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
