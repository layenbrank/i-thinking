import {
  BulbOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  RocketOutlined,
  SmileOutlined,
  UserOutlined,
  WarningOutlined
} from '@ant-design/icons'
import {
  Bubble,
  CodeHighlighter,
  Prompts,
  Sender,
  Suggestion,
  Think,
  type BubbleItemType,
  type PromptsItemType
} from '@ant-design/x'
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown'
import type {
  SkillType,
  SlotConfigType
} from '@ant-design/x/es/sender/interface'
import type { SuggestionItem } from '@ant-design/x/es/suggestion'
import { Flex, message, Typography } from 'antd'
import clsx from 'clsx'
import { vs as VSCODE } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { v4 as UUIDV4 } from 'uuid'

// import { Scroll } from '@/components/scroll/scroll.tsx'
import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence.ts'
import {
  session$,
  useIntelligenceStore as store
} from '@/stores/intelligence.ts'

import styles from '@/views/intelligence/overlay/section.module.scss'

type AiSession = Application.Intelligence.AiSession
type AiMessage = Application.Intelligence.AiMessage
type CommunicateMessage = Application.Intelligence.Communicate.Message

interface SectionProps {}

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

function Section(props: SectionProps) {
  const done = useRef(false)
  const updateTimerRef = useRef<number | null>(null)
  const messages = store((state) => state.messages)
  const [thinking, updateThinking] = useState(false)
  const [expandedThinking, updateExpandedThinking] = useState(false)
  const [prompt, updatePrompt] = useState<PromptsItemType>()
  const [sender, updateSender] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const suggestions: SuggestionItem[] = [
    {
      label: 'Write a report',
      value: 'report'
    }
  ]
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
      description:
        'Why do not ants get sick? Because they have tiny ant-bodies!'
    },
    {
      key: '5',
      icon: <WarningOutlined style={{ color: '#FF4D4F' }} />,
      label: 'Common Issue Solutions',
      description: 'How to solve common issues? Share some tips!'
    }
  ]
  const msgBufferRef = useRef<{
    fragment: string
    thinking: string
    messageId: string | null
  }>({
    fragment: '',
    thinking: '',
    messageId: null
  })

  function handlePrompt({ data }: { data: PromptsItemType }) {
    updatePrompt(data)
    console.log('[handlePrompt]', data)
    if (data.label) updateSender(data.label.toString())
  }

  function handleKeyDown(
    event: React.KeyboardEvent<Element>,
    onKeyDown: (event: React.KeyboardEvent<Element>) => void
  ) {
    onKeyDown(event)
    console.log('event', event.key, 'onKeyDown', onKeyDown)
  }

  async function handleSubmit(
    fragment: string,
    slot?: SlotConfigType[],
    skill?: SkillType
  ) {
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
      const transferMSG: CommunicateMessage[] = messages
        .concat([personal])
        .map(function (value) {
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

  function handleSender(value: string, onTrigger: (value?: boolean) => void) {
    if (value === '/') onTrigger()
    else if (!value) onTrigger(false)
    updateSender(value)
  }

  return (
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
  )
}

export default Section
