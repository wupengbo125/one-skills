#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ==================== 技能源目录配置（一行一个） ====================
SKILL_SOURCES=(
    "$SCRIPT_DIR"
    "$github_dir/anth-skills/skills/skills"
    "$github_dir/matt-skills/skills/skills/engineering"
    "$github_dir/matt-skills/skills/skills/productivity"
    # 在下面继续追加你的技能源路径：
    # "$HOME/my-custom-skills"
)
# ================================================================

cleanup() {
    stty echo 2>/dev/null
    tput cnorm 2>/dev/null || echo -e "\033[?25h"
}
trap cleanup EXIT

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

# 1. 确定技能源目录
SKILLS_ROOT=""
if [ -n "$1" ] && [ -d "$1" ]; then
    SKILLS_ROOT="$(cd "$1" && pwd)"
else
    src_paths=()
    src_labels=()
    for p in "${SKILL_SOURCES[@]}"; do
        eval exp_p="$p"
        if [ -d "$exp_p" ]; then
            abs_p="$(cd "$exp_p" && pwd)"
            src_paths+=("$abs_p")
            src_labels+=("$abs_p")
        fi
    done
    src_labels+=("自定义其它路径...")
    
    select_menu "第一步：选择 Skill 来源目录" "single" "${src_labels[@]}"
    idx="${SELECTED_INDICES[0]}"
    
    if [ "$idx" -lt "${#src_paths[@]}" ]; then
        SKILLS_ROOT="${src_paths[idx]}"
    else
        stty echo 2>/dev/null; tput cnorm 2>/dev/null
        echo -n "请输入技能源目录的路径: "
        read -r user_path
        eval user_path="$user_path"
        [ -d "$user_path" ] && SKILLS_ROOT="$(cd "$user_path" && pwd)"
    fi
fi

[ -z "$SKILLS_ROOT" ] || [ ! -d "$SKILLS_ROOT" ] && { echo "错误: 无效的源目录"; exit 1; }
echo -e "已选择源目录: \033[1;32m$SKILLS_ROOT\033[0m\n"

# 2. 扫描源目录下的直接一级子目录及规则文件
skill_names=()
skill_paths=()

if [ -f "$SCRIPT_DIR/one-agents.md" ]; then
    skill_names+=("[规则文件] AGENTS 规则 (one-agents.md)")
    skill_paths+=("$SCRIPT_DIR/one-agents.md")
fi

for d in "$SKILLS_ROOT"/*; do
    if [ -d "$d" ]; then
        bname="$(basename "$d")"
        if [[ "$bname" == one* ]]; then
            skill_names+=("$bname")
            skill_paths+=("$d")
        fi
    fi
done

[ ${#skill_names[@]} -eq 0 ] && { echo "错误: $SKILLS_ROOT 下未找到任何技能或规则文件"; exit 0; }

# 3. 选择操作与目标位置
op_options=(
    "安装到当前项目 (./.agents/skills)"
    "卸载自当前项目 (./.agents/skills)"
    "安装到用户全局 (~/.gemini, ~/.claude)"
    "卸载自用户全局 (~/.gemini, ~/.claude)"
)
select_menu "第二步：选择操作与目标位置" "single" "${op_options[@]}"
dest_idx="${SELECTED_INDICES[0]}"

# 4. 选择要处理的项目 (多选/勾选)
select_menu "第三步：选择要处理的 Skills / 规则" "multi" "${skill_names[@]}"

if [ ${#SELECTED_INDICES[@]} -eq 0 ]; then
    echo "未勾选任何项目，取消操作。"
    exit 0
fi

USER_GLOBAL_DIRS=("$HOME/.claude/skills" "$HOME/.gemini/config/skills" "$HOME/.gemini/antigravity/skills" "$HOME/.config/opencode/skills")
USER_GLOBAL_RULES=("$HOME/.claude/CLAUDE.md" "$HOME/.gemini/GEMINI.md" "$HOME/.gemini/config/AGENTS.md" "$HOME/.gemini/antigravity/AGENTS.md" "$HOME/.config/opencode/AGENTS.md" "$HOME/.cursor/AGENTS.md" "$HOME/.copilot/copilot-instructions.md")

processed=0

for idx in "${SELECTED_INDICES[@]}"; do
    name="${skill_names[idx]}"
    src="${skill_paths[idx]}"

    if [ "$src" == "$SCRIPT_DIR/one-agents.md" ]; then
        case "$dest_idx" in
            0) # 安装到当前项目
                [ ! -f "./user-say.md" ] && echo '<!-- 用户可以在这里写一些对 AI 说的话/全局指令 -->' > "./user-say.md"
                cp -f "$src" "./AGENTS.md"
                cp -f "$src" "./CLAUDE.md"
                echo "已安装 AGENTS 规则 -> ./AGENTS.md, ./CLAUDE.md"
                ;;
            1) # 卸载自当前项目
                rm -f "./AGENTS.md" "./CLAUDE.md"
                echo "已从当前项目卸载 AGENTS 规则"
                ;;
            2) # 安装到用户全局
                for t in "${USER_GLOBAL_RULES[@]}"; do
                    mkdir -p "$(dirname "$t")" && cp -f "$src" "$t"
                done
                echo "已安装 AGENTS 规则到用户全局配置文件"
                ;;
            3) # 卸载自用户全局
                for t in "${USER_GLOBAL_RULES[@]}"; do
                    rm -f "$t"
                done
                echo "已从用户全局卸载 AGENTS 规则"
                ;;
        esac
    else
        case "$dest_idx" in
            0) # 安装到当前项目
                mkdir -p "./.agents/skills/$name"
                cp -rf "$src"/* "./.agents/skills/$name/"
                echo "已安装到当前项目: $name"
                ;;
            1) # 卸载自当前项目
                rm -rf "./.agents/skills/$name"
                echo "已从当前项目卸载: $name"
                ;;
            2) # 安装到用户全局
                for g in "${USER_GLOBAL_DIRS[@]}"; do
                    mkdir -p "$g/$name"
                    cp -rf "$src"/* "$g/$name/"
                done
                echo "已安装到用户全局: $name"
                ;;
            3) # 卸载自用户全局
                for g in "${USER_GLOBAL_DIRS[@]}"; do
                    rm -rf "$g/$name"
                done
                echo "已从用户全局卸载: $name"
                ;;
        esac
    fi

    processed=$((processed + 1))
done

if [ "$dest_idx" -eq 0 ] && [ "$processed" -gt 0 ]; then
    if [ ! -f "./user-say.md" ]; then
        echo '<!-- 用户可以在这里写一些对 AI 说的话/全局指令 -->' > "./user-say.md"
        echo "已自动初始化 ./user-say.md"
    fi
fi

echo -e "\n完成！共处理了 $processed 项。"
