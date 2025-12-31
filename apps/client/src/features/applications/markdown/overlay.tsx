import { TextStyleKit } from '@tiptap/extension-text-style'
import type { Editor as Composer } from '@tiptap/react'
import {
  EditorContent as ComposerMarkdown,
  useEditor as useComposer,
  useEditorState as useComposerValue
} from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import ReactMarkdown from 'react-markdown'
import RehypeHighlight from 'rehype-highlight'
import RehypeRaw from 'rehype-raw'
import RemarkGFM from 'remark-gfm'
import { clsx } from 'clsx'

import { HeadingOneIcon } from '@/components/tiptap-icons/heading-one-icon.tsx'
import { HeadingTwoIcon } from '@/components/tiptap-icons/heading-two-icon.tsx'
import { HeadingThreeIcon } from '@/components/tiptap-icons/heading-three-icon.tsx'
import { HeadingFourIcon } from '@/components/tiptap-icons/heading-four-icon.tsx'
import { HeadingFiveIcon } from '@/components/tiptap-icons/heading-five-icon.tsx'
import { HeadingSixIcon } from '@/components/tiptap-icons/heading-six-icon.tsx'
import { HeadingButton } from '@/components/tiptap-ui/heading-button/index.tsx'
import { Tooltip } from '@/components/tiptap-ui-primitive/tooltip/index.tsx'
import { Button } from '@/components/tiptap-ui-primitive/button/index.tsx'
import { Badge } from '@/components/tiptap-ui-primitive/badge/index.tsx'
import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import ComposerContext from '@/features/applications/markdown/composer-context.tsx'
import styles from '@/features/applications/markdown/overlay.module.scss'
import '@/styles/markdown-animations.scss'
import '@/styles/markdown-composer.scss'
import '@/styles/markdown-variables.scss'
// import '@/styles/'

// interface Props {}

const extensions = [TextStyleKit, StarterKit]

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  const [markdown, onUpdate] = useState(
    '# Hello, markdown!\n\n```ts\nconsole.log("Hello, world!")\n```'
  )

  const composer = useComposer({
    extensions,
    content: `
<h2>
  Hi there,
</h2>
<p>
  this is a <em>basic</em> example of <strong>Tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists:
</p>
<ul>
  <li>
    That’s a bullet list with one …
  </li>
  <li>
    … or two list items.
  </li>
</ul>
<p>
  Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:
</p>
<pre><code class="language-css">body {
  display: none;
}</code></pre>
<p>
  I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.
</p>
<blockquote>
  Wow, that’s amazing. Good work, boy! 👏
  <br />
  — Mom
</blockquote>
`
  })

  return (
    <Application.Overlay
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={clsx([styles.overlay, styles.section])}>
        <div className={clsx(['flex'])}>
          <HeadingButton
            level={1}
            editor={composer}
            tooltip={<Tooltip placement="bottom">1级标题</Tooltip>}
            onClick={() => composer.can().setHeading({ level: 1 })}
            showShortcut={true}>
            <HeadingOneIcon></HeadingOneIcon>
          </HeadingButton>
          <HeadingButton
            level={2}
            showTooltip={true}
            editor={composer}
            onClick={() => composer.can().setHeading({ level: 2 })}
            showShortcut={true}>
            <HeadingTwoIcon></HeadingTwoIcon>
          </HeadingButton>
          <HeadingButton
            level={3}
            showTooltip={true}
            editor={composer}
            onClick={() => composer.can().setHeading({ level: 3 })}
            showShortcut={true}>
            <HeadingThreeIcon></HeadingThreeIcon>
          </HeadingButton>
          <HeadingButton
            level={4}
            showTooltip={true}
            editor={composer}
            onClick={() => composer.can().setHeading({ level: 4 })}
            showShortcut={true}>
            <HeadingFourIcon></HeadingFourIcon>
          </HeadingButton>
          <HeadingButton
            level={5}
            showTooltip={true}
            editor={composer}
            onClick={() => composer.can().setHeading({ level: 5 })}
            showShortcut={true}>
            <HeadingFiveIcon></HeadingFiveIcon>
          </HeadingButton>
          <HeadingButton
            level={6}
            showTooltip={true}
            editor={composer}
            onClick={() => composer.can().setHeading({ level: 6 })}
            showShortcut={true}>
            <HeadingSixIcon></HeadingSixIcon>
          </HeadingButton>
        </div>
        <div
          className={clsx([
            'flex-1 min-h-0 overflow-x-hidden overflow-y-scroll scroll-smooth'
          ])}>
          <ComposerContext composer={composer} />
          <Button>参数</Button>
          <Badge>测试</Badge>
          <ComposerMarkdown
            editor={composer}
            className={clsx([styles.composer, styles.markdown])}
          />
          <ReactMarkdown
            remarkPlugins={[RemarkGFM]}
            rehypePlugins={[RehypeHighlight, RehypeRaw]}
            components={{
              // 自定义渲染以匹配 Typora 风格
              h1({ children }) {
                return <h1 className="typora-heading-1">{children}</h1>
              },
              h2({ children }) {
                return <h2 className="typora-heading-2">{children}</h2>
              },
              h3({ children }) {
                return <h3 className="typora-heading-3">{children}</h3>
              },
              p({ children }) {
                return <p className="typora-paragraph">{children}</p>
              },
              a({ children, href }) {
                return (
                  <a
                    href={href}
                    className="typora-link"
                    target="_blank"
                    rel="noopener noreferrer">
                    {children}
                  </a>
                )
              },
              img({ src, alt }) {
                return (
                  <img
                    src={src}
                    alt={alt}
                    className="typora-image"
                  />
                )
              },
              blockquote({ children }) {
                return (
                  <blockquote className="typora-blockquote">
                    {children}
                  </blockquote>
                )
              },
              code({ children, className }) {
                const language = className
                  ? className.split('language-')[1]
                  : ''
                return (
                  <code className={`typora-code ${language}`}>{children}</code>
                )
              },
              pre({ children }) {
                return <pre className="typora-pre">{children}</pre>
              },
              ul({ children }) {
                return <ul className="typora-list">{children}</ul>
              },
              ol({ children }) {
                return <ol className="typora-list">{children}</ol>
              },
              li({ children }) {
                return <li className="typora-list-item">{children}</li>
              },
              table({ children }) {
                return <table className="typora-table">{children}</table>
              },
              thead({ children }) {
                return <thead className="typora-table-header">{children}</thead>
              },
              tbody({ children }) {
                return <tbody className="typora-table-body">{children}</tbody>
              },
              tr({ children }) {
                return <tr className="typora-table-row">{children}</tr>
              },
              th({ children }) {
                return <th className="typora-table-header-cell">{children}</th>
              },
              td({ children }) {
                return <td className="typora-table-cell">{children}</td>
              }
            }}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </Application.Overlay>
  )
}
