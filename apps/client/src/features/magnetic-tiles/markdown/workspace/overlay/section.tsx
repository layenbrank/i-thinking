import { clsx } from 'clsx'

import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import { all, createLowlight } from 'lowlight'

// --- StarterKit already includes ---
// import { History } from '@tiptap/extension-history'
// import { Underline } from '@tiptap/extension-underline'
// import { Color } from '@tiptap/extension-color'
// import { TextStyle } from '@tiptap/extension-text-style'
// import { BulletList, OrderedList } from '@tiptap/extension-list'

import {
  EditorContext as ComposerContext,
  EditorContent as ComposerMarkdown,
  type Editor
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
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button/text-align-button.tsx'
import { TextButton } from '@/components/tiptap-ui/text-button/text-button.tsx'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx'

import { TableCellHandleMenu } from '@/components/tiptap-node/table-node/ui/table-cell-handle-menu/table-cell-handle-menu.tsx'
import { TableExtendRowColumnButtons } from '@/components/tiptap-node/table-node/ui/table-extend-row-column-button/table-extend-row-column-button.tsx'
import { TableHandle } from '@/components/tiptap-node/table-node/ui/table-handle/table-handle.tsx'
import { TableSelectionOverlay } from '@/components/tiptap-node/table-node/ui/table-selection-overlay/table-selection-overlay.tsx'
import { TableTriggerButton } from '@/components/tiptap-node/table-node/ui/table-trigger-button/table-trigger-button.tsx'

// import { Image } from '@/components/tiptap-node/image-node/image-node-extension'

import { Glide } from '@/components/glide/glide'

// TODO FIX: 面板颜色无法选取应用
// import { ColorTextPopover } from '@/components/tiptap-ui/color-text-popover/color-text-popover.tsx'
// TODO FIX: 无法使用
// import { TurnIntoDropdown } from '@/components/tiptap-ui/turn-into-dropdown/turn-into-dropdown.tsx'

// --- UI Primitive ---
// import { ButtonGroup } from '@/components/tiptap-ui-primitive/button/button.tsx'
// import { Badge } from '@/components/tiptap-ui-primitive/badge/index.tsx'

import styles from '@/features/magnetic-tiles/markdown/workspace/overlay/section.module.scss'

import '@/styles/markdown-composer.scss'

// Import required styles
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss'
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/heading-node/heading-node.scss'
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss'
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/image-upload-node/image-upload-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import '@/components/tiptap-node/table-node/styles/prosemirror-table.scss'
import '@/components/tiptap-node/table-node/styles/table-node.scss'
import '@/styles/markdown-animations.scss'
import '@/styles/markdown-variables.scss'

const lowlight = createLowlight(all)
lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('js', js)
lowlight.register('ts', ts)

interface SectionProps {
  composer: Editor | null
}

export default function Section(props: SectionProps) {
  return (
    <div className={clsx(['flex-1 min-w-0 h-full flex flex-col'])}>
      <Glide.X
        classNames={{
          root: 'w-full h-[30px]',
          inner: 'h-full flex items-center gap-x-5'
        }}>
        <UndoRedoButton
          editor={props.composer}
          action="undo"
          tooltip="撤销"
          hideWhenUnavailable={false}
          showShortcut={false}
          onExecuted={() => console.log('Action executed!')}
        />
        <UndoRedoButton
          editor={props.composer}
          action="redo"
          tooltip="重做"
          hideWhenUnavailable={false}
          showShortcut={false}
          onExecuted={() => console.log('Action executed!')}
        />
        <BlockquoteButton
          editor={props.composer}
          tooltip="块引用"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Blockquote toggled!')}
        />
        <CodeBlockButton
          editor={props.composer}
          tooltip="代码块"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Code block toggled!')}
        />
        <ColorHighlightPopover
          editor={props.composer}
          hideWhenUnavailable={true}
          onApplied={({ color, label }) => console.log(`Applied highlight: ${label} (${color})`)}
        />
        <ImageAlignButton
          editor={props.composer}
          align="left"
          tooltip="左对齐"
          disabled={false}
          showTooltip={true}
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Image aligned!')}
        />
        <ImageAlignButton
          editor={props.composer}
          align="center"
          tooltip="居中对齐"
          disabled={false}
          showTooltip={true}
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Image aligned!')}
        />
        <ImageAlignButton
          editor={props.composer}
          align="right"
          tooltip="右对齐"
          disabled={false}
          showTooltip={true}
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Image aligned!')}
        />
        <ListButton
          editor={props.composer}
          type="bulletList"
          tooltip="无序列表"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('List toggled!')}
        />
        <ListButton
          editor={props.composer}
          type="orderedList"
          tooltip="有序列表"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('List toggled!')}
        />
        <ListButton
          editor={props.composer}
          type="taskList"
          tooltip="任务列表"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('List toggled!')}
        />
        {props.composer && (
          <ListDropdownMenu
            editor={props.composer}
            types={['bulletList', 'orderedList', 'taskList']}
            showTooltip={true}
            tooltip="列表选项"
            hideWhenUnavailable={true}
            portal={true}
            onOpenChange={(isOpen) => console.log('Dropdown opened:', isOpen)}
          />
        )}
        <MarkButton
          editor={props.composer}
          type="bold"
          tooltip="加粗"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <MarkButton
          type="italic"
          tooltip="斜体"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <MarkButton
          type="strike"
          tooltip="删除线"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <MarkButton
          type="code"
          tooltip="行内代码"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <MarkButton
          tooltip="下划线"
          type="underline"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <MarkButton
          type="superscript"
          tooltip="上标"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <MarkButton
          type="subscript"
          tooltip="下标"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Mark toggled!')}
        />
        <TextButton
          editor={props.composer}
          tooltip="清除格式"
          hideWhenUnavailable={true}
          showShortcut={false}
          onToggled={() => console.log('Converted to text!')}
        />
        <TextAlignButton
          editor={props.composer}
          align="left"
          tooltip="左对齐"
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Text aligned!')}
        />
        <TextAlignButton
          align="center"
          tooltip="居中对齐"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Text aligned!')}
        />
        <TextAlignButton
          align="right"
          tooltip="右对齐"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Text aligned!')}
        />
        <TextAlignButton
          align="justify"
          tooltip="两端对齐"
          editor={props.composer}
          hideWhenUnavailable={true}
          showShortcut={false}
          onAligned={() => console.log('Text aligned!')}
        />
        <TableTriggerButton editor={props.composer} />
      </Glide.X>

      <ComposerContext value={{ editor: props.composer }}>
        <ComposerMarkdown
          editor={props.composer}
          role="presentation"
          className={clsx([styles.composer, styles.markdown])}
        />
        <TableHandle editor={props.composer} />
        <TableSelectionOverlay
          editor={props.composer}
          showResizeHandles={true}
          cellMenu={(props) => (
            <TableCellHandleMenu
              editor={props.editor}
              onMouseDown={(e) => props.onResizeStart?.('br')(e)}
            />
          )}
        />
        <TableExtendRowColumnButtons editor={props.composer} />
        <DragContextMenu
          editor={props.composer}
          withSlashCommandTrigger={true}
        />
      </ComposerContext>
    </div>
  )
}
