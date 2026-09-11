#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_ROOT="${1:-$SCRIPT_DIR}"

[ -d "$SKILLS_ROOT" ] || { echo "错误: 无效的源目录 $SKILLS_ROOT"; exit 1; }

cleanup() {
    stty echo 2>/dev/null
    tput cnorm 2>/dev/null || echo -e "\033[?25h"
}
trap cleanup EXIT

# 跨平台建链接：Windows 的 ln -sfn 会静默退化成复制文件，改用硬链接
case "$OSTYPE" in
    msys*|cygwin*|mingw*) IS_WINDOWS=1 ;;
    *)                    IS_WINDOWS=0 ;;
esac

# /c/Users/x -> C:\Users\x（纯 bash 参数替换，不依赖 cygpath/tr/sed）
win_path() {
    local p="${1//\//\\}"
    case "$p" in
        \\[a-zA-Z]\\*)
            local drive="${p:1:1}"
            printf '%s:%s' "${drive^^}" "${p:2}"
            ;;
        *) printf '%s' "$p" ;;
    esac
}

link() {
    local src="$1" dst="$2" win_src win_dst
    src="$(cd "$(dirname "$src")" 2>/dev/null && pwd)/$(basename "$src")"
    win_src="$(win_path "$src")"
    win_dst="$(win_path "$dst")"
    rm -f "$dst" 2>/dev/null
    mkdir -p "$(dirname "$dst")" 2>/dev/null
    if [ "$IS_WINDOWS" -eq 1 ]; then
        powershell -NoProfile -Command \
            "New-Item -ItemType HardLink -Path '$win_dst' -Target '$win_src' -Force | Out-Null" 2>/dev/null
    else
        ln -sfn "$src" "$dst"
    fi
}

