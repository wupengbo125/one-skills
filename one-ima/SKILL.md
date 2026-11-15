---
name: one-ima
display_name: "IMA笔记"
description: |
  个人笔记与资料库的唯一入口，全部内容存进 IMA（腾讯 ima.qq.com）。笔记走 IMA 笔记接口，文件、网页、PDF 走 IMA 知识库接口。触发场景：记笔记、记一下、记到大本子、记到某本书的读书笔记、新建笔记、追加到某篇笔记、查我的笔记、搜笔记、存资料、把文件/网页存进知识库、在知识库里搜内容。
  本地不落文件、不建 git 仓库、不做索引——落盘即 IMA，不做任何中间层。
---

# IMA笔记

## 依赖

接口层由 `ima-skill` 提供（本技能不实现 HTTP、不管理凭证）。执行前定位其目录：

```bash
IMA_DIR=""
for d in ../ima-skill "$HOME/.doubao/agent_mode/workspace/.user_skills/ima-skill" /runtime/user_skills/ima-skill "$HOME/.doubao/agent_mode/workspace/.skills/ima-skill"; do
  [ -f "$d/ima_api.cjs" ] && IMA_DIR="$d" && break
done
[ -n "$IMA_DIR" ] || echo "未找到 ima-skill，无法继续"
```

调用方式：

```bash
node "$IMA_DIR/ima_api.cjs" "<api_path>" '<json_body>'
```

- stdout 返回业务 JSON：`code=0` 成功，`code≠0` 直接把 `msg` 给用户并停止
- 非零退出 = 程序错误（stderr 结构化 JSON，`-100` 程序错误 / `-200` 需更新 skill）
- 写入前必读对应模块的规则：笔记读 `$IMA_DIR/notes/SKILL.md`，知识库读 `$IMA_DIR/knowledge-base/SKILL.md`

## 意图分流

只读命中的那一个 reference，再执行：

| 用户说的 | 操作 | 读取 |
| :--- | :--- | :--- |
| 「记一下」「记到大本子」一句话、清单、灵感 | 追加到《大本子》 | `references/note.md` |
| 「记到《书名》」读书笔记 | 追加到《书名》同名笔记 | `references/note.md` |
| 「记笔记」「存这篇」「把这段话存下来」整篇内容 | 新建笔记 | `references/note.md` |
| 「把文件/PDF/这篇网页存进知识库」「收藏这个链接」 | 入 IMA 知识库 | `references/material.md` |
| 「查我的笔记」「搜一下有没有 XX」「知识库里有没有」 | 检索并作答 | `references/query.md` |

模糊场景（"帮我记一下"既可能新建也可能追加）→ 先问一句是新建还是追加到某篇，不自行假设。

## 硬规则

1. **写入即 IMA**：不在本地写任何 markdown、不调用 git、不维护本地索引。
2. **UTF-8 强制校验**：`import_doc` / `append_doc` 的 `content`、`title` 全部确认是合法 UTF-8（规则见 `$IMA_DIR/SKILL.md` § Detailed UTF-8 Encoding Rules），否则中文会永久乱码。
3. **命名用中文 slug**：标题格式 `YYYY-MM-DD 中文标题`，禁止拼音、禁止英文 kebab-case 转写。
4. **追加是敏感操作**：`append_doc` 前必须已明确目标 `note_id`（用户点名，或检索唯一命中并已告知）。
5. **文件上传不转码**：二进制按原始内容上传，走 knowledge-base 的预检 → 重名 → create_media → COS → add_knowledge 流程，任一步失败即停。
6. **不做**：`ingest` 三层编译、`lint`、`[[双链]]`、Obsidian 兼容层——IMA 没有这些可编程面，不造中间层假装它们存在。

## 反馈

一句话即可：记到哪儿 + 标题或 note_id。不贴大段回显。
