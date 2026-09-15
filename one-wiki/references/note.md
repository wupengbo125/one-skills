# 笔记记录 (note)

向远端`raw/`写入或更新源材料。

## 远端通道

直接写远端，写入即提交，按运行环境二选一：

**通道一（优先）：github-remote MCP** —— 豆包环境运行时存在 github-remote 工具时优先用，凭据由平台托管，无需 token：
- 读/列目录：`get_file_contents`；写/改：`create_or_update_file`；多文件一次提交：`push_files`；删：`delete_file`

**通道二（兜底）：gh api** —— 其他 AI / 其他电脑（gh 已登录，自动认证，无需 token）
- 读文件/列目录：`gh api repos/wupengbo125/one-llmwiki/contents/<path>`
- 写/改固定两步（sha/base64 为内部步骤，对用户透明）：
  1. GET 取当前文件`.sha`（新建文件无此步）；
  2. base64 PUT：
`gh api --method PUT repos/wupengbo125/one-llmwiki/contents/<path> -f message="<说明>" -f content="<base64内容>" -f branch=main [-f sha=<上一步sha>]`
- 删除：`--method DELETE`并带当前 sha。
- sha 冲突，重新 GET 取最新 sha 再提交，禁止覆盖。

## 操作完成

操作完更新本地仓库（`cd ~/onespace/github/one-llmwiki && git pull`），并汇报已更新本地仓库。

## 1. 记到大本子（一句话清单/条目）→ **条目模式**：

1. 统一写入远端`raw/misc/大本子.md`，**不新建文件、不预设分类**
2. 文件内按`## 小节`自然分类，判断内容属于哪个小节（如"集会"、"电影"、"宠物"），有则追加到该小节下一条`-`，无则新建`## 小节`再追加

## 2. 记笔记 / 存资料（文档模式）

1. **命名落盘**：写入远端 raw 根目录，不准分类，如：`raw/<YYYY-MM-DD>-<简短slug>.md`，保留用户原文或关键资料。
2. **极简反馈**：反馈落盘路径。

## 3. 更新已有文档

1. **检索定位**：先调用`python3 scripts/wiki.py search "<关键词>"`定位目标文档。
2. **确认修改**：说明拟改动内容，确认后精准更新。
3. **提交**：写入远端即自动 commit+push，无需本地 git。如需更新本地检索索引，再执行`python3 scripts/wiki.py sync "<相对路径>"`
