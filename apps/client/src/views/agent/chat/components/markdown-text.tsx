/**
 * 消息正文 Markdown 渲染适配层。
 *
 * 设计系统的 `@i-thinking/design/assistant/markdown-text` 绑定 assistant-ui 的
 * message part 上下文，渲染不了游离的字符串；本窗口的对话数据来自自有 store，
 * 所以这里复用同一套引擎（react-markdown + remark-gfm）并补上代码块高亮。
 */
import ReactMarkdown, { type Components } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vs as VSCODE } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

interface MarkdownTextProps {
  content: string
}

const INLINE_CODE_CLASS = 'bg-muted rounded-md px-1.5 py-0.5 font-mono text-xs'
const PLAIN_BLOCK_CLASS =
  'border-border/50 bg-muted/30 my-3 overflow-x-auto rounded-xl border p-3.5 text-xs'

const components: Components = {
  // 代码块自带容器，去掉 react-markdown 额外套的 <pre>
  pre: function Pre(props) {
    return <>{props.children}</>
  },
  code: function Code(props) {
    const { className, children } = props
    const text = typeof children === 'string' ? children : ''
    const language = /language-([\w-]+)/.exec(className ?? '')?.[1]

    if (!language && !text.includes('\n')) {
      return <code className={INLINE_CODE_CLASS}>{children}</code>
    }

    if (!language) {
      return (
        <pre className={PLAIN_BLOCK_CLASS}>
          <code>{text}</code>
        </pre>
      )
    }

    return (
      <SyntaxHighlighter
        language={language}
        style={VSCODE}
        PreTag="div"
        customStyle={{
          margin: '0.75rem 0',
          padding: '0.875rem',
          border: '1px solid color-mix(in oklab, var(--border) 50%, transparent)',
          borderRadius: '0.75rem',
          background: 'transparent',
          fontSize: '13px'
        }}>
        {text.replace(/\n$/, '')}
      </SyntaxHighlighter>
    )
  }
}

function MarkdownText(props: MarkdownTextProps) {
  return (
    <div className="text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}>
        {props.content}
      </ReactMarkdown>
    </div>
  )
}

export { MarkdownText }
export type { MarkdownTextProps }
