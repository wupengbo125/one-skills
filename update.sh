#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

[ -z "$github_dir" ] || [ ! -d "$github_dir" ] && { echo "错误: 环境变量 \$github_dir 未设置或目录不存在"; exit 1; }

skill_names=()
skill_paths=()

for d in "$SCRIPT_DIR"/*; do
    if [ -d "$d" ]; then
        bname="$(basename "$d")"
        if [[ "$bname" == one-* ]]; then
            skill_names+=("$bname")
            skill_paths+=("$d")
        fi
    fi
done

update_repo() {
    local target_dir="$1"
    local repo_name="$(basename "$target_dir")"
    
    echo -e "  \033[1;36m>\033[0m 正在更新: \033[1;33m$repo_name\033[0m"

    # 1. 规则文件
    if [ -f "$SCRIPT_DIR/one-agents.md" ]; then
        rm -f "$target_dir/AGENTS.md" "$target_dir/CLAUDE.md"
        [ ! -f "$target_dir/one-context.md" ] && echo '<!-- 用户可以在这里写一些对 AI 说的话/全局指令 -->' > "$target_dir/one-context.md"
        cp -f "$SCRIPT_DIR/one-agents.md" "$target_dir/AGENTS.md"
        cp -f "$SCRIPT_DIR/one-agents.md" "$target_dir/CLAUDE.md"
    fi

    # 2. 忽略配置
    if [ -f "$target_dir/.gitignore" ]; then
        for ig in "\.agents" "\.claude" "\.ua" "\.pi"; do
            sed -i "/^$ig/d" "$target_dir/.gitignore"
        done
    fi
    for ig in ".agents/" ".claude/" ".ua/" ".pi/"; do
        if [ -f "$target_dir/.gitignore" ]; then
            grep -qF "$ig" "$target_dir/.gitignore" || echo "$ig" >> "$target_dir/.gitignore"
        else
            echo "$ig" >> "$target_dir/.gitignore"
        fi
    done

    # 3. 技能文件 (先删后装)
    if [ "$target_dir" != "$SCRIPT_DIR" ]; then
        for idx in "${!skill_names[@]}"; do
            local name="${skill_names[idx]}"
            local src="${skill_paths[idx]}"
            rm -rf "$target_dir/.agents/skills/$name"
            mkdir -p "$target_dir/.agents/skills"
            cp -rf "$src" "$target_dir/.agents/skills/"
        done
    fi
}

echo -e "\033[1;34m>>> 正在全量更新 \$github_dir 下的所有仓库 (先删后装)... \033[0m"

for d in "$github_dir"/*; do
    if [ -d "$d" ]; then
        [ "$d" == "$SCRIPT_DIR" ] && continue
        update_repo "$d"
    fi
done

echo -e "\033[1;32m✓ 全部仓库更新完成！\033[0m"
