---
name: one-simplifying
description: 用最精简的代码解决问题。当用户要求简化代码、重构、或写新脚本时触发。核心原则：砍掉一切"以防万一"的代码，只留"一定发生"的逻辑。
---

# Simplifying

能用一行不用两行，能用20行不用120行。

## 原则

1. 不要为确定性事物写防御性代码
2. 不要写兜底方案
3. 不要用函数包装简单命令
4. 不要写大量的输出，做批量任务的脚本，输出只要写xxx完成，不用写过程 

## 成功案例：install.sh 129行 → 27行

### 之前（反例）

```bash
install_skills() {
    local skills_src="$DOTFILES_DIR/skills"
    [ -d "$skills_src" ] || return 0
    local folders
    mapfile -t folders < <(find "$skills_src" -maxdepth 1 -mindepth 1 -type d ! -name '.*')
    [ ${#folders[@]} -eq 0 ] && return 0
    local dest_dirs=(
        "$HOME/.claude/skills"
        "$HOME/.gemini/antigravity/skills"
        "$HOME/.config/opencode/skills"
    )
    echo "Installing skills:"
    for folder in "${folders[@]}"; do
        local name=$(basename "$folder")
        for dest in "${dest_dirs[@]}"; do
            mkdir -p "$dest"
            cp -rf "$folder" "$dest/"
            echo "  $name -> $dest"
        done
    done
}
```

### 之后（成功案例）

```bash
for d in "$HOME/.claude/skills" "$HOME/.gemini/antigravity/skills" "$HOME/.config/opencode/skills"; do
    mkdir -p "$d" && cp -rf "$DOTFILES_DIR/skills"/* "$d/"
done
```

### 砍掉了什么

| 砍掉的东西 | 为什么砍 |
|-----------|---------|
| 函数包装 | 直接写命令 |
| `[ -d ] \|\| return 0` | 目录永远在 |
| `find` + `mapfile` | `cp skills/*` 代替 |
| `echo " Installing..."` | 人类不需要看进度 |
