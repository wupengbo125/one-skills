# one-skills

个人 Agent Skills 技能库与全局 Agent 宪法源仓库。符合 [Agent Skills 规范](https://agentskills.io)，支持在 Claude Code、Pi CLI、Antigravity 等任意兼容环境中动态加载。

---

## 快速安装与使用 (NPX 方式)

无需预先克隆仓库，在任意支持 Node.js 的终端中直接使用 `npx` 一键拉取安装：

### 1. 安装指定单个技能

```bash
# 安装单个技能到当前项目 (./.agents/skills/)
npx -y skills@latest add https://github.com/wupengbo125/one-skills --skill one-super-me

# 全局安装到用户的 Agent 技能库 (-g)
npx -y skills@latest add https://github.com/wupengbo125/one-skills --skill one-implement -g
```

### 2. 交互式选择并批量安装

```bash
# 自动扫描并弹出本仓库所有技能供交互式多选安装
npx -y skills@latest add https://github.com/wupengbo125/one-skills
```

---

## 本地开发与分发 (Shell 方式)

在本机环境开发与调试技能时，直接使用仓库内置的交互脚本：

```bash
# 1. 本地技能交互式分发 (支持软链与复制到全局/项目)
bash install.sh

# 2. 第三方常用技能交互式一键安装
bash install-others.sh

# 3. 将技能与宪法同步更新到各个本地关联仓库
bash update-to-repos.sh
```

---

## 核心开发规范

1. **宪法源文件**：本仓库的 `one-agents.md` 是全局宪法/规则的唯一源文件，严禁直接修改分发副本。
2. **Skill 源目录**：各 `./<skill-name>/` 目录是技能的源文件，每个技能均包含标准的 `SKILL.md`。
