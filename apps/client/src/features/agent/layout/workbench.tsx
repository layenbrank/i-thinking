/**
 * 主对话区：Bubble.List 流式编排（批量缓冲 + 中止 + 上下文注入 + 部件落库）
 */
import { Bubble, Welcome, type BubbleItemType } from '@ant-design/x'
import { Icon } from '@iconify/react/offline'
import { App } from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useMemo, useRef, useState } from 'react'
import { v4 as UUIDV4 } from 'uuid'

import { Glide } from '@/components/glide/glide'
import { AgentMessage } from '@/features/agent/chat/bubbles'
import { AgentComposer } from '@/features/agent/chat/composer'
import type { SenderChip } from '@/features/agent/chat/sender-trigger'
import type { PlanPaneSource } from '@/features/agent/layout/plan-pane'
import styles from '@/features/agent/layout/workbench.module.scss'
import { runAgentLoop } from '@/features/agent/model/agent-loop'
import { buildReferenceHint } from '@/features/agent/model/agent-tools'
import type { ScenarioKey } from '@/features/agent/model/scenarios'
import {
  applyDiff,
  COMPARE_PROMPT,
  extractLastCodeBlock,
  parseCompare,
  parsePlan,
  parseParts,
  PLAN_PROMPT,
  stringifyParts
} from '@/features/agent/model/tools'
import { findIsPathUnderRoots, normalizePath } from '@/features/agent/model/workspace-path'
import { WorkspaceFiles } from '@/lib/workspace-files'
import { resolveProviderConfig } from '@/features/agent/settings/use-providers'
import type { ChatMessage, FilePartData, MessagePart } from '@/features/agent/types'
import { useCalendarStore } from '@/stores/calendar'
import { useIntelligenceStore, type AiMessage, type AiSession } from '@/stores/intelligence'
import { useProviderStore } from '@/stores/provider'

/** 携带的历史消息上限，防止长会话撑爆上下文 */
const CONTEXT_MESSAGE_LIMIT = 20

const TOOLS_HINT =
  '你可以使用工具读取工作区文件与技能：用户消息中的 @路径 表示文件引用，/名称 表示技能引用，请调用 read_file 或 read_skill，不要臆造文件内容。'

const SYSTEM_PROMPT_MAP: Record<Exclude<ScenarioKey, 'image'>, string> = {
  general: `你是 i-thinking 桌面端的智能助手，回答简洁、结构清晰，涉及代码时使用围栏代码块输出。\n${TOOLS_HINT}`,
  compare: '你是购物与选型顾问，必须按要求以单个 JSON 代码块输出对比结果。',
  plan: '你是时间管理助手，必须按要求以单个 JSON 代码块输出日程计划。',
  code: `你是代码编辑助手。修改代码时，用单个围栏代码块输出修改后的完整文件内容，并简述改动点。\n${TOOLS_HINT}`
}

function findSystemPrompt(scenario: ScenarioKey) {
  if (scenario === 'image') return SYSTEM_PROMPT_MAP.general
  return SYSTEM_PROMPT_MAP[scenario]
}

interface QuickPrompt {
  key: string
  scenario: ScenarioKey
  label: string
  description: string
  icon: string
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    key: 'compare',
    scenario: 'compare',
    label: '对比两款适合办公编程的笔记本，预算五到六千',
    description: '购物选型场景，输出结构化对比表',
    icon: 'ant-design:shopping-cart-outlined'
  },
  {
    key: 'plan',
    scenario: 'plan',
    label: '为我制定明天的工作与休息日程',
    description: '规划一天安排，支持一键写入日历',
    icon: 'ant-design:calendar-outlined'
  },
  {
    key: 'general',
    scenario: 'general',
    label: '总结我附加文件的核心内容',
    description: '附加本地文件后进行分析和摘要',
    icon: 'ant-design:file-text-outlined'
  },
  {
    key: 'code',
    scenario: 'code',
    label: '帮我梳理这段代码的结构并指出可改进点',
    description: '代码阅读与重构建议',
    icon: 'ant-design:code-outlined'
  },
  {
    key: 'image',
    scenario: 'image',
    label: '描述我附加的图片，并给出可用建议',
    description: '图像理解与场景分析',
    icon: 'ant-design:picture-outlined'
  }
]

