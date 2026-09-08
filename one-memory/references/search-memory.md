# 查资料与记忆检索指南

海马体数据仓路径：`~/onespace/github/one-hippocampus/`

---

## 一、 检索第一准则：必须优先执行 BM25 全文检索 (Step 1 首选)

遇到任何**查资料、搜记忆、查踩坑手册、查历史技术决策或方案**时，**第一步必须直接执行 BM25 全文检索**。严禁一上来就盲目遍历或通读大纲/目录：

```bash
python3 ~/onespace/github/one-skills/one-memory/scripts/memory.py search "<关键词>"
```

### 检索执行与结果处理 SOP：
1. **执行检索**：提炼用户诉求的核心关键词（如 `代理`、`FRP`、`显卡` 等），执行上述命令。
2. **定位文档**：BM25 检索毫秒级返回 Top-5 候选，包含文档路径、分类、匹配标题与带高亮 `【】` 的原生上下文摘要。
3. **精准阅读**：Agent 根据返回的摘要判定相关性，**仅精准读取最相关的 1~2 篇 Markdown 文档**，切勿盲目全读。
4. **关键词调优**：若未命中或结果不足，精简或更换关键词（拆成 1~2 个核心词）再次检索。

---

## 二、 专用直达通道 (特权场景免搜索)

仅当用户诉求非常纯粹，属于以下 2 种专用场景时，才无需 BM25 检索，直达指定文档：

1. **查历史流水（“最近干了什么”、“查近期历史”、“流水日志”）**：
   - 直接列当月文件：`ls ~/onespace/github/one-hippocampus/memory/<YYYY-MM>/`，再读取对应当日文件。
2. **查稳定偏好（“我的偏好”、“习惯”、“喜不喜欢”）**：
   - 直接读取：`~/onespace/github/one-hippocampus/preference.md`
3. **查已完成任务（“之前做过什么改造”、“任务历史”）**：
   - 直接检索：`python3 ~/onespace/github/one-skills/one-memory/scripts/memory.py search "任务"`，或读 `~/onespace/github/one-hippocampus/task_history.md`
4. **查用户画像与环境拓扑（“用户习惯”、“局域网IP”、“端口”、“项目路径”）**：
   - 直接读取：`~/onespace/github/one-hippocampus/system/profile.md`

---

## 三、 兜底大纲与索引维护

- **全局总索引**：`~/onespace/github/one-hippocampus/INDEX.md`
- **全量重建索引**：若发现新写入的文档检索不到，或索引库异常，运行重建：
  ```bash
  python3 ~/onespace/github/one-skills/one-memory/scripts/memory.py rebuild
  ```