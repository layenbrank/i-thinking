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
  EditorContext,
  type AnyExtension
  // useEditorState as useComposerValue
} from '@tiptap/react'

// --- Tiptap UI ---
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button/blockquote-button.tsx'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button/code-block-button.tsx'
import { ColorHighlightButton } from '@/components/tiptap-ui/color-highlight-button/color-highlight-button.tsx'
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover/color-highlight-popover.tsx'
import { ColorTextButton } from '@/components/tiptap-ui/color-text-button/color-text-button.tsx'
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
import { ButtonGroup } from '@/components/tiptap-ui-primitive/button/button.tsx'

// import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'

import { clsx } from 'clsx'

// import { Badge } from '@/components/tiptap-ui-primitive/badge/index.tsx'
import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
// import ComposerContext from '@/features/applications/markdown/composer-context.tsx'
// import { BlockquoteButton } from '@/components/tiptap-ui'

import styles from '@/features/applications/markdown/overlay.module.scss'
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

// import { Image } from '@/components/tiptap-node/image-node/image-node-extension'
import { Marked } from 'marked'

import { MARKDOWN } from './constant.ts'
import { TurnIntoDropdown } from '@/components/tiptap-ui/turn-into-dropdown/turn-into-dropdown.tsx'

const marked = new Marked()

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

  Image.configure({
    HTMLAttributes: {
      class: 'custom-image-class'
    }
  }),

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
  NodeBackground // For cell background colors

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
      content: marked.parse(
        MARKDOWN.concat(
          '<img src="https://picsum.photos/200/300" alt="Image" data-align="center" />'
        ),
        {
          async: false
        }
      )
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
        <div className={clsx(['grid grid-cols-3'])}>
          <BlockquoteButton
            editor={composer}
            text="Quote"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Blockquote toggled!')}
          />
          <CodeBlockButton
            editor={composer}
            text="Code"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Code block toggled!')}
          />
          <ButtonGroup orientation="horizontal">
            <ColorHighlightButton
              tooltip="Red"
              hideWhenUnavailable={true}
              editor={composer}
              highlightColor="oklch(88.5% 0.062 18.334)"
            />
            <ColorHighlightButton
              editor={composer}
              tooltip="Orange"
              highlightColor="oklch(90.1% 0.076 70.697)"
              text="Highlight"
              hideWhenUnavailable={true}
              showShortcut={true}
              onApplied={({ color, label }) =>
                console.log(`Applied ${label} highlight: ${color}`)
              }
            />
          </ButtonGroup>
          <ColorHighlightPopover
            editor={composer}
            hideWhenUnavailable={true}
            onApplied={({ color, label }) =>
              console.log(`Applied highlight: ${label} (${color})`)
            }
          />
          <ColorTextButton
            editor={composer}
            textColor="var(--tt-color-text-blue)"
            text="Blue Text"
            label="Blue Text label"
            hideWhenUnavailable={true}
            showShortcut={true}
            onApplied={({ color, label }) =>
              console.log(`Applied ${label} text color: ${color}`)
            }
          />
          <ImageAlignButton
            editor={composer}
            align="left"
            text="Align Left"
            hideWhenUnavailable={true}
            showShortcut={true}
            onAligned={() => console.log('Image aligned!')}
          />
          <ImageAlignButton
            editor={composer}
            align="center"
            text="Align Center"
            hideWhenUnavailable={true}
            showShortcut={true}
          />
          <ImageAlignButton
            editor={composer}
            align="right"
            text="Align Right"
            hideWhenUnavailable={true}
            showShortcut={true}
          />
          <ListButton
            editor={composer}
            type="bulletList"
            text="Bullet List"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('List toggled!')}
          />
          <ListButton
            editor={composer}
            type="orderedList"
            text="Ordered List"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('List toggled!')}
          />
          <ListButton
            editor={composer}
            type="taskList"
            text="Task List"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('List toggled!')}
          />
          {composer && (
            <ListDropdownMenu
              editor={composer}
              types={['bulletList', 'orderedList', 'taskList']}
              hideWhenUnavailable={true}
              portal={false}
              onOpenChange={(isOpen) => console.log('Dropdown opened:', isOpen)}
            />
          )}
          <MarkButton
            editor={composer}
            type="bold"
            text="Bold"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="italic"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="strike"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="code"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="underline"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="superscript"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <MarkButton
            type="subscript"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Mark toggled!')}
          />
          <UndoRedoButton
            editor={composer}
            action="undo"
            text="Undo"
            hideWhenUnavailable={true}
            showShortcut={true}
            onExecuted={() => console.log('Action executed!')}
          />
          <UndoRedoButton
            editor={composer}
            action="redo"
            text="Redo"
            hideWhenUnavailable={true}
            showShortcut={true}
            onExecuted={() => console.log('Action executed!')}
          />
          <TurnIntoDropdown
            editor={composer}
            hideWhenUnavailable={false}
            blockTypes={[
              'paragraph',
              'heading',
              'bulletList',
              'orderedList',
              'blockquote'
            ]}
            useCardLayout={true}
            onOpenChange={(isOpen) => console.log('Dropdown toggled:', isOpen)}
          />

          <TextButton
            editor={composer}
            text="Text"
            hideWhenUnavailable={true}
            showShortcut={true}
            onToggled={() => console.log('Converted to text!')}
          />
          <TextAlignButton
            editor={composer}
            align="left"
            text="Left"
            hideWhenUnavailable={true}
            showShortcut={true}
            onAligned={() => console.log('Text aligned!')}
          />
          <TextAlignButton
            align="center"
            text="Center"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onAligned={() => console.log('Text aligned!')}
          />
          <TextAlignButton
            align="right"
            text="Right"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onAligned={() => console.log('Text aligned!')}
          />
          <TextAlignButton
            align="justify"
            text="Justify"
            editor={composer}
            hideWhenUnavailable={true}
            showShortcut={true}
            onAligned={() => console.log('Text aligned!')}
          />
          <TableTriggerButton editor={composer} />
        </div>
        <EditorContext value={{ editor: composer }}>
          <ComposerMarkdown
            editor={composer}
            role="presentation"
          />
          <TableHandle />
          <TableSelectionOverlay
            showResizeHandles={true}
            cellMenu={(props) => (
              <TableCellHandleMenu
                editor={props.editor}
                onMouseDown={(e) => props.onResizeStart?.('br')(e)}
              />
            )}
          />
          <TableExtendRowColumnButtons />
          <DragContextMenu
            editor={composer}
            withSlashCommandTrigger={false}
          />
        </EditorContext>
      </div>
    </Application.Overlay>
  )
}
