# Wiki 规范与约定

知识库根目录为 `$one_llmwiki_dir/`。

## 目录与映射

- `raw/`：原始只读源材料收件箱。分类后移入 `raw/<topic>/<filename>.md`。
- `onewiki/`：编译生成的合成知识库，镜像对应 `onewiki/<topic>/`。
- `onewiki/index.md`：全库总索引与概念大纲。各分类内维护 `onewiki/<topic>/index.md`。
- `onewiki/log.md`：操作历史追加流水（格式：`## [YYYY-MM-DD] <操作> | <主题>`）。

## 链接与元数据

- **Obsidian 双链**：使用 `[[目标路径|显示文本]]` 或 `[[目标页面]]`。
- **出处反向链接**：概念与摘要页头部须包含指向源文档的双链（如 `> 源文件：[[../../raw/<topic>/<filename>.md|查看原文]]`）。
- **Frontmatter**（非 index 概念页必备）：
  ```yaml
  ---
  type: <种类>
  title: <标题>
  description: <面向检索的简述>
  ---
  ```

## Git 规范

- **前置**：写操作前执行 `git pull`。
- **后置**：完成写入后执行 `git add raw/ onewiki/` 并本地 commit。
