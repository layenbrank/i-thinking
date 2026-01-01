import { TextStyleKit } from '@tiptap/extension-text-style'
import {
  EditorContent as ComposerMarkdown,
  useEditor as useComposer,
  EditorContext
  // useEditorState as useComposerValue
} from '@tiptap/react'
// import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { clsx } from 'clsx'

// import { Badge } from '@/components/tiptap-ui-primitive/badge/index.tsx'
import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import ComposerContext from '@/features/applications/markdown/composer-context.tsx'
// import { BlockquoteButton } from '@/components/tiptap-ui'

import styles from '@/features/applications/markdown/overlay.module.scss'
import '@/styles/markdown-animations.scss'
import '@/styles/markdown-composer.scss'
import '@/styles/markdown-variables.scss'
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss'
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/heading-node/heading-node.scss'
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import HorizontalRule from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension.ts'
// import { Image } from '@/components/tiptap-node/image-node/image-node-extension'
import { Marked } from 'marked'

import { MARKDOWN } from './constant.ts'

const marked = new Marked()

// interface Props {}

const extensions = [
  TextStyleKit,
  StarterKit.configure({ horizontalRule: false }),
  HorizontalRule
]

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  const [markdown, onUpdate] = useState(
    '# Hello, markdown!\n\n```ts\nconsole.log("Hello, world!")\n```'
  )

  const composer = useComposer(
    {
      immediatelyRender: false,
      extensions,
      content: marked.parse(MARKDOWN, {
        async: false
      })
    },
    []
  )

  return (
    <Application.Overlay
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={clsx([styles.overlay, styles.section])}>
        <EditorContext value={{ editor: composer }}>
          <ComposerMarkdown
            editor={composer}
            role="presentation"
          />
        </EditorContext>
      </div>
    </Application.Overlay>
  )
}
