#!/bin/bash
# NPX Skill & Tools 交互式多选安装脚本

ITEMS=(
  "Matt Pocock Skills"              "npx -y skills@latest add mattpocock/skills"
  "Agents365 Skills"                "npx -y skills@latest add Agents365-ai/365-skills"
  "Planning with Files"             "npx skills add OthmanAdi/planning-with-files --skill planning-with-files"
  "安装 Pi CLI"                     "curl -fsSL https://pi.dev/install.sh | sh"
  "安装 Pi Web"                     "npm install -g @agegr/pi-web@latest"
  "安装 Caveman"                    "npx skills add https://github.com/juliusbrussee/caveman"
  "安装 RTK CLI"                    "curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh"
  "初始化 RTK Claude，或者支持默认的那些  "                 "rtk init"
  "初始化 RTK 到antigravity当前项目"      "rtk init --agent antigravity"
  "初始化 RTK 到pi 全局"             "rtk init -g --agent pi"
  "understande anything skill"           "curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash"
  "把 understande anything skill 从 .gemini 移动到 skill 文件夹下"            "cp -r ~/.agents/skills/und* ./.agents/skills"
  "graphify to antigravity"         "graphify antigravity install"
"herdr,替代tmux"                             "curl -fsSL https://herdr.dev/install.sh | sh"
)

NAMES=()
COMMANDS=()
for ((i=0; i<${#ITEMS[@]}; i+=2)); do
  NAMES+=( "${ITEMS[i]}" )
  COMMANDS+=( "${ITEMS[i+1]}" )
done

# 初始化选中状态（0=未选, 1=已选）
SELECTED=()
for i in "${!NAMES[@]}"; do SELECTED+=( 0 ); done

CURSOR=0
COUNT=${#NAMES[@]}

# ANSI helpers & cleanup
cleanup() {
  stty echo 2>/dev/null
  printf '\033[?25h'
}
trap cleanup EXIT INT TERM

hide_cursor() { tput civis 2>/dev/null || printf '\033[?25l'; }
show_cursor() { tput cnorm 2>/dev/null || printf '\033[?25h'; }

LINES=$(( COUNT + 3 ))

draw_menu() {
  local cols
  cols=$(tput cols 2>/dev/null || echo 80)
  
  printf '\033[%dA' "$LINES"
  printf '\033[2K\r  \033[1;36m请用 ↑↓ 移动，空格选择，回车确认，q 退出\033[0m\n'
  printf '\033[2K\r\n'

  # 全选行
  local all_selected=1
  for s in "${SELECTED[@]}"; do [[ $s -eq 0 ]] && all_selected=0 && break; done
  local all_mark="[ ]"
  [[ $all_selected -eq 1 ]] && all_mark="[\033[32mx\033[0m]"
  if [[ $CURSOR -eq $COUNT ]]; then
    printf '\033[2K\r \033[1;36m>\033[0m %b  \033[1;33m全选/取消全选\033[0m\n' "$all_mark"
  else
    printf '\033[2K\r    %b  全选/取消全选\n' "$all_mark"
  fi

  for i in "${!NAMES[@]}"; do
    local mark="[ ]"
    [[ ${SELECTED[$i]} -eq 1 ]] && mark="[\033[32mx\033[0m]"
    
    # 限制单行长度，防止折行导致渲染错位
    local display_str
    if [[ $i -eq $CURSOR ]]; then
      display_str=$(printf " \033[1;36m>\033[0m %b  \033[1;33m%-24s\033[0m (%s)" "$mark" "${NAMES[$i]}" "${COMMANDS[$i]}")
    else
      display_str=$(printf "    %b  %-24s \033[90m(%s)\033[0m" "$mark" "${NAMES[$i]}" "${COMMANDS[$i]}")
    fi
    printf '\033[2K\r%b\n' "$display_str"
  done
}

stty -echo 2>/dev/null
hide_cursor

# 预先占位空行
for ((i=0; i<LINES; i++)); do echo ""; done

draw_menu

while true; do
  # 读取键盘输入
  IFS= read -rsn1 key
  if [[ $key == $'\x1b' ]]; then
    IFS= read -rsn2 -t 0.1 rest
    key="${key}${rest}"
  fi

  case "$key" in
    $'\x1b[A'|'[A')  # 上键
      (( CURSOR-- ))
      [[ $CURSOR -lt 0 ]] && CURSOR=$(( COUNT ))
      ;;
    $'\x1b[B'|'[B')  # 下键
      (( CURSOR++ ))
      [[ $CURSOR -gt $COUNT ]] && CURSOR=0
      ;;
    ' ')  # 空格
      if [[ $CURSOR -eq $COUNT ]]; then
        # 全选/取消全选
        local_all=1
        for s in "${SELECTED[@]}"; do [[ $s -eq 0 ]] && local_all=0 && break; done
        for i in "${!SELECTED[@]}"; do
          [[ $local_all -eq 1 ]] && SELECTED[$i]=0 || SELECTED[$i]=1
        done
      else
        [[ ${SELECTED[$CURSOR]} -eq 1 ]] && SELECTED[$CURSOR]=0 || SELECTED[$CURSOR]=1
      fi
      ;;
    ''|$'\r'|$'\n')  # 回车
      break
      ;;
    q|Q)
      cleanup
      echo ""
      echo "已取消。"
      exit 0
      ;;
  esac

  draw_menu
done

cleanup
echo ""

# 收集选中项
TO_RUN=()
for i in "${!SELECTED[@]}"; do
  [[ ${SELECTED[$i]} -eq 1 ]] && TO_RUN+=( "$i" )
done

if [[ ${#TO_RUN[@]} -eq 0 ]]; then
  echo "未选择任何项，退出。"
  exit 0
fi

echo "将执行以下安装："
for i in "${TO_RUN[@]}"; do
  echo "  - ${NAMES[$i]} : ${COMMANDS[$i]}"
done
echo ""

FAILED=()
for i in "${TO_RUN[@]}"; do
  echo "▶ 执行 [${NAMES[$i]}]: ${COMMANDS[$i]}"
  if ! eval "${COMMANDS[$i]}"; then
    echo "✗ 失败: ${NAMES[$i]}"
    FAILED+=( "${NAMES[$i]}" )
    echo "安装失败，已停止后续执行。"
    break
  fi
  echo "✓ 完成: ${NAMES[$i]}"
  echo ""
done

echo "=============================="
if [[ ${#FAILED[@]} -eq 0 ]]; then
  echo "✓ 全部安装成功！"
else
  echo "✗ 以下项安装失败: ${FAILED[*]}"
  exit 1
fi
