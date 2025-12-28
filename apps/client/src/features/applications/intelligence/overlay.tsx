import {
  AlipayCircleOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  GithubOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  RocketOutlined,
  SmileOutlined,
  UserOutlined,
  WarningOutlined,
  FieldTimeOutlined
} from '@ant-design/icons'
import {
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Suggestion,
  ThoughtChain,
  XProvider,
  CodeHighlighter,
  type BubbleItemType,
  type ConversationsProps,
  type BubbleProps,
  type ConversationItemType,
  type PromptsItemType,
  type ThoughtChainItemType
} from '@ant-design/x'
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown'
import { materialDark, oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { SkillType, SlotConfigType } from '@ant-design/x/es/sender/interface'
import type { SuggestionItem } from '@ant-design/x/es/suggestion'
import { Card, Divider, Flex, FloatButton, type GetProp, theme } from 'antd'
import clsx from 'clsx'

import { Scroll } from '@/components/scroll/scroll.tsx'
import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence.ts'
import { Application } from '@/features/application/application.tsx'
import styles from '@/features/applications/intelligence/overlay.module.scss'
import { SESSIONS } from './constant.ts'

type AiMessage = Application.Intelligence.AiMessage
type CommunicateMessage = Application.Intelligence.Communicate.Message
type CommunicateIdentity = Application.Intelligence.Communicate.Identity
type BubbleContentType = BubbleProps['contentRender']

interface Props {
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}

const Code: React.FC<ComponentProps> = function (props) {
  const { className, children } = props
  const lang = className?.match(/language-(\w+)/)?.[1] || ''

  if (typeof children !== 'string') return null
  return <CodeHighlighter lang={lang}>{children}</CodeHighlighter>
}

const groupName = ['Today', 'Yesterday', 'Historical chats']
const items: GetProp<ConversationsProps, 'items'> = Array.from({ length: 9 }).map((_, index) => ({
  key: `item${index + 1}`,
  label: `Conversation Item ${index + 1}`,
  group: groupName[index % 3]
}))

export default function Overlay(props: Props) {
  const { token } = theme.useToken()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [fullscreen, updateFullscreen] = useState(false)
  const [sender, updateSender] = useState('')
  const [sessions, updateSessions] = useState<AiMessage[]>(SESSIONS)
  const [prompt, updatePrompt] = useState<PromptsItemType>()
  const [expandedKeys, setExpandedKeys] = useState(['Yesterday'])

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

  const bubbles = useMemo(
    function () {
      return sessions.map(function (value) {
        const item: BubbleItemType = {
          key: value.id,
          role: value.identity,
          placement: value.identity === 'user' ? 'end' : 'start',
          content: (
            <XMarkdown
              content={value.fragment}
              components={{ code: Code }}
            />
          ),
          avatar:
            value.identity === 'user' ? (
              <UserOutlined />
            ) : (
              <RobotOutlined style={{ color: '#1677ff' }} />
            ),
          loading: value.identity === 'assistant' && value.fragment === ''
        }
        return item
      })
    },
    [sessions]
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

  const conversations: ConversationItemType[] = Array.from({ length: 9 }).map(function (_, index) {
    return {
      key: `item${index + 1}`,
      label: `Conversation Item ${index + 1}`,
      group: groupName[index % 3],
      icon: index % 2 === 0 ? <GithubOutlined /> : <AlipayCircleOutlined />
    }
  })

  const thoughtChains: ThoughtChainItemType[] = [
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

  const groupable: GetProp<typeof Conversations, 'groupable'> = {
    label: (group) => {
      return (
        <Flex gap="small">
          <FieldTimeOutlined />
          {group}
        </Flex>
      )
    },
    collapsible: (group) => {
      return group !== 'Today'
    },
    expandedKeys: expandedKeys,
    onExpand: setExpandedKeys
  }

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

  async function handleSubmit(message: string, slot?: SlotConfigType[], skill?: SkillType) {
    // 创建用户消息
    const personal: AiMessage = {
      id: crypto.randomUUID(),
      sessionID: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      identity: 'user',
      fragment: message,
      thinking: ''
    }

    // 创建助手消息（初始为空）
    const assistant: AiMessage = {
      id: crypto.randomUUID(),
      sessionID: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      identity: 'assistant',
      fragment: '',
      thinking: ''
    }

    // 构建消息列表（包含用户消息），在更新状态之前构建
    const messages: CommunicateMessage[] = sessions.concat([personal]).map(function (value) {
      return {
        role: value.identity,
        content: value.fragment,
        thinking: value.thinking ?? undefined
      }
    })

    // 使用函数式更新添加用户消息和空的助手消息
    let index = 0
    updateSessions(function (prev) {
      const updated = prev.concat([personal, assistant])
      index = updated.length - 1
      return updated
    })

    const generators = GeneratorJSON(
      POST_COMMUNICATE.bind(null, {
        model: 'qwen3:8b',
        raw: true,
        stream: true,
        messages: messages
      })
    )

    // 流式更新助手消息
    for await (const generator of generators) {
      const { message: msg } = generator
      const { content, thinking } = msg

      // if (thinking) assistant.thinking += thinking
      if (thinking) assistant.fragment += thinking
      if (content) assistant.fragment += content

      console.log('[thinking]', thinking, '\n[content]', content)

      // 实时更新 sessions，使用函数式更新确保获取最新状态
      updateSessions(function (prev) {
        const updated = [...prev]
        if (updated[index]) {
          updated[index] = assistant
        }
        return updated
      })
    }

    // 最终更新助手消息的元数据
    assistant.id = crypto.randomUUID()
    assistant.sessionID = crypto.randomUUID()
    assistant.createdAt = Date.now()
    assistant.updatedAt = Date.now()

    // 最终更新 sessions
    updateSessions(function (prev) {
      const updated = [...prev]
      if (updated[index]) updated[index] = assistant
      console.log('[updated]', updated)
      return updated
    })

    updateSender('')
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
    container.addEventListener('wheel', handleWheel, { passive: false, capture: true })

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

  return (
    <Application.Overlay
      style={{
        minWidth: '800px'
      }}
      open={props.visible}
      fullscreen={fullscreen}
      wrapClassName={styles.rootTop}
      className={clsx([styles.overlay])}
      onCancel={() => props.onUpdateVisible(false)}
      onOk={() => props.onUpdateVisible(false)}>
      <Flex
        gap={12}
        vertical
        ref={overlayRef}
        className={clsx(styles.provider, styles.flex)}>
        <Card className={clsx(styles.provider, styles.card)}>
          <XProvider direction="ltr">
            <Flex
              gap={12}
              className={clsx(styles.provider, styles.flex)}>
              {/* <Conversations style={{ width: 200 }} defaultActiveKey="1" items={conversations} /> */}
              <Conversations
                items={conversations}
                defaultActiveKey="item1"
                style={{
                  width: 256,
                  background: token.colorBgContainer,
                  borderRadius: token.borderRadius
                }}
                groupable={groupable}
              />
              <Divider
                orientation="vertical"
                className={styles.divider}
              />

              <Flex
                vertical
                justify="space-between"
                gap={16}
                style={{ flex: 1 }}>
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
                style={{ width: 200 }}
                items={thoughtChains}
              />
            </Flex>
            <FloatButton.Group
              trigger="hover"
              style={{ insetInlineEnd: 24 }}
              className={clsx(styles.float, styles.button)}
              icon={<CustomerServiceOutlined />}>
              <FloatButton
                onClick={() => updateFullscreen(!fullscreen)}
                icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              />
              <FloatButton icon={<CommentOutlined />} />
            </FloatButton.Group>
          </XProvider>
        </Card>
      </Flex>
    </Application.Overlay>
  )
}
