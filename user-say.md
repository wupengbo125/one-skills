<!-- 用户可以在这里写一些对 AI 说的话/全局指令 -->

- 读取 skills.drawio

## 核心源文件规范（严禁直接改分发目标目录）
1. **宪法源文件**：本仓库的 `one-agents.md` 是全局宪法/规则的唯一源文件。严禁直接修改分发副本（如 `./AGENTS.md`、`./CLAUDE.md` 或用户全局配置文件），修改宪法必须只修改 `one-agents.md`。
2. **Skill 源目录**：本仓库各 Skill 目录（如 `./<skill-name>/`）是 Skill 的源文件。严禁直接去安装目标目录（如 `~/.gemini/config/skills/`、`./.agents/skills/` 等）修改，修改或新增 Skill 必须直接修改本仓库下的源文件。