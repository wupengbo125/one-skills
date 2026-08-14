#!/bin/bash
# NPX Skill 交互式多选安装脚本

COMMANDS=(
  "npx -y skills@latest add mattpocock/skills"
  "npx -y skills@latest add Agents365-ai/365-skills"
  "npx skills add OthmanAdi/planning-with-files --skill planning-with-files "
  "curl -fsSL https://pi.dev/install.sh | sh"
)

# 初始化选中状态（0=未选, 1=已选）
SELECTED=()
for i in "${!COMMANDS[@]}"; do SELECTED+=( 0 ); done

CURSOR=0
COUNT=${#COMMANDS[@]}

# ANSI helpers
hide_cursor() { printf '\033[?25l'; }
show_cursor() { printf '\033[?25h'; }
move_up()     { printf '\033[%dA' "$1"; }

draw_menu() {
  echo "  请用 ↑↓ 移动，空格选择，回车确认，q 退出"
  echo ""
  # 全选行
  local all_selected=1
  for s in "${SELECTED[@]}"; do [[ $s -eq 0 ]] && all_selected=0 && break; done
  local all_mark="[ ]"
  [[ $all_selected -eq 1 ]] && all_mark="[x]"
  if [[ $CURSOR -eq $COUNT ]]; then
    printf '\033[7m  %s  全选/取消全选\033[0m\n' "$all_mark"
  else
    printf '  %s  全选/取消全选\n' "$all_mark"
  fi
  for i in "${!COMMANDS[@]}"; do
    local mark="[ ]"
    [[ ${SELECTED[$i]} -eq 1 ]] && mark="[x]"
    if [[ $i -eq $CURSOR ]]; then
      printf '\033[7m  %s  %s\033[0m\n' "$mark" "${COMMANDS[$i]}"
    else
      printf '  %s  %s\n' "$mark" "${COMMANDS[$i]}"
    fi
  done
}

LINES=$(( COUNT + 3 ))

hide_cursor
draw_menu

while true; do
  # 读取键盘输入
  IFS= read -rsn1 key
  if [[ $key == $'\x1b' ]]; then
    IFS= read -rsn2 rest
    key="${key}${rest}"
  fi

  move_up "$LINES"

  case "$key" in
    $'\x1b[A')  # 上键
      (( CURSOR-- ))
      [[ $CURSOR -lt 0 ]] && CURSOR=$(( COUNT ))
      ;;
    $'\x1b[B')  # 下键
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
    '')  # 回车
      break
      ;;
    q|Q)
      show_cursor
      echo ""
      echo "已取消。"
      exit 0
      ;;
  esac

  draw_menu
done

show_cursor
echo ""

# 收集选中项
TO_RUN=()
for i in "${!SELECTED[@]}"; do
  [[ ${SELECTED[$i]} -eq 1 ]] && TO_RUN+=( "$i" )
done

if [[ ${#TO_RUN[@]} -eq 0 ]]; then
  echo "未选择任何源，退出。"
  exit 0
fi

echo "将执行以下安装："
for i in "${TO_RUN[@]}"; do
  echo "  - ${COMMANDS[$i]}"
done
echo ""

FAILED=()
for i in "${TO_RUN[@]}"; do
  echo "▶ 执行: ${COMMANDS[$i]}"
  if ! eval "${COMMANDS[$i]}"; then
    echo "✗ 失败: ${COMMANDS[$i]}"
    FAILED+=( "${COMMANDS[$i]}" )
    echo "安装失败，已停止后续执行。"
    break
  fi
  echo "✓ 完成: ${COMMANDS[$i]}"
  echo ""
done

echo "=============================="
if [[ ${#FAILED[@]} -eq 0 ]]; then
  echo "✓ 全部安装成功！"
else
  echo "✗ 以下源安装失败: ${FAILED[*]}"
  exit 1
fi