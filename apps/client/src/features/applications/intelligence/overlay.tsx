import {
  AppstoreAddOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  FieldTimeOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  GithubOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  RocketOutlined,
  SmileOutlined,
  UserOutlined,
  WarningOutlined
} from '@ant-design/icons'
import {
  Bubble,
  CodeHighlighter,
  Conversations,
  Prompts,
  Sender,
  Suggestion,
  Think,
  ThoughtChain,
  XProvider,
  type BubbleItemType,
  type ConversationItemType,
  type ConversationsProps,
  type PromptsItemType,
  type ThoughtChainItemType
} from '@ant-design/x'
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown'
import type { SkillType, SlotConfigType } from '@ant-design/x/es/sender/interface'
import type { SuggestionItem } from '@ant-design/x/es/suggestion'
import { Divider, Flex, FloatButton, message, theme, Typography, type GetProp } from 'antd'
import clsx from 'clsx'
import { vs as VSCODE } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { v4 as UUIDV4 } from 'uuid'

import { timeSphere } from '@i-thinking/utils'

import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence.ts'
import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/intelligence/overlay.module.scss'
import { session$, useIntelligenceStore as store } from '@/stores/intelligence.ts'

type AiSession = Application.Intelligence.AiSession
type AiMessage = Application.Intelligence.AiMessage
type CommunicateMessage = Application.Intelligence.Communicate.Message
// type CommunicateIdentity = Application.Intelligence.Communicate.Identity
// type BubbleContentType = BubbleProps['contentRender']

// interface Props {}

const CodeBlock: React.FC<ComponentProps> = function (props) {
  const { className, children } = props
  const lang = className?.match(/language-(\w+)/)?.[1] || ''

  if (typeof children !== 'string') return null
  return (
    <CodeHighlighter
      highlightProps={{
        // style: vscDarkPlus
        style: VSCODE,
        customStyle: {
          border: 'none'
        }
      }}
      lang={lang}>
      {children}
    </CodeHighlighter>
  )
}

const groupName = ['今天', '昨天', '历史']
const items: GetProp<ConversationsProps, 'items'> = Array.from({
  length: 9
}).map((_, index) => ({
  key: `item${index + 1}`,
  label: `Conversation Item ${index + 1}`,
  group: groupName[index % 3]
}))

