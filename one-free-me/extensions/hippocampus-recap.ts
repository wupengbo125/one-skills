// @hippocampus-recap-extension
// OMP / Pi Agent 项目级自动海马体记忆沉淀扩展
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface ConversationTurn {
  role: 'user' | 'assistant'
  text: string
  time: number
}

interface SessionMemoryState {
  sessionId: string
  topic?: string
  filename?: string
  monthStr?: string
  relPath?: string
  fullPath?: string
  lastSummary?: string
  processedCount: number
  hasMeaningfulAction: boolean
}

const HIPPOCAMPUS_DIR =
  process.env.ONE_HIPPOCAMPUS_DIR ||
  path.join(process.env.HOME || '/home/ctyun', 'onespace/github/one-hippocampus')
const FREE_ME_SCRIPT = path.join(
  process.env.HOME || '/home/ctyun',
  'onespace/github/one-skills/one-free-me/scripts/free_me.py'
)
const IDLE_SECONDS = parseInt(process.env.RECAP_IDLE_SECONDS || '90', 10)
const GATEWAY_URL = process.env.RECAP_GATEWAY_URL || 'http://127.0.0.1:20128/v1'
const API_KEY = process.env.RECAP_API_KEY || 'sk-5e2af274e0e4e907-8a950e-46823488'
const CANDIDATE_MODELS = ['auto/claude-sonnet', 'auto/best-coding']

const sessionStates = new Map<string, SessionMemoryState>()
const sessionHistories = new Map<string, ConversationTurn[]>()
let idleTimer: ReturnType<typeof setTimeout> | null = null
let isPersisting = false

function getSessionId(ctx: any): string {
  try {
    const id = ctx?.sessionManager?.getSessionId?.()
    if (typeof id === 'string' && id) return id
  } catch {}
  return 'default-session'
}

function getOrCreateState(sessionId: string): SessionMemoryState {
  let state = sessionStates.get(sessionId)
  if (!state) {
    state = {
      sessionId,
      processedCount: 0,
      hasMeaningfulAction: false,
    }
    sessionStates.set(sessionId, state)
  }
  return state
}

function getHistory(sessionId: string): ConversationTurn[] {
  let history = sessionHistories.get(sessionId)
  if (!history) {
    history = []
    sessionHistories.set(sessionId, history)
  }
  return history
}

function extractAssistantText(message: unknown): string {
  if (!message || typeof message !== 'object') return ''
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  let out = ''
  for (const part of content) {
    if (part && typeof part === 'object' && (part as { type?: unknown }).type === 'text') {
      const text = (part as { text?: unknown }).text
      if (typeof text === 'string') out += text
    }
  }
  return out
}

