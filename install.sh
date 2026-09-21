#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_ROOT="${1:-$SCRIPT_DIR}"

[ -d "$SKILLS_ROOT" ] || { echo "错误: 无效的源目录 $SKILLS_ROOT"; exit 1; }

cleanup() {
    stty echo 2>/dev/null
    tput cnorm 2>/dev/null || echo -e "\033[?25h"
}
trap cleanup EXIT

# 操作表：一行一个操作，格式 "菜单名|direction"
#   direction: link 安装 / unlink 卸载
OPS=(
    "安装|link"
    "卸载|unlink"
)

link() {
    local src="$1" dst="$2"
    src="$(cd "$(dirname "$src")" 2>/dev/null && pwd)/$(basename "$src")"
    rm -f "$dst" 2>/dev/null
    mkdir -p "$(dirname "$dst")" 2>/dev/null
    ln -sfn "$src" "$dst"
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

# 候选表：一行一个候选，格式 "kind|key|菜单名|路径"
#   kind: rule 宪法规则文件 / gitignore 忽略规则配置 / hooks 记忆钩子 / skill 技能目录
ITEMS=()

if [ -f "$SCRIPT_DIR/one-agents.md" ]; then
    ITEMS+=("rule|agents|[规则文件] AGENTS 规则 (one-agents.md)|$SCRIPT_DIR/one-agents.md")
fi

ITEMS+=("gitignore|gitignore|[配置项] 忽略规则 (.gitignore 忽略 .agents .claude .ua .pi)|-")
ITEMS+=("hooks|hooks|[记忆钩子] 安装到所有同级仓库 (pre-commit + post-commit)|-")

for d in "$SKILLS_ROOT"/*; do
    if [ -d "$d" ]; then
        bname="$(basename "$d")"
        if [[ "$bname" == one-* ]]; then
            ITEMS+=("skill|$bname|$bname|$d")
        fi
    fi
done

[ ${#ITEMS[@]} -eq 0 ] && { echo "错误: $SKILLS_ROOT 下未找到任何技能或规则文件"; exit 0; }

ITEM_LABELS=()
OPS_LABELS=()
for it in "${ITEMS[@]}"; do IFS='|' read -r _ _ label _ <<< "$it"; ITEM_LABELS+=("$label"); done
for op in "${OPS[@]}"; do OPS_LABELS+=("${op%%|*}"); done

# 安装记忆钩子：pre-commit 门禁装给所有项目仓（跳过记录型），post-commit 索引同步专属 one-hippocampus
install_memory_hooks() {
    local hooks_dir="$SCRIPT_DIR/one-memory/hooks"
    [ -d "$hooks_dir" ] || { echo "错误: 未找到 $hooks_dir"; return 1; }
    local n=0 name
    for repo in "$HOME"/onespace/github/*; do
        [ -d "$repo/.git" ] || continue
        name="$(basename "$repo")"
        # 记录型仓库自身即记忆载体，不装门禁
        case "$name" in
            one-hippocampus|one-life|one-llmwiki)
                echo "  跳过: $name"
                continue
                ;;
        esac
        mkdir -p "$repo/.git/hooks"
        cp -f "$hooks_dir/pre-commit" "$repo/.git/hooks/pre-commit" && chmod +x "$repo/.git/hooks/pre-commit"
        echo "  已安装 pre-commit 门禁: $name"
        n=$((n + 1))
    done
    # 记忆中枢专属：post-commit 同步 FTS 检索索引
    local hippo="$HOME/onespace/github/one-hippocampus"
    if [ -d "$hippo/.git/hooks" ]; then
        cp -f "$hooks_dir/post-commit" "$hippo/.git/hooks/post-commit" && chmod +x "$hippo/.git/hooks/post-commit"
        cp -f "$SCRIPT_DIR/one-memory/scripts/fts.py" "$hippo/.git/hooks/fts.py"
        echo "  已安装 post-commit 索引同步: one-hippocampus"
    fi
    echo "✅ 记忆钩子安装完成：$n 个项目仓装 pre-commit，one-hippocampus 装 post-commit"
}

# 第一步：选择要安装/卸载的技能 (Skills)
select_menu "第一步：选择要安装/卸载的技能 (Skills)" "multi" "${ITEM_LABELS[@]}"
# select_menu 复用同一个全局变量，第二步会覆盖它，先存下来
SELECTED_ITEMS=("${SELECTED_INDICES[@]}")

if [ ${#SELECTED_ITEMS[@]} -eq 0 ]; then
    echo "未勾选任何项目，取消操作。"
    exit 0
fi

# 第二步：选择操作（安装 / 卸载）
select_menu "第二步：选择操作（安装 / 卸载）" "single" "${OPS_LABELS[@]}"
OP_IDX="${SELECTED_INDICES[0]}"
IFS='|' read -r _ OP_DIR <<< "${OPS[OP_IDX]}"

# 全局分发目标表：一行一个 target，格式 "agent|kind|path"
#   kind: skills-dir = 技能目录 / rules-file = 宪法规则文件
#   每个 agent 的实测说明贴在对应行上方 —— 增删 agent 只动这一张表，两种 kind 同时生效
TARGETS=(
    "agents|skills-dir|$HOME/.agents/skills"
    "agents|rules-file|$HOME/.agents/AGENTS.md"
    "pi|rules-file|$HOME/.pi/agent/AGENTS.md"
    "gemini|rules-file|$HOME/.gemini/config/AGENTS.md"
    "gemini|rules-file|$HOME/.gemini/GEMINI.md"
    "claude|rules-file|$HOME/.claude/CLAUDE.md"
    "cursor|rules-file|$HOME/.cursor/AGENTS.md"
    "opencode|rules-file|$HOME/.config/opencode/AGENTS.md"
    "copilot|rules-file|$HOME/.copilot/copilot-instructions.md"
    # CodeBuddy 说明（2026-09-13 勘误，2026-09-15 补技能位）：
    #   CodeBuddy IDE 与 CodeBuddy Code CLI 同源，共享 ~/.codebuddy/ 配置与记忆
    #   ~/.codebuddy/CODEBUDDY.md 为用户级全局记忆文件（类似 ~/.claude/CLAUDE.md），会话自动全文注入
    #   （真权限在 ~/.codebuddy/settings.json 的 permissions 字段；CODEBUDDY.md 内曾残留的 YAML permissions 为无效死内容）
    #   ~/.codebuddy/rules/*.md 为用户级规则目录（User Rules），随 ~/.codebuddy/CODEBUDDY.md 一同全量加载（2026-09-15 实测订正）
    #   ~/.codebuddy/CODEBUDDY.md 是 `#` 快捷记忆与自动记忆的写入目标，不复用给宪法（避免自动记忆覆盖软链），宪法走 rules/ 单文件
    #   用户级技能目录 = ~/.codebuddy/skills（2026-09-15 二进制实测，非文档推断）：
    #     dist/codebuddy-headless.js 内 expandPaths 定义常量 es="~/.codebuddy/skills" 并做展开，
    #     同文件路径白名单同时含 "~/.codebuddy/skills/" 与 "~/.agents/skills/"，二者并列有效。
    #     修正前本数组只链了记忆位（~/.codebuddy/CODEBUDDY.md），技能位漏配，故 CodeBuddy 侧技能不生效。
    "codebuddy|skills-dir|$HOME/.codebuddy/skills"
    "codebuddy|rules-file|$HOME/.codebuddy/rules/AGENTS.md"
    # Trae 说明（TraeCode）：
    #   全局规则目录 ~/.trae-cn/user_rules（IDE 创建的文件名为 rule-<timestamp>.md，目录下 md 均会被读取）
    #   项目规则目录 .trae/rules/（支持 3 层嵌套、alwaysApply / globs / description 生效方式）
    #   项目根 AGENTS.md / CLAUDE.md 需在 Trae 设置 > 规则 > 导入设置中手动开启开关才生效（默认关闭）
    #   用户级技能目录 = ~/.trae-cn/skills（2026-09-15 二进制实测，非文档推断）：
    #     /usr/share/trae-cn/resources/app/out/vs/workbench/workbench.desktop.main.js 内路径判定并列出现
    #     "/.trae-cn/skills/"（home 级）与 "/.trae/skills/"（项目级）；~/.trae-cn/ 下另有 builtin_skills/ 与 skill-config.json。
    "trae-cn|skills-dir|$HOME/.trae-cn/skills"
    "trae-cn|rules-file|$HOME/.trae-cn/user_rules/AGENTS.md"
    # Qoder CLI 说明（qodercli 1.1.51）：
    #   全局记忆 ~/.qoder-cn/AGENTS.md（scope=home, trigger=always 全文注入）；项目级读 <仓库>/AGENTS.md 与 AGENTS.local.md
    #   目录名由进程内环境变量决定（本机实测 QODER_CONFIG_DIR_NAME=.qoder-cn；二进制内另有 QODERCN_CONFIG_DIR_NAME 分支，未验证）
    #   Qoder 只扫 ~/.agents/skills，不读 ~/.agents/AGENTS.md —— 宪法必须另链一份到 .qoder-cn 才生效
    "qoder-cn|rules-file|$HOME/.qoder-cn/AGENTS.md"
)

# 由 TARGETS 按 kind 派生，下游只认这两组
USER_GLOBAL_DIRS=()
USER_GLOBAL_RULES=()
for t in "${TARGETS[@]}"; do
    IFS='|' read -r agent kind path <<< "$t"
    case "$kind" in
        skills-dir) USER_GLOBAL_DIRS+=("$path") ;;
        rules-file) USER_GLOBAL_RULES+=("$path") ;;
    esac
done

gitignore_add() {
    for ig in ".agents/" ".claude/" ".ua/" ".pi/"; do
        if [ -f "./.gitignore" ]; then
            grep -qF "$ig" "./.gitignore" || echo "$ig" >> "./.gitignore"
        else
            echo "$ig" >> "./.gitignore"
        fi
    done
}

gitignore_del() {
    [ -f "./.gitignore" ] || return 0
    for ig in "\.agents" "\.claude" "\.ua" "\.pi"; do
        sed -i "/^$ig/d" "./.gitignore"
    done
}

# 唯一执行入口：direction 决定安装还是卸载，落点各自固定
#   rule      → 用户全局配置位（USER_GLOBAL_RULES）
#   gitignore → 当前项目 ./.gitignore
#   skill     → 每个 USER_GLOBAL_DIRS
apply_selection() {
    local direction="$1"
    local n_skill=0

    for idx in "${SELECTED_ITEMS[@]}"; do
        IFS='|' read -r kind key label path <<< "${ITEMS[idx]}"
        case "$kind" in
            rule)
                # 宪法规则始终分发到用户全局
                for t in "${USER_GLOBAL_RULES[@]}"; do
                    if [ "$direction" == "link" ]; then link "$path" "$t"; else rm -f "$t"; fi
                done
                if [ "$direction" == "link" ]; then
                    echo "已安装 AGENTS 规则到用户全局配置文件"
                else
                    echo "已从用户全局卸载 AGENTS 规则"
                fi
                processed=$((processed + 1))
                ;;
            gitignore)
                # 忽略配置只作用于当前项目
                if [ "$direction" == "link" ]; then
                    gitignore_add
                    echo "已在 .gitignore 中添加 .agents/ .claude/ .ua/ .pi/ 忽略"
                else
                    gitignore_del
                    [ -f "./.gitignore" ] && echo "已从 .gitignore 中移除 .agents .claude .ua .pi 忽略"
                fi
                processed=$((processed + 1))
                ;;
            hooks)
                # 记忆钩子：勾选后在主流程外单独执行
                HOOKS_WANTED=1
                ;;
            skill)
                for g in "${USER_GLOBAL_DIRS[@]}"; do
                    [ "$direction" == "link" ] && mkdir -p "$g"
                    local t="$g/$key"
                    if [ "$direction" == "link" ]; then link "$path" "$t"; else rm -rf "$t"; fi
                done
                n_skill=$((n_skill + 1))
                ;;
        esac
    done

    if [ "$n_skill" -gt 0 ]; then
        if [ "$direction" == "link" ]; then
            echo "已安装到用户全局: $n_skill 个 skills"
        else
            echo "已从用户全局卸载: $n_skill 个 skills"
        fi
    fi
    processed=$((processed + n_skill))
}

processed=0

apply_selection "$OP_DIR"

# 勾选了记忆钩子：单独执行安装
[ "${HOOKS_WANTED:-0}" == "1" ] && { install_memory_hooks; processed=$((processed + 1)); }

echo -e "\n完成！共处理了 $processed 项。"