export default function Overlay(props: OverlayControlProps) {
  const { token } = theme.useToken()
  const { visible, onUpdateVisible } = useContext(OverlayContext)
  const { onAbort } = props
  const overlayRef = useRef<HTMLDivElement>(null)
  const [fullscreen, updateFullscreen] = useState(false)
  const [sender, updateSender] = useState('')
  const messages = store((state) => state.messages)
  const sessions = store((state) => state.sessions)
  const done = useRef(false)
  const [thinking, updateThinking] = useState(false)
  const [expandedThinking, updateExpandedThinking] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 流式消息更新批处理缓冲区
   * 使用 ref 存储累积的内容，避免频繁触发 React 渲染
   * 解决高频更新导致的 "Maximum update depth exceeded" 错误
   */
  const msgBufferRef = useRef<{
    fragment: string
    thinking: string
    messageId: string | null
  }>({
    fragment: '',
    thinking: '',
    messageId: null
  })

  /**
   * 批量更新定时器引用
   * 确保同一事件循环中只注册一个定时器，避免重复提交
   */
  const updateTimerRef = useRef<number | null>(null)

  const [prompt, updatePrompt] = useState<PromptsItemType>()
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['今天'])

  // 用于平滑滚动的 ref
  const scrollRef = useRef<{
    container: HTMLElement | null
    accumulated: number
    rafID: number | null
  }>({
    container: null,
    accumulated: 0,
    rafID: null
  })

  const bubbles: BubbleItemType[] = useMemo(
    function () {
      return messages.map(function (value) {
        const entry: BubbleItemType = {
          key: value.id,
          role: value.identity,
          streaming: true,
          placement: value.identity === 'user' ? 'end' : 'start',
          content: value.fragment,
          contentRender(content, info) {
            // <XMarkdown
            //   content={content}
            //   components={{ code: CodeBlock }}
            // />
            return (
              <Typography>
                {value.thinking && value.identity === 'assistant' && (
                  <Think
                    blink
                    loading={thinking}
                    expanded={expandedThinking}
                    onExpand={updateExpandedThinking}>
                    {value.thinking}
                  </Think>
                )}
                <XMarkdown
                  content={content}
                  components={{ code: CodeBlock }}
                />
              </Typography>
            )
          },
          avatar:
            value.identity === 'user' ? (
              <UserOutlined />
            ) : (
              <RobotOutlined style={{ color: '#1677ff' }} />
            )
        }
        return entry
      })
    },
    [messages, thinking, expandedThinking]
  )

  const prompts: PromptsItemType[] = [
    {
      key: '1',
      icon: <BulbOutlined style={{ color: '#FFD700' }} />,
      label: 'Ignite Your Creativity',
      description: 'Got any sparks for a new project?'
    },
    {
      key: '2',
      icon: <InfoCircleOutlined style={{ color: '#1890FF' }} />,
      label: 'Uncover Background Info',
      description: 'Help me understand the background of this topic.'
    },
    {
      key: '3',
      icon: <RocketOutlined style={{ color: '#722ED1' }} />,
      label: 'Efficiency Boost Battle',
      description: 'How can I work faster and better?'
    },
    {
      key: '4',
      icon: <SmileOutlined style={{ color: '#52C41A' }} />,
      label: 'Tell me a Joke',
      description: 'Why do not ants get sick? Because they have tiny ant-bodies!'
    },
    {
      key: '5',
      icon: <WarningOutlined style={{ color: '#FF4D4F' }} />,
      label: 'Common Issue Solutions',
      description: 'How to solve common issues? Share some tips!'
    }
  ]
  const suggestions: SuggestionItem[] = [
    {
      label: 'Write a report',
      value: 'report'
    }
  ]

  // const conversations: ConversationItemType[] = Array.from({ length: 9 }).map(
  //   function (_, index) {
  //     return {
  //       key: `item${index + 1}`,
  //       label: `Conversation Item ${index + 1}`,
  //       group: groupName[index % 3],
  //       icon: index % 2 === 0 ? <GithubOutlined /> : <AlipayCircleOutlined />
  //     }
  //   }
  // )

  const conversations: ConversationItemType[] = useMemo(
    function () {
      return sessions.map(function (session, index) {
        return {
          key: session.id,
          label: session.title,
          group: timeSphere.isToday(session.updatedAt)
            ? '今天'
            : timeSphere.isYesterday(session.updatedAt)
              ? '昨天'
              : '历史',
          icon: <GithubOutlined />,
          updatedAt: session.updatedAt
        }
      })
      // .toSorted(function (a, b) {
      //   return b.updatedAt - a.updatedAt
      // })
    },
    [sessions]
  )

  const thoughtChains: ThoughtChainItemType[] = useMemo(function () {
    return [
      {
        title: 'Hello Ant Design X!',
        status: 'success',
        description: 'status: success',
        icon: <CheckCircleOutlined />,
        content: 'Ant Design X help you build AI chat/platform app as ready-to-use 📦.'
      },
      {
        title: 'Hello World!',
        status: 'success',
        description: 'status: success',
        icon: <CheckCircleOutlined />
      },
      {
        title: 'Pending...',
        status: 'loading',
        description: 'status: pending',
        icon: <LoadingOutlined />
      }
    ]
  }, [])

  const groupable: ConversationsProps['groupable'] = useMemo(
    function () {
      return {
        label: (group) => {
          return (
            <Flex gap="small">
              <FieldTimeOutlined />
              {group}
            </Flex>
          )
        },
        collapsible(group) {
          return groupName.includes(group)
        },
        expandedKeys: expandedKeys,
        onExpand: setExpandedKeys
      }
    },
    [expandedKeys]
  )

  function handlePrompt({ data }: { data: PromptsItemType }) {
    updatePrompt(data)
    console.log('[handlePrompt]', data)
    if (data.label) updateSender(data.label.toString())
  }

  function handleSender(value: string, onTrigger: (value?: boolean) => void) {
    if (value === '/') onTrigger()
    else if (!value) onTrigger(false)
    updateSender(value)
  }

  function handleKeyDown(
    event: React.KeyboardEvent<Element>,
    onKeyDown: (event: React.KeyboardEvent<Element>) => void
  ) {
    onKeyDown(event)
    console.log('event', event.key, 'onKeyDown', onKeyDown)
  }

  async function handleSubmit(fragment: string, slot?: SlotConfigType[], skill?: SkillType) {
    try {
      // 立即重置输入框，提供即时反馈
      updateSender('')

      if (!session$.value?.id) return message.error('请先选择一个会话')

      // 创建用户消息
      const personal: AiMessage = {
        // id: crypto.randomUUID(),
        id: UUIDV4(),
        sessionID: session$.value?.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        identity: 'user',
        fragment: fragment,
        thinking: null
      }

      // 创建助手消息（初始为空）
      const assistant: AiMessage = {
        id: UUIDV4(),
        sessionID: session$.value?.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        identity: 'assistant',
        fragment: '',
        thinking: ''
      }
      // 构建消息列表（包含用户消息），在更新状态之前构建
      const transferMSG: CommunicateMessage[] = messages.concat([personal]).map(function (value) {
        return {
          role: value.identity,
          content: value.fragment,
          thinking: value.thinking ?? undefined
        }
      })

      // 使用函数式更新添加用户消息和空的助手消息
      await store.getState().toInsertMessage([personal])
      await store.getState().toInsertMessage([assistant])
      done.current = false
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      const generators = GeneratorJSON(
        POST_COMMUNICATE.bind(
          null,
          {
            model: 'qwen3:8b',
            raw: true,
            stream: true,
            messages: transferMSG
          },
          {
            signal: controller.signal
          }
        )
      )

      /**
       * 批量提交累积的消息内容到 store
       * 使用 setTimeout(..., 0) 将多次更新合并为一次，避免高频更新导致 React 报错
       */
      function flushBatchUpdate() {
        // 清理已注册的定时器
        if (updateTimerRef.current !== null) {
          clearTimeout(updateTimerRef.current)
          updateTimerRef.current = null
        }

        const buffer = msgBufferRef.current
        if (buffer.messageId) {
          // 一次性提交所有累积的内容（跳过数据库更新，仅更新 UI）
          void store.getState().toUpdateMessage(
            [
              {
                id: buffer.messageId,
                fragment: buffer.fragment,
                thinking: buffer.thinking || null
              }
            ],
            {
              skip: true
            }
          )
        }
      }

      // 初始化消息缓冲区
      msgBufferRef.current = {
        fragment: '',
        thinking: '',
        messageId: assistant.id
      }

      updateThinking(true)
      // 流式接收并批处理更新消息
      for await (const generator of generators) {
        if (controller.signal.aborted) break
        const { message: msg } = generator
        const { content, thinking } = msg

        // 累积内容到缓冲区（不触发渲染）
        if (thinking) msgBufferRef.current.thinking += thinking
        if (content) msgBufferRef.current.fragment += content

        // 如果还没有注册定时器，则在下一个事件循环中批量提交
        // 这样可以将同一事件循环中的所有更新合并为一次
        if (updateTimerRef.current === null) {
          updateTimerRef.current = window.setTimeout(flushBatchUpdate, 0)
        }
      }

      // 流式更新结束，清理定时器
      if (updateTimerRef.current !== null) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }

      if (controller.signal.aborted) return

      // 最终更新：包含数据库写入（持久化）
      const finalBuffer = msgBufferRef.current
      await store.getState().toUpdateMessage([
        {
          id: assistant.id,
          fragment: finalBuffer.fragment,
          thinking: finalBuffer.thinking || null,
          updatedAt: Date.now()
        }
      ])

      // 重置缓冲区
      msgBufferRef.current = {
        fragment: '',
        thinking: '',
        messageId: null
      }
    } catch (error) {
      console.error('[handleSubmit]', error)
    } finally {
      done.current = true
      updateThinking(false)
      if (abortControllerRef.current) {
        abortControllerRef.current = null
      }
    }
  }

  const handleAbort = useCallback(
    async function () {
      if (updateTimerRef.current !== null) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }

      msgBufferRef.current = {
        fragment: '',
        thinking: '',
        messageId: null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      done.current = true
      updateThinking(false)

      if (onAbort) {
        await onAbort()
      }
    },
    [onAbort]
  )

  function handleActiveKey(key: string) {
    void store.getState().toReadSession(key)
  }

  async function handleInsertSession() {
    const sessionID = UUIDV4()
    const session: AiSession = {
      id: sessionID,
      title: '新对话' + (sessions.length + 1),
      pinned: false,
      collectionID: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
      // updatedAt: timeSphere.decrement(Date.now(), 2, 'day').valueOf()
    }
    await store.getState().toInsertSession([session])
    void store.getState().toReadSession(sessionID)
  }

  // 使用 useEffect 添加非被动的事件监听器
  useEffect(function () {
    const container = overlayRef.current
    if (!container) return

    // 在 useEffect 内部定义处理函数，确保函数引用稳定
    function handleWheel(event: WheelEvent) {
      const target = event.target as HTMLElement
      if (!target) return

      // 查找 Prompts 列表容器
      const closest = target.closest<HTMLElement>('.ant-prompts-list')
      if (!closest) return

      // 检查是否可以横向滚动
      const canXScroll = closest.scrollWidth > closest.clientWidth
      if (!canXScroll) return

      // 优先使用水平滚轮（deltaY），如果没有则直接使用垂直滚轮（deltaY）转换为横向滚动
      const deltaY = event.deltaY

      if (!deltaY) return

      // 阻止默认行为
      event.preventDefault()
      event.stopPropagation()

      // 如果容器改变，重置状态
      if (scrollRef.current.container !== closest) {
        // 取消之前的动画帧
        if (scrollRef.current.rafID) {
          cancelAnimationFrame(scrollRef.current.rafID)
        }
        scrollRef.current.container = closest
        scrollRef.current.accumulated = 0
      }

      // 累积滚动量
      scrollRef.current.accumulated += deltaY

      // 如果已经有动画帧在运行，直接返回（让动画帧处理累积的滚动）
      if (scrollRef.current.rafID) return

      // 使用 requestAnimationFrame 实现平滑滚动
      function smoothScroll() {
        const container = scrollRef.current.container
        if (!container) return (scrollRef.current.rafID = null)

        // 应用累积的滚动量（使用缓动函数）
        const amount = scrollRef.current.accumulated * 0.3
        scrollRef.current.accumulated -= amount

        // 更新滚动位置
        container.scrollLeft += amount

        // 如果还有累积的滚动量，继续动画
        if (Math.abs(scrollRef.current.accumulated) > 0.1) {
          scrollRef.current.rafID = requestAnimationFrame(smoothScroll)
        } else {
          scrollRef.current.accumulated = 0
          scrollRef.current.rafID = null
        }
      }

      // 启动滚动动画
      scrollRef.current.rafID = requestAnimationFrame(smoothScroll)
    }

    // 添加事件监听器，设置 passive: false 以允许 preventDefault
    // 使用捕获阶段确保事件能够被捕获
    console.log('[handleWheel]', container)
    container.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true
    })

    return function () {
      // 清理：移除事件监听器
      container.removeEventListener('wheel', handleWheel, {
        capture: true
      })
      // 清理：取消动画帧
      if (scrollRef.current.rafID !== null) {
        cancelAnimationFrame(scrollRef.current.rafID)
      }
    }
  }, [])

  useEffect(
    function () {
      console.log('[sessions]', sessions)
    },
    [sessions]
  )

  return (
    <Application.Overlay
      style={{
        minWidth: '800px'
      }}
      cache={props.cache}
      onAbort={handleAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      fullscreen={fullscreen}
      wrapClassName={styles.rootTop}
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <XProvider direction="ltr">
        <Flex
          gap={12}
          className={clsx(styles.section, styles.flex)}>
          {/* 历史记录列表 */}
          <Conversations
            creation={{
              label: '开启新对话',
              align: 'start',
              onClick: handleInsertSession,
              icon: <AppstoreAddOutlined />
            }}
            activeKey={session$.value?.id}
            items={conversations}
            defaultActiveKey={session$.value?.id}
            onActiveChange={handleActiveKey}
            style={{
              '--background-color': token.colorBgContainer,
              '--radius': `${token.borderRadius}px`
            }}
            groupable={groupable}
            className={clsx(styles.section, styles.conversations)}
          />
          <Divider
            orientation="vertical"
            className={styles.divider}
          />

          <Flex
            vertical
            justify="space-between"
            gap={16}
            className={clsx([styles.section, styles.communicate])}>
            <Bubble.List
              items={bubbles}
              rootClassName={clsx(styles.bubble, styles.root)}
            />

            <Flex
              vertical
              gap={12}>
              <Prompts
                title="✨ Inspirational Sparks and Marvelous Tips"
                items={prompts}
                onItemClick={handlePrompt}
              />
              <Suggestion items={suggestions}>
                {function ({ onTrigger, onKeyDown }) {
                  return (
                    <Sender
                      value={sender}
                      onKeyDown={(event) => handleKeyDown(event, onKeyDown)}
                      onSubmit={handleSubmit}
                      className={styles.sender}
                      placeholder='Type "/" to trigger suggestion'
                      onChange={(value) => handleSender(value, onTrigger)}
                    />
                  )
                }}
              </Suggestion>
            </Flex>
          </Flex>
          <Divider
            orientation="vertical"
            className={styles.divider}
          />
          <ThoughtChain
            items={thoughtChains}
            className={clsx([styles.thought, styles.chain])}
          />
        </Flex>
        <FloatButton.Group
          trigger="click"
          className={clsx(styles.float, styles.group)}
          icon={<CustomerServiceOutlined />}>
          <FloatButton
            onClick={() => updateFullscreen(!fullscreen)}
            icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          />
          <FloatButton icon={<CommentOutlined />} />
        </FloatButton.Group>
      </XProvider>
    </Application.Overlay>
  )
}