function loadPromptTemplate(): { system: string; initial: string; update: string } {
  const candidatePaths = [
    path.join(__dirname, 'recap-prompt.md'),
    path.join(
      process.env.HOME || '/home/ctyun',
      'onespace/github/one-skills/one-free-me/extensions/recap-prompt.md'
    ),
    path.join(process.cwd(), '.omp/extensions/recap-prompt.md'),
  ]

  let content = ''
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        content = fs.readFileSync(p, 'utf-8')
        if (content.trim()) break
      } catch {}
    }
  }

  if (content) {
    const parts = content.split(/\n---\s*\n/)
    if (parts.length >= 3) {
      return {
        system: parts[0].replace(/^#.*\n?/, '').trim(),
        initial: parts[1].replace(/^#.*\n?/, '').trim(),
        update: parts[2].replace(/^#.*\n?/, '').trim(),
      }
    }
  }

  return {
    system: `你是海马体情景记忆沉淀引擎。将对话复盘整理为标准情景记忆。
必须返回纯 JSON 格式：
{
  "topic": "简短中文主题（4-12字，不得有标点空格）",
  "brief": "单行大纲简介（20-40字）",
  "markdown": "Markdown 正文"
}

Markdown 正文格式遵循极简规范：
# <中文主题> ({{TODAY}})

## 一、 会话背景与目标
- 目标与诉求

## 二、 核心决策与过程复盘
1. 步骤与关键技术点
2. 遇到什么坑、如何解决

## 三、 落地结果与当前状态
- 具体改动的文件与资产状态`,
    initial: `对话与操作历史：\n<history>\n{{HISTORY}}\n</history>\n\n请总结为标准情景记忆。`,
    update: `这是该会话之前的记忆文档：\n<prev_memory>\n{{PREV_MEMORY}}\n</prev_memory>\n\n后续新增的对话与操作如下：\n<new_turns>\n{{HISTORY}}\n</new_turns>\n\n请在原记忆基础上进行增量演进更新。保持主题一致，合并更新落地结果与过程复盘，输出更新后的全文与单行大纲。`,
  }
}

async function callLlm(messages: Array<{ role: string; content: string }>): Promise<string> {
  for (const model of CANDIDATE_MODELS) {
    try {
      const resp = await fetch(`${GATEWAY_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 2000,
        }),
      })
      if (!resp.ok) continue
      const data: any = await resp.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string' && content.trim()) {
        return content.trim()
      }
    } catch {}
  }
  throw new Error('All candidate models failed')
}

function sanitizeTopic(topic: string): string {
  return topic
    .replace(/[\\/:*?"<>|#\s`\[\]]/g, '')
    .trim()
    .slice(0, 24)
}

function updateMonthlyIndex(monthDir: string, topic: string, filename: string, brief: string, now: Date): void {
  const indexFile = path.join(monthDir, 'index.md')
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 5)
  const entryLine = `- \`${dateStr} ${timeStr}\`：[${topic}](${filename}) - ${brief}`

  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(indexFile, `# 历史流水日志 (History Log)\n\n${entryLine}\n`, 'utf-8')
    return
  }

  const content = fs.readFileSync(indexFile, 'utf-8')
  const lines = content.split(/\r?\n/)
  let replaced = false
  const updatedLines = lines.map((line) => {
    if (line.includes(`(${filename})`)) {
      replaced = true
      return entryLine
    }
    return line
  })

  if (!replaced) {
    updatedLines.push(entryLine)
  }

  fs.writeFileSync(indexFile, updatedLines.join('\n'), 'utf-8')
}

async function persistMemory(ctx: any, isManual = false): Promise<void> {
  if (isPersisting) return
  const sessionId = getSessionId(ctx)
  const state = getOrCreateState(sessionId)
  const history = getHistory(sessionId)

  if (!isManual) {
    if (!state.hasMeaningfulAction && history.length < 2) return
    if (history.length <= state.processedCount) return
  }

  isPersisting = true
  try {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const monthStr = today.slice(0, 7) // YYYY-MM
    const recentHistory = history.slice(-20)
    const historyText = recentHistory
      .map((t) => `[${t.role}]: ${t.text.slice(0, 500)}`)
      .join('\n\n')

    const isUpdate = Boolean(state.lastSummary && state.relPath)

    const tpls = loadPromptTemplate()
    const systemPrompt = tpls.system.replace(/\{\{TODAY\}\}/g, today)

    let userPrompt = ''
    if (isUpdate) {
      userPrompt = tpls.update
        .replace(/\{\{PREV_MEMORY\}\}/g, state.lastSummary!)
        .replace(/\{\{HISTORY\}\}/g, historyText)
    } else {
      userPrompt = tpls.initial.replace(/\{\{HISTORY\}\}/g, historyText)
    }

    const rawResponse = await callLlm([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    let parsed: { topic?: string; brief?: string; markdown?: string } = {}
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {}

    const topic = sanitizeTopic(parsed.topic || state.topic || '任务复盘')
    const brief = (parsed.brief || topic).replace(/[\r\n]+/g, ' ').trim()
    const markdown = (parsed.markdown || rawResponse).trim()

    const monthDir = path.join(HIPPOCAMPUS_DIR, 'memory', state.monthStr || monthStr)
    fs.mkdirSync(monthDir, { recursive: true })

    if (!state.relPath) {
      const filename = `${today}_${topic}.md`
      state.monthStr = monthStr
      state.filename = filename
      state.relPath = `memory/${monthStr}/${filename}`
      state.fullPath = path.join(HIPPOCAMPUS_DIR, state.relPath)
      state.topic = topic
    }

    // 1. 原地写/更新 Markdown 长文
    fs.writeFileSync(state.fullPath!, markdown, 'utf-8')

    // 2. 原地更新月度流水日志 index.md
    updateMonthlyIndex(monthDir, topic, state.filename!, brief, now)

    // 3. 调用 free_me.py recent 记录活跃流水打卡与治理
    if (fs.existsSync(FREE_ME_SCRIPT)) {
      try {
        execSync(`python3 "${FREE_ME_SCRIPT}" recent "${topic}" "${state.relPath}"`, {
          stdio: 'ignore',
        })
      } catch {}
      try {
        execSync(`python3 "${FREE_ME_SCRIPT}" sync "${state.relPath}"`, {
          stdio: 'ignore',
        })
      } catch {}
    }

    // 4. 海马体本地 git 提交
    try {
      execSync(`git -C "${HIPPOCAMPUS_DIR}" add .`, { stdio: 'ignore' })
      execSync(
        `git -C "${HIPPOCAMPUS_DIR}" commit -m "chore(memory): ${isUpdate ? 'update' : 'recap'} ${topic}"`,
        { stdio: 'ignore' }
      )
    } catch {}

    // 5. 更新会话状态
    state.lastSummary = markdown
    state.processedCount = history.length
    state.hasMeaningfulAction = false

    // 6. 终端极简通知
    try {
      ctx?.ui?.notify?.(`⚡ 海马体记忆已${isUpdate ? '更新' : '沉淀'}: ${topic}`, 'info')
    } catch {}
  } catch (err) {
  } finally {
    isPersisting = false
  }
}

export default function (pi: any): void {
  try {
    pi.registerCommand?.('recap-memory', {
      description: '手动触发当前会话记忆沉淀到海马体',
      handler: async (_args: any, ctx: any) => {
        await persistMemory(ctx, true)
      },
    })
  } catch {}

  pi.on('before_agent_start', (event: any, ctx: any) => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
    const sessionId = getSessionId(ctx)
    const history = getHistory(sessionId)
    if (event?.prompt) {
      history.push({ role: 'user', text: String(event.prompt), time: Date.now() })
    }
  })

  pi.on('tool_execution_start', (_event: any, ctx: any) => {
    const sessionId = getSessionId(ctx)
    const state = getOrCreateState(sessionId)
    state.hasMeaningfulAction = true
  })

  pi.on('message_end', (event: any, ctx: any) => {
    if (event?.message?.role !== 'assistant') return
    const text = extractAssistantText(event.message)
    if (!text) return
    const sessionId = getSessionId(ctx)
    const history = getHistory(sessionId)
    history.push({ role: 'assistant', text, time: Date.now() })
  })

  pi.on('agent_settled', (_event: any, ctx: any) => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      idleTimer = null
      void persistMemory(ctx, false)
    }, IDLE_SECONDS * 1000)
    if (typeof idleTimer.unref === 'function') idleTimer.unref()
  })

  pi.on('session_shutdown', (_event: any, ctx: any) => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
    void persistMemory(ctx, false)
  })
}
