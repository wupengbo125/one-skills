# sync-tool

电脑和 iPhone 的双向文件同步工具。iPhone 使用系统「文件」App 通过 WebDAV 访问，不安装 App。

## 安装

```bash
cd sync-tool
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## 启动电脑端服务

```bash
python scripts/hub.py --root ./vault --host 0.0.0.0 --port 8080 --user sync --password changeme
```

## 启动本地文件夹同步

```bash
python scripts/sync.py --local ./local --url http://电脑IP:8080 --user sync --password changeme
```

## iPhone 连接

1. 打开「文件」App
2. 浏览 → 右上角连接服务器
3. 输入：`http://电脑IP:8080`
4. 输入用户名和密码

## 同步规则

- 一端新增/修改：立即同步到另一端
- 一端删除：同步删除
- 两端同时修改同一文件且内容不同：不同步覆盖，输出 `CONFLICT 文件路径`
- 冲突记录：本地文件夹 `.sync-tool/conflicts.log`
- 不保存历史版本，不恢复已删除文件
- `.sync-tool/state.json` 只保存当前快照，用来判断冲突