# 通用 ANSI 交互菜单函数 (支持单选 single 与 多选 multi)
SELECTED_INDICES=()
select_menu() {
    local title="$1"
    local mode="$2"
    shift 2
    local items=("$@")
    local count=${#items[@]}
    
    stty -echo 2>/dev/null
    tput civis 2>/dev/null || echo -e "\033[?25l"
    
    local menu_count=$count
    [ "$mode" == "multi" ] && menu_count=$((count + 1))
    
    local cur=0
    local sel=()
    for ((i=0; i<menu_count; i++)); do sel+=(0); done
    
    echo "=== $title (↑/↓ 移动, $( [ "$mode" == "multi" ] && echo "空格 勾选/取消, " )回车 确认) ==="
    for ((i=0; i<menu_count; i++)); do echo ""; done
    
    while true; do
        echo -en "\033[${menu_count}A"
        for ((i=0; i<menu_count; i++)); do
            echo -en "\033[2K\r"
            local prefix="   "
            [ "$i" -eq "$cur" ] && prefix=" \033[1;36m>\033[0m "
            
            local is_on="${sel[i]:-0}"
            local mark="[ ]"
            [ "$is_on" -eq 1 ] && mark="[\033[32mx\033[0m]"
            
            if [ "$mode" == "multi" ]; then
                if [ "$i" -eq 0 ]; then
                    echo -e "${prefix}${mark} \033[1;33m[ 全选 / 取消全选 ]\033[0m"
                else
                    echo -e "${prefix}${mark} ${items[$((i-1))]}"
                fi
            else
                if [ "$i" -eq "$cur" ]; then
                    echo -e "${prefix}\033[1;33m${items[i]}\033[0m"
                else
                    echo -e "${prefix}${items[i]}"
                fi
            fi
        done
        
        IFS= read -rsn1 key
        if [[ "$key" == $'\x1b' ]]; then
            IFS= read -rsn2 -t 0.1 key2
            [[ "$key2" == "[A" ]] && cur=$(( (cur - 1 + menu_count) % menu_count ))
            [[ "$key2" == "[B" ]] && cur=$(( (cur + 1) % menu_count ))
        elif [[ "$key" == " " && "$mode" == "multi" ]]; then
            if [ "$cur" -eq 0 ]; then
                local val=$(( 1 - sel[0] ))
                for ((j=0; j<menu_count; j++)); do sel[j]=$val; done
            else
                sel[cur]=$(( 1 - sel[cur] ))
                local all_on=1
                for ((j=1; j<menu_count; j++)); do [ "${sel[j]:-0}" -eq 0 ] && { all_on=0; break; }; done
                sel[0]=$all_on
            fi
        elif [[ "$key" == "" || "$key" == $'\r' || "$key" == $'\n' ]]; then
            break
        fi
    done
    
    SELECTED_INDICES=()
    if [ "$mode" == "multi" ]; then
        for ((i=1; i<menu_count; i++)); do
            [ "${sel[i]:-0}" -eq 1 ] && SELECTED_INDICES+=("$((i-1))")
        done
    else
        SELECTED_INDICES+=("$cur")
    fi
    cleanup
    echo ""
}

# 1. 扫描源目录下的直接一级子目录及规则文件
skill_names=()
skill_paths=()

if [ -f "$SCRIPT_DIR/one-agents.md" ]; then
    skill_names+=("[规则文件] AGENTS 规则 (one-agents.md)")
    skill_paths+=("$SCRIPT_DIR/one-agents.md")
fi

skill_names+=("[配置项] 忽略规则 (.gitignore 忽略 .agents .claude .ua .pi)")
skill_paths+=("SPECIAL_GITIGNORE_AGENTS")

for d in "$SKILLS_ROOT"/*; do
    if [ -d "$d" ]; then
        bname="$(basename "$d")"
        if [[ "$bname" == one-* ]]; then
            skill_names+=("$bname")
            skill_paths+=("$d")
        fi
    fi
done

[ ${#skill_names[@]} -eq 0 ] && { echo "错误: $SKILLS_ROOT 下未找到任何技能或规则文件"; exit 0; }

# 第一步：选择要安装/操作的技能 (Skills)
select_menu "第一步：选择要安装/操作的技能 (Skills)" "multi" "${skill_names[@]}"

if [ ${#SELECTED_INDICES[@]} -eq 0 ]; then
    echo "未勾选任何项目，取消操作。"
    exit 0
fi

user_selected_indices=("${SELECTED_INDICES[@]}")

# 第二步：选择操作与目标位置
op_options=(
    "软链接到当前项目 (./.agents/skills)"
    "卸载自当前项目 (./.agents/skills)"
    "软链接到用户全局 (~/.agents/skills)"
    "卸载自用户全局 (~/.agents/skills)"
    "安装记忆钩子到所有同级仓库 (pre-commit + post-commit)"
)
select_menu "第二步：选择操作与目标位置" "single" "${op_options[@]}"
dest_idx="${SELECTED_INDICES[0]}"

# 安装记忆钩子：遍历 ~/onespace/github/* 的 git 仓库，装 one-memory 的 pre-commit 与 post-commit
install_memory_hooks() {
    local hooks_dir="$SCRIPT_DIR/one-memory/hooks"
    [ -d "$hooks_dir" ] || { echo "错误: 未找到 $hooks_dir"; return 1; }
    local n=0
    for repo in "$HOME"/onespace/github/*; do
        [ -d "$repo/.git" ] || continue
        [ -d "$repo/.git/hooks" ] || mkdir -p "$repo/.git/hooks"
        cp -f "$hooks_dir/pre-commit"  "$repo/.git/hooks/pre-commit"  && chmod +x "$repo/.git/hooks/pre-commit"
        cp -f "$hooks_dir/post-commit" "$repo/.git/hooks/post-commit" && chmod +x "$repo/.git/hooks/post-commit"
        [ -f "$repo/.git/hooks/commit-msg" ] && rm -f "$repo/.git/hooks/commit-msg"
        echo "  已安装: $(basename "$repo")"
        n=$((n + 1))
    done
    echo "✅ 记忆钩子已安装到 $n 个仓库 (pre-commit 记忆门禁 + post-commit 索引同步)"
}

USER_GLOBAL_DIRS=("$HOME/.agents/skills")
USER_GLOBAL_RULES=(
    "$HOME/.pi/agent/AGENTS.md"
    "$HOME/.gemini/config/AGENTS.md"
    "$HOME/.gemini/GEMINI.md"
    "$HOME/.claude/CLAUDE.md"
    "$HOME/.cursor/AGENTS.md"
    "$HOME/.config/opencode/AGENTS.md"
    "$HOME/.copilot/copilot-instructions.md"
    "$HOME/.agents/AGENTS.md"
)

processed=0

# 操作 4：安装记忆钩子（与具体 skill 无关，直接执行后退出）
if [ "$dest_idx" -eq 4 ]; then
    install_memory_hooks
    exit 0
fi

# 收集特殊项和常规 skills
special_indices=()
skill_indices=()
for idx in "${user_selected_indices[@]}"; do
    src="${skill_paths[idx]}"
    if [ "$src" == "$SCRIPT_DIR/one-agents.md" ] || [ "$src" == "SPECIAL_GITIGNORE_AGENTS" ]; then
        special_indices+=("$idx")
    else
        skill_indices+=("$idx")
    fi
done

# 先处理特殊项（逐个）
for idx in "${special_indices[@]}"; do
    src="${skill_paths[idx]}"

    if [ "$src" == "$SCRIPT_DIR/one-agents.md" ]; then
        case "$dest_idx" in
            0) # 软链接到当前项目
                [ ! -f "./one-context.md" ] && echo '<!-- 用户可以在这里写一些对 AI 说的话/全局指令 -->' > "./one-context.md"
                link "$src" "./AGENTS.md"
                link "$src" "./CLAUDE.md"
                echo "已软链接 AGENTS 规则 -> ./AGENTS.md, ./CLAUDE.md"
                ;;
            1) # 卸载自当前项目
                rm -f "./AGENTS.md" "./CLAUDE.md"
                echo "已从当前项目卸载 AGENTS 规则"
                ;;
            2) # 软链接到用户全局
                for t in "${USER_GLOBAL_RULES[@]}"; do
                    link "$src" "$t"
                done
                echo "已软链接 AGENTS 规则到用户全局配置文件"
                ;;
            3) # 卸载自用户全局
                for t in "${USER_GLOBAL_RULES[@]}"; do
                    rm -f "$t"
                done
                echo "已从用户全局卸载 AGENTS 规则"
                ;;
        esac
        processed=$((processed + 1))
    elif [ "$src" == "SPECIAL_GITIGNORE_AGENTS" ]; then
        case "$dest_idx" in
            0) # 软链接到当前项目
                for ig in ".agents/" ".claude/" ".ua/" ".pi/"; do
                    if [ -f "./.gitignore" ]; then
                        grep -qF "$ig" "./.gitignore" || echo "$ig" >> "./.gitignore"
                    else
                        echo "$ig" >> "./.gitignore"
                    fi
                done
                echo "已在 .gitignore 中添加 .agents/ .claude/ .ua/ .pi/ 忽略"
                ;;
            1) # 卸载自当前项目
                if [ -f "./.gitignore" ]; then
                    for ig in "\.agents" "\.claude" "\.ua" "\.pi"; do
                        sed -i "/^$ig/d" "./.gitignore"
                    done
                    echo "已从 .gitignore 中移除 .agents .claude .ua .pi 忽略"
                fi
                ;;
            2|3) # 用户全局
                echo "全局操作跳过项目级 .gitignore"
                ;;
        esac
        processed=$((processed + 1))
    fi
done

# 再整体处理常规 skills
if [ ${#skill_indices[@]} -gt 0 ]; then
    case "$dest_idx" in
        0) # 软链接到当前项目
            mkdir -p "./.agents/skills"
            for idx in "${skill_indices[@]}"; do
                link "${skill_paths[idx]}" "./.agents/skills/${skill_names[idx]}"
            done
            echo "已软链接到当前项目: ${#skill_indices[@]} 个 skills"
            ;;
        1) # 卸载自当前项目
            for idx in "${skill_indices[@]}"; do
                rm -rf "./.agents/skills/${skill_names[idx]}"
            done
            echo "已从当前项目卸载: ${#skill_indices[@]} 个 skills"
            ;;
        2) # 软链接到用户全局
            for g in "${USER_GLOBAL_DIRS[@]}"; do
                mkdir -p "$g"
                for idx in "${skill_indices[@]}"; do
                    link "${skill_paths[idx]}" "$g/${skill_names[idx]}"
                done
            done
            echo "已软链接到用户全局: ${#skill_indices[@]} 个 skills"
            ;;
        3) # 卸载自用户全局
            for g in "${USER_GLOBAL_DIRS[@]}"; do
                for idx in "${skill_indices[@]}"; do
                    rm -rf "$g/${skill_names[idx]}"
                done
            done
            echo "已从用户全局卸载: ${#skill_indices[@]} 个 skills"
            ;;
    esac
    processed=$((processed + ${#skill_indices[@]}))
fi

if [ "$dest_idx" -eq 0 ] && [ "$processed" -gt 0 ]; then
    if [ ! -f "./one-context.md" ]; then
        echo '<!-- 用户可以在这里写一些对 AI 说的话/全局指令 -->' > "./one-context.md"
        echo "已自动初始化 ./one-context.md"
    fi
fi
echo -e "\n完成！共处理了 $processed 项。"
