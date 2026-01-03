import { clsx } from 'clsx'

import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import { all, createLowlight } from 'lowlight'

// --- Tiptap Core Extensions ---
import StarterKit from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import { TextAlign } from '@tiptap/extension-text-align'
import { Image } from '@/components/tiptap-node/image-node/image-node-extension'
import { TableKit } from '@/components/tiptap-node/table-node/extensions/table-node-extension'
// import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
// import { Image } from '@tiptap/extension-image'

// --- StarterKit already includes ---
// import { History } from '@tiptap/extension-history'
// import { Underline } from '@tiptap/extension-underline'
// import { Color } from '@tiptap/extension-color'
// import { TextStyle } from '@tiptap/extension-text-style'
// import { BulletList, OrderedList } from '@tiptap/extension-list'

// Custom extensions
import { UiState } from '@/components/tiptap-extension/ui-state-extension'
import { NodeBackground } from '@/components/tiptap-extension/node-background-extension.ts'
import { NodeAlignment } from '@/components/tiptap-extension/node-alignment-extension.ts'
import HorizontalRule from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension.ts'
import { TableHandleExtension } from '@/components/tiptap-node/table-node/extensions/table-handle/table-handle.ts'

import {
  EditorContent as ComposerMarkdown,
  useEditor as useComposer,
  EditorContext as ComposerContext,
  type AnyExtension,
  type DocumentType
  // useEditorState as useComposerValue
} from '@tiptap/react'

// import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'

// --- Tiptap UI ---
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button/blockquote-button.tsx'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button/code-block-button.tsx'
// import { ColorHighlightButton } from '@/components/tiptap-ui/color-highlight-button/color-highlight-button.tsx'
// import { ColorTextButton } from '@/components/tiptap-ui/color-text-button/color-text-button.tsx'
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover/color-highlight-popover.tsx'
import { DragContextMenu } from '@/components/tiptap-ui/drag-context-menu/drag-context-menu.tsx'
import { ImageAlignButton } from '@/components/tiptap-ui/image-align-button/image-align-button.tsx'
import { ListButton } from '@/components/tiptap-ui/list-button/list-button.tsx'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu/list-dropdown-menu.tsx'
import { MarkButton } from '@/components/tiptap-ui/mark-button/mark-button.tsx'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx'
import { TextButton } from '@/components/tiptap-ui/text-button/text-button.tsx'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button/text-align-button.tsx'

import { TableTriggerButton } from '@/components/tiptap-node/table-node/ui/table-trigger-button/table-trigger-button.tsx'
import { TableHandle } from '@/components/tiptap-node/table-node/ui/table-handle/table-handle.tsx'
import { TableSelectionOverlay } from '@/components/tiptap-node/table-node/ui/table-selection-overlay/table-selection-overlay.tsx'
import { TableCellHandleMenu } from '@/components/tiptap-node/table-node/ui/table-cell-handle-menu/table-cell-handle-menu.tsx'
import { TableExtendRowColumnButtons } from '@/components/tiptap-node/table-node/ui/table-extend-row-column-button/table-extend-row-column-button.tsx'

// TODO FIX: 面板颜色无法选取应用
// import { ColorTextPopover } from '@/components/tiptap-ui/color-text-popover/color-text-popover.tsx'
// TODO FIX: 无法使用
// import { TurnIntoDropdown } from '@/components/tiptap-ui/turn-into-dropdown/turn-into-dropdown.tsx'

// --- UI Primitive ---
// import { ButtonGroup } from '@/components/tiptap-ui-primitive/button/button.tsx'
// import { Badge } from '@/components/tiptap-ui-primitive/badge/index.tsx'

import '@/styles/markdown-composer.scss'

// Import required styles
import '@/styles/markdown-animations.scss'
import '@/styles/markdown-variables.scss'
import '@/components/tiptap-node/table-node/styles/prosemirror-table.scss'
import '@/components/tiptap-node/table-node/styles/table-node.scss'
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss'
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/heading-node/heading-node.scss'
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/image-upload-node/image-upload-node.scss'

// import { Image } from '@/components/tiptap-node/image-node/image-node-extension'
import { Marked } from 'marked'

import { MARKDOWN } from './constant.ts'

import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import { Scroll } from '@/components/scroll/scroll.tsx'
// import ComposerContext from '@/features/applications/markdown/composer-context.tsx'

import styles from '@/features/applications/markdown/overlay.module.scss'

