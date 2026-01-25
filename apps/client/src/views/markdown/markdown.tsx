import { clsx } from 'clsx'
import { Splitter } from 'antd'
import { Marked } from 'marked'

import {
  EditorContext as ComposerContext,
  EditorContent as ComposerMarkdown,
  useEditor as useComposer,
  type AnyExtension
} from '@tiptap/react'

// --- Tiptap Core Extensions ---
import { Image } from '@/components/tiptap-node/image-node/image-node-extension'
import { TableKit } from '@/components/tiptap-node/table-node/extensions/table-node-extension'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'

// Custom extensions
import { NodeAlignment } from '@/components/tiptap-extension/node-alignment-extension.ts'
import { NodeBackground } from '@/components/tiptap-extension/node-background-extension.ts'
import { UiState } from '@/components/tiptap-extension/ui-state-extension'
import HorizontalRule from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension.ts'
import { TableHandleExtension } from '@/components/tiptap-node/table-node/extensions/table-handle/table-handle.ts'

import Navigation from '@/views/markdown/navigation.tsx'
import { Overlay } from '@/views/markdown/overlay'
// import ComposerContext from '@/features/applications/markdown/composer-context.tsx'

import styles from '@/views/markdown/markdown.module.scss'

// interface Props {}

const marked = new Marked()

const extensions: AnyExtension[] = [
  TextStyleKit,
  StarterKit.configure({
    horizontalRule: false
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  HorizontalRule,
  // Text styling extensions which handle the "Colors" menu
  Highlight.configure({ multicolor: true }),

  // UI state management (REQUIRED for drag context menu)
  // This was installed automatically by the CLI
  UiState,

  TaskList,
  TaskItem.configure({ nested: true }),
  Superscript,
  Subscript,
  TableKit.configure({
    table: {
      resizable: true // Enable column resizing
    }
  }),
  TableHandleExtension, // Required for row/column manipulation
  NodeAlignment, // For cell alignment
  NodeBackground, // For cell background colors
  // CodeBlockLowlight.extend({
  // addNodeView() {
  // return ReactNodeViewRenderer(CodeBlockComponent)
  // }
  // }).configure({ lowlight }),
  Image.configure({
    HTMLAttributes: {
      class: 'custom-image-class'
    },
    resize: {
      enabled: true,
      alwaysPreserveAspectRatio: true
    }
  })

  // TextStyle,
  // NodeBackground,
]

export default function Markdown() {
  const [sizes, updateSizes] = useState<(number | string)[]>(['15%', '85%'])

  const composer = useComposer(
    {
      immediatelyRender: false,
      extensions,
      content: '',
      onUpdate(props) {
        const json = props.editor.getJSON()
        const html = props.editor.getHTML()
        // const text = props.editor.getText()
        console.log('props', props)
        console.log('getJSON', json)
        console.log('getHTML', html)

        // console.log('getText', text)
      }
      // content: marked.parse(
      //   MARKDOWN.concat(
      //     '<img src="https://picsum.photos/200/300" alt="Image" data-align="center" />'
      //   ),
      //   {
      //     async: false
      //   }
      // )
    },
    []
  )

  function onUpdateFragment(fragment: string) {
    if (composer) {
      const parsed = marked.parse(fragment, { async: false })
      composer.commands.setContent(parsed)
      console.log('Updated fragment:', fragment, parsed)
    }
  }

  return (
    <div className={clsx([styles.markdown, styles.root])}>
      <Overlay.Utility />
      <Splitter onResize={updateSizes}>
        <Splitter.Panel
          min="15%"
          max="30%"
          resizable
          size={sizes[0]}
          className={clsx([styles.markdown, styles.navigation])}>
          <Navigation onUpdateFragment={onUpdateFragment} />
        </Splitter.Panel>
        <Splitter.Panel
          className={clsx([styles.markdown, styles.section])}
          size={sizes[1]}>
          <Overlay.Section composer={composer} />
        </Splitter.Panel>
      </Splitter>
      <Overlay.Summary />
    </div>
  )
}