interface WorkbenchProps {
  className?: string
  scenario: ScenarioKey
  contextFiles: FilePartData[]
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement
  onScenarioChange: (scenario: ScenarioKey) => void
  onContextFilesChange: React.Dispatch<React.SetStateAction<FilePartData[]>>
  onOpenSettings: () => void
  onPlanOpen: (source: PlanPaneSource) => void
}

function AgentWorkbench(props: WorkbenchProps) {
  const { message, modal } = App.useApp()

  const messages = useIntelligenceStore(function (state) {
    return state.messages
  })
  const activeSessionID = useIntelligenceStore(function (state) {
    return state.activeSessionID
  })
  const providers = useProviderStore(function (state) {
    return state.providers
  })
  const activeProviderID = useProviderStore(function (state) {
    return state.activeProviderID
  })

  const [input, updateInput] = useState('')
  const [composerKey, updateComposerKey] = useState(0)
  const scenario = props.scenario
  const [streamingID, updateStreamingID] = useState<string | null>(null)

  /** 流式增量缓冲区：累积后按事件循环批量提交，避免高频渲染 */
  const bufferRef = useRef<{ fragment: string; thinking: string; messageID: string | null }>({
    fragment: '',
    thinking: '',
    messageID: null
  })
  const timerRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sessionMessages = useMemo(
    function () {
      if (!activeSessionID) return []
      return messages.filter(function (item) {
        return item.sessionID === activeSessionID
      })
    },
    [messages, activeSessionID]
  )

  const activeProvider =
    providers.find(function (provider) {
      return provider.id === activeProviderID && provider.enabled
    }) ?? null

  function flushBatchUpdate() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const buffer = bufferRef.current
    if (buffer.messageID) {
      void useIntelligenceStore.getState().toUpdateMessage(
        [
          {
            id: buffer.messageID,
            fragment: buffer.fragment,
            thinking: buffer.thinking || null
          }
        ],
        { skip: true }
      )
    }
  }

  /** 无激活会话时先建一个，返回可用会话 ID */
  async function ensureSession(): Promise<{ id: string; created: boolean }> {
    if (activeSessionID) return { id: activeSessionID, created: false }
    const session: AiSession = {
      id: UUIDV4(),
      title: '新对话 ' + dayjs().format('MM-DD HH:mm'),
      pinned: false,
      workspaceID: useIntelligenceStore.getState().activeWorkspaceID,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await useIntelligenceStore.getState().toWriteSession([session])
    useIntelligenceStore.getState().toReadSession(session.id)
    return { id: session.id, created: true }
  }

  async function handleSubmit(fragment: string, chips: SenderChip[] = []) {
    const text = fragment.trim()
    if (!text || streamingID) return

    if (!activeProvider) {
      message.warning('请先在模型设置中添加并选择模型接入')
      return
    }

    try {
      const { id: sessionID, created } = await ensureSession()

      let userContent = text
      if (scenario === 'compare') userContent = COMPARE_PROMPT + text
      else if (scenario === 'plan') userContent = PLAN_PROMPT + text

      const fileParts: MessagePart[] = props.contextFiles.map(function (file) {
        return { type: 'file', data: file }
      })
      chips.forEach(function (chip) {
        const path = (chip.meta.path || chip.meta.relative || '').replace(/\\/g, '/')
        if (!path) return
        const exists = fileParts.some(function (part) {
          return part.type === 'file' && part.data.path.replace(/\\/g, '/') === path
        })
        if (exists) return
        fileParts.push({
          type: 'file',
          data: {
            path,
            name: chip.meta.name || chip.label || path.split('/').pop() || path
          }
        })
      })

      const refs = fileParts
        .filter(function (part): part is Extract<MessagePart, { type: 'file' }> {
          return part.type === 'file'
        })
        .map(function (part) {
          const chip = chips.find(function (item) {
            return (item.meta.path || '').replace(/\\/g, '/') === part.data.path.replace(/\\/g, '/')
          })
          return {
            kind: chip?.kind === 'skill' ? 'skill' : 'file',
            path: part.data.path,
            label: part.data.name
          }
        })
      const hint = buildReferenceHint(refs)
      // 可见文本入库；引用清单仅附加到当次 transfer（下方再拼）
      const displayFragment = userContent

      updateInput('')
      const attachedSnapshot = props.contextFiles.slice()
      props.onContextFilesChange([])

      const now = Date.now()
      const personal: AiMessage = {
        id: UUIDV4(),
        sessionID,
        createdAt: now,
        updatedAt: now,
        identity: 'user',
        fragment: displayFragment,
        thinking: null,
        parts: stringifyParts(fileParts)
      }
      const assistant: AiMessage = {
        id: UUIDV4(),
        sessionID,
        createdAt: now + 1,
        updatedAt: now + 1,
        identity: 'assistant',
        fragment: '',
        thinking: '',
        parts: null
      }
      await useIntelligenceStore.getState().toWriteMessage([personal])
      await useIntelligenceStore.getState().toWriteMessage([assistant])

      const history = created ? [] : sessionMessages.slice(-CONTEXT_MESSAGE_LIMIT)
      const transferUser = hint ? `${displayFragment}\n\n${hint}` : displayFragment
      const transfer: ChatMessage[] = [
        { role: 'system', content: findSystemPrompt(scenario) },
        ...history.map(function (item) {
          return {
            role: item.identity as ChatMessage['role'],
            content: item.fragment,
            thinking: item.thinking ?? undefined
          }
        }),
        { role: 'user', content: transferUser }
      ]

      const config = await resolveProviderConfig(activeProvider)
      const controller = new AbortController()
      abortRef.current = controller
      updateStreamingID(assistant.id)
      bufferRef.current = { fragment: '', thinking: '', messageID: assistant.id }

      const workspaceFolders = useIntelligenceStore.getState().workspaceFolders
      const activeWorkspaceID = useIntelligenceStore.getState().activeWorkspaceID
      const roots = workspaceFolders
        .filter(function (folder) {
          return folder.workspaceID === activeWorkspaceID
        })
        .map(function (folder) {
          return normalizePath(folder.path)
        })

      const enableTools = scenario === 'general' || scenario === 'code'

      try {
        const result = await runAgentLoop({
          config,
          messages: transfer,
          context: { roots },
          enableTools,
          signal: controller.signal,
          onTextDelta: function (content, thinkingText) {
            bufferRef.current.fragment = content
            bufferRef.current.thinking = thinkingText
            if (timerRef.current === null) {
              timerRef.current = window.setTimeout(flushBatchUpdate, 0)
            }
          },
          onToolPart: function () {
            // 工具态在 finally 前统一落 parts；此处仅推动流式刷新
            if (timerRef.current === null) {
              timerRef.current = window.setTimeout(flushBatchUpdate, 0)
            }
          }
        })
        bufferRef.current.fragment = result.fragment
        bufferRef.current.thinking = result.thinking
        if (result.toolParts.length) {
          await useIntelligenceStore.getState().toUpdateMessage([
            {
              id: assistant.id,
              parts: stringifyParts(result.toolParts),
              updatedAt: Date.now()
            }
          ])
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const reason = error instanceof Error ? error.message : String(error)
          bufferRef.current.fragment += `\n\n> 出错了：${reason}`
        }
      }

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      const finalFragment = bufferRef.current.fragment
      const finalThinking = bufferRef.current.thinking

      const parts: MessagePart[] = []
      const existing = parseParts(
        useIntelligenceStore.getState().messages.find(function (item) {
          return item.id === assistant.id
        })?.parts ?? null
      )
      existing.forEach(function (part) {
        if (part.type === 'tool') parts.push(part)
      })

      if (scenario === 'compare') {
        const compare = parseCompare(finalFragment)
        if (compare) parts.push({ type: 'compare', data: compare })
      } else if (scenario === 'plan') {
        const plan = parsePlan(finalFragment)
        if (plan) {
          parts.push({ type: 'plan', data: plan })
          props.onPlanOpen({
            messageID: assistant.id,
            partIndex: parts.length - 1,
            data: plan
          })
        }
      } else if (scenario === 'code' && attachedSnapshot.length === 1) {
        const after = extractLastCodeBlock(finalFragment)
        const target = attachedSnapshot[0]
        if (after && findIsPathUnderRoots(target.path, roots)) {
          let before: string | undefined
          try {
            before = (await WorkspaceFiles.readFile(roots, target.path)).content
          } catch {
            before = undefined
          }
          parts.push({ type: 'diff', data: { path: target.path, before, after } })
        }
      }

      await useIntelligenceStore.getState().toUpdateMessage([
        {
          id: assistant.id,
          fragment: finalFragment,
          thinking: finalThinking || null,
          parts: stringifyParts(parts),
          updatedAt: Date.now()
        }
      ])
    } catch (error) {
      console.error('[workbench] handleSubmit failed', error)
      message.error('发送失败，请重试')
    } finally {
      bufferRef.current = { fragment: '', thinking: '', messageID: null }
      abortRef.current = null
      updateStreamingID(null)
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
  }

  function handleQuickPrompt(item: QuickPrompt) {
    updateInput(item.label)
    updateComposerKey(function (key) {
      return key + 1
    })
    props.onScenarioChange(item.scenario)
  }

  function handleAttachFile(file: FilePartData) {
    const path = file.path.replace(/\\/g, '/')
    props.onContextFilesChange(function (files) {
      const exists = files.some(function (item) {
        return item.path.replace(/\\/g, '/') === path
      })
      if (exists) return files
      return files.concat([{ ...file, path }])
    })
  }

  function handleRemoveFile(path: string) {
    const normalized = path.replace(/\\/g, '/')
    props.onContextFilesChange(function (files) {
      return files.filter(function (file) {
        return file.path.replace(/\\/g, '/') !== normalized
      })
    })
  }

  async function handleApplyDiff(messageID: string, partIndex: number) {
    const target = useIntelligenceStore.getState().messages.find(function (item) {
      return item.id === messageID
    })
    if (!target) return
    const parts = parseParts(target.parts)
    const part = parts[partIndex]
    if (!part || part.type !== 'diff' || part.data.applied) return
    const workspaceFolders = useIntelligenceStore.getState().workspaceFolders
    const activeWorkspaceID = useIntelligenceStore.getState().activeWorkspaceID
    const roots = workspaceFolders
      .filter(function (folder) {
        return folder.workspaceID === activeWorkspaceID
      })
      .map(function (folder) {
        return normalizePath(folder.path)
      })
    try {
      await applyDiff(part, roots)
      parts[partIndex] = { type: 'diff', data: { ...part.data, applied: true } }
      await useIntelligenceStore.getState().toUpdateMessage([
        { id: messageID, parts: stringifyParts(parts), updatedAt: Date.now() }
      ])
      message.success('修改已写入文件（原文件已备份）')
    } catch (error) {
      console.error('[workbench] applyDiff failed', error)
      message.error('写入失败：' + (error instanceof Error ? error.message : String(error)))
    }
  }

  async function handleTogglePlanItem(messageID: string, partIndex: number, itemIndex: number) {
    const target = useIntelligenceStore.getState().messages.find(function (item) {
      return item.id === messageID
    })
    if (!target) return
    const parts = parseParts(target.parts)
    const part = parts[partIndex]
    if (!part || part.type !== 'plan') return
    const items = part.data.items.map(function (item, index) {
      return index === itemIndex ? { ...item, done: !item.done } : item
    })
    parts[partIndex] = { type: 'plan', data: { ...part.data, items } }
    await useIntelligenceStore.getState().toUpdateMessage([
      { id: messageID, parts: stringifyParts(parts) }
    ])
  }

  async function handleWritePlanToCalendar(messageID: string, partIndex: number) {
    const target = useIntelligenceStore.getState().messages.find(function (item) {
      return item.id === messageID
    })
    if (!target) return
    const parts = parseParts(target.parts)
    const part = parts[partIndex]
    if (!part || part.type !== 'plan') return

    const base = dayjs(part.data.date || undefined).startOf('day')
    let written = 0
    for (const item of part.data.items) {
      let start = base
      if (item.time) {
        const [hour, minute] = item.time.split(':').map(Number)
        start = base.hour(hour || 0).minute(minute || 0)
      }
      const end = item.time ? start.add(30, 'minute') : base.endOf('day')
      const id = await useCalendarStore.getState().toWriteEvent({
        title: item.title,
        notes: '由 Agent 计划生成',
        startAt: start.valueOf(),
        endAt: end.valueOf(),
        entireDay: !item.time
      })
      if (id) written += 1
    }
    if (written) {
      message.success(`已写入 ${written} 条日程到日历`)
    } else {
      message.error('写入日历失败')
    }
  }

  async function handleCopyMessage(messageID: string) {
    const target = useIntelligenceStore.getState().messages.find(function (item) {
      return item.id === messageID
    })
    if (!target) return
    try {
      await navigator.clipboard.writeText(target.fragment)
      message.success('已复制到剪贴板')
    } catch (error) {
      console.error('[workbench] copy message failed', error)
      message.error('复制失败')
    }
  }

  function handleDeleteMessage(messageID: string) {
    modal.confirm({
      title: '删除这条消息？',
      content: '删除后不可恢复。',
      okButtonProps: { danger: true },
      onOk: async function () {
        await useIntelligenceStore.getState().toRemoveMessage([messageID])
      }
    })
  }

  const bubbles: BubbleItemType[] = useMemo(
    function () {
      return sessionMessages.map(function (value) {
        const isUser = value.identity === 'user'
        const isStreaming = streamingID === value.id
        const entry: BubbleItemType = {
          key: value.id,
          role: isUser ? 'user' : 'ai',
          placement: isUser ? 'end' : 'start',
          streaming: isStreaming,
          loading: isStreaming && !value.fragment && !value.thinking,
          content: value.fragment,
          avatar: isUser ? (
            <Icon icon="ant-design:user-outlined" />
          ) : (
            <Icon
              icon="ant-design:robot-outlined"
              style={{ color: 'var(--ith-color-primary)' }}
            />
          ),
          contentRender: function () {
            return (
              <AgentMessage
                message={value}
                streaming={isStreaming}
                onApplyDiff={handleApplyDiff}
                onTogglePlanItem={handleTogglePlanItem}
                onWritePlanToCalendar={handleWritePlanToCalendar}
                onOpenPlanPane={function (messageID, partIndex, data) {
                  props.onPlanOpen({ messageID, partIndex, data })
                }}
                onCopyMessage={handleCopyMessage}
                onDeleteMessage={handleDeleteMessage}
              />
            )
          }
        }
        return entry
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionMessages, streamingID]
  )

  return (
    <div className={props.className}>
      {sessionMessages.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyInner}>
            <Welcome
              variant="borderless"
              className={styles.welcome}
              classNames={{
                title: styles.welcomeTitle,
                description: styles.welcomeDesc,
                icon: styles.emptyIcon
              }}
              icon={<Icon icon="ant-design:robot-outlined" />}
              title="你好，我是 i-thinking 智能助手"
              description="聊天、文件分析、代码编辑、图像理解、商品对比与日程规划，开箱即用"
            />
            <div className={clsx(styles.prompts, styles.promptReveal)}>
              <div className={styles.promptsTitle}>可以试试</div>
              <Glide.X
                classNames={{
                  root: styles.promptsGlide,
                  inner: styles.promptsTrack
                }}>
                {QUICK_PROMPTS.map(function (item) {
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={styles.promptCard}
                      onClick={function () {
                        handleQuickPrompt(item)
                      }}>
                      <span className={styles.promptIcon}>
                        <Icon
                          icon={item.icon}
                          width={16}
                          height={16}
                        />
                      </span>
                      <span className={styles.promptBody}>
                        <span className={styles.promptLabel}>{item.label}</span>
                        <span className={styles.promptDesc}>{item.description}</span>
                      </span>
                    </button>
                  )
                })}
              </Glide.X>
            </div>
          </div>
        </div>
      ) : (
        <Bubble.List
          items={bubbles}
          autoScroll
          className={styles.bubbles}
        />
      )}
      <div className={styles.composer}>
        <AgentComposer
          key={composerKey}
          value={input}
          loading={Boolean(streamingID)}
          scenario={scenario}
          files={props.contextFiles}
          getPopupContainer={props.getPopupContainer}
          onChange={updateInput}
          onAttach={handleAttachFile}
          onRemoveFile={handleRemoveFile}
          onOpenSettings={props.onOpenSettings}
          onSubmit={function (fragment, chips) {
            void handleSubmit(fragment, chips)
          }}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}

export { AgentWorkbench }
export type { WorkbenchProps }