const marked = new Marked()

const lowlight = createLowlight(all)
lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)
// interface Props {}

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

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  // const [markdown, onUpdate] = useState(
  //   '# Hello, markdown!\n\n```ts\nconsole.log("Hello, world!")\n```'
  // )

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

  return (
    <Application.Overlay
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={clsx([styles.overlay, styles.section])}>
        <Scroll.X
          classNames={{
            root: 'w-full h-[30px]',
            inner: 'h-full flex items-center gap-x-5'
          }}>
          <UndoRedoButton
            editor={composer}
            action="undo"
            tooltip="撤销"
            hideWhenUnavailable={false}
            showShortcut={false}
            onExecuted={() => console.log('Action executed!')}
          />
          <UndoRedoButton
            editor={composer}
            action="redo"
            tooltip="重做"
            hideWhenUnavailable={false}
            showShortcut={false}
            onExecuted={() => console.log('Action executed!')}
          />
          <BlockquoteButton
            editor={composer}
            tooltip="块引用"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Blockquote toggled!')}
          />
          <CodeBlockButton
            editor={composer}
            tooltip="代码块"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Code block toggled!')}
          />
          <ColorHighlightPopover
            editor={composer}
            hideWhenUnavailable={true}
            onApplied={({ color, label }) =>
              console.log(`Applied highlight: ${label} (${color})`)
            }
          />
          <ImageAlignButton
            editor={composer}
            align="left"
            tooltip="左对齐"
            disabled={false}
            showTooltip={true}
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Image aligned!')}
          />
          <ImageAlignButton
            editor={composer}
            align="center"
            tooltip="居中对齐"
            disabled={false}
            showTooltip={true}
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Image aligned!')}
          />
          <ImageAlignButton
            editor={composer}
            align="right"
            tooltip="右对齐"
            disabled={false}
            showTooltip={true}
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Image aligned!')}
          />
          <ListButton
            editor={composer}
            type="bulletList"
            tooltip="无序列表"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('List toggled!')}
          />
          <ListButton
            editor={composer}
            type="orderedList"
            tooltip="有序列表"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('List toggled!')}
          />
          <ListButton
            editor={composer}
            type="taskList"
            tooltip="任务列表"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('List toggled!')}
          />
          {composer && (
            <ListDropdownMenu
              editor={composer}
              types={['bulletList', 'orderedList', 'taskList']}
              showTooltip={true}
              tooltip="列表选项"
              hideWhenUnavailable={true}
              portal={true}
              onOpenChange={(isOpen) => console.log('Dropdown opened:', isOpen)}
            />
          )}
          <MarkButton
            editor={composer}
            type="bold"
            tooltip="加粗"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="italic"
            tooltip="斜体"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="strike"
            tooltip="删除线"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="code"
            tooltip="行内代码"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            tooltip="下划线"
            type="underline"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="superscript"
            tooltip="上标"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="subscript"
            tooltip="下标"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Mark toggled!')}
          />
          <TextButton
            editor={composer}
            tooltip="清除格式"
            hideWhenUnavailable={true}
            showShortcut={false}
            onToggled={() => console.log('Converted to text!')}
          />
          <TextAlignButton
            editor={composer}
            align="left"
            tooltip="左对齐"
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Text aligned!')}
          />
          <TextAlignButton
            align="center"
            tooltip="居中对齐"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Text aligned!')}
          />
          <TextAlignButton
            align="right"
            tooltip="右对齐"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Text aligned!')}
          />
          <TextAlignButton
            align="justify"
            tooltip="两端对齐"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={false}
            onAligned={() => console.log('Text aligned!')}
          />
          <TableTriggerButton editor={composer} />
        </Scroll.X>

        <ComposerContext value={{ editor: composer }}>
          <ComposerMarkdown
            editor={composer}
            role="presentation"
            className={clsx([styles.composer, styles.markdown])}
          />
          <TableHandle editor={composer} />
          <TableSelectionOverlay
            editor={composer}
            showResizeHandles={true}
            cellMenu={(props) => (
              <TableCellHandleMenu
                editor={props.editor}
                onMouseDown={(e) => props.onResizeStart?.('br')(e)}
              />
            )}
          />
          <TableExtendRowColumnButtons editor={composer} />
          <DragContextMenu
            editor={composer}
            withSlashCommandTrigger={true}
          />
        </ComposerContext>
      </div>
    </Application.Overlay>
  )
}
