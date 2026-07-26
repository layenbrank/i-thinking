import { TextStyleKit } from '@tiptap/extension-text-style'
import type { Editor as Composer } from '@tiptap/react'
import {
  EditorContent as ComposerMarkdown,
  useEditor as useComposer,
  useEditorState as useComposerValue
} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { clsx, type ClassValue } from 'clsx'

import styles from '@/features/magnetic-tiles/markdown/composer-context.module.scss'

export default function ComposerContext({ composer }: { composer: Composer }) {
  const composerValue = useComposerValue({
    editor: composer,
    selector(ctx) {
      return {
        isBold: ctx.editor.isActive('bold') ?? false,
        canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
        isItalic: ctx.editor.isActive('italic') ?? false,
        canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
        isStrike: ctx.editor.isActive('strike') ?? false,
        canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
        isCode: ctx.editor.isActive('code') ?? false,
        canCode: ctx.editor.can().chain().toggleCode().run() ?? false,
        canClearMarks: ctx.editor.can().chain().unsetAllMarks().run() ?? false,
        isParagraph: ctx.editor.isActive('paragraph') ?? false,
        isHeading1: ctx.editor.isActive('heading', { level: 1 }) ?? false,
        isHeading2: ctx.editor.isActive('heading', { level: 2 }) ?? false,
        isHeading3: ctx.editor.isActive('heading', { level: 3 }) ?? false,
        isHeading4: ctx.editor.isActive('heading', { level: 4 }) ?? false,
        isHeading5: ctx.editor.isActive('heading', { level: 5 }) ?? false,
        isHeading6: ctx.editor.isActive('heading', { level: 6 }) ?? false,
        isBulletList: ctx.editor.isActive('bulletList') ?? false,
        isOrderedList: ctx.editor.isActive('orderedList') ?? false,
        isCodeBlock: ctx.editor.isActive('codeBlock') ?? false,
        isBlockquote: ctx.editor.isActive('blockquote') ?? false,
        canUndo: ctx.editor.can().chain().undo().run() ?? false,
        canRedo: ctx.editor.can().chain().redo().run() ?? false
      }
    }
  })

  return (
    <div className={clsx([styles.composer, styles.context, 'control-group'])}>
      <div className="button-group">
        <button
          onClick={() => composer.chain().focus().toggleBold().run()}
          disabled={!composerValue.canBold}
          className={clsx([composerValue.isBold ? 'is-active' : ''])}>
          Bold
        </button>
        <button
          onClick={() => composer.chain().focus().toggleItalic().run()}
          disabled={!composerValue.canItalic}
          className={composerValue.isItalic ? 'is-active' : ''}>
          Italic
        </button>
        <button
          onClick={() => composer.chain().focus().toggleStrike().run()}
          disabled={!composerValue.canStrike}
          className={composerValue.isStrike ? 'is-active' : ''}>
          Strike
        </button>
        <button
          onClick={() => composer.chain().focus().toggleCode().run()}
          disabled={!composerValue.canCode}
          className={composerValue.isCode ? 'is-active' : ''}>
          Code
        </button>
        <button onClick={() => composer.chain().focus().unsetAllMarks().run()}>
          Clear marks
        </button>
        <button onClick={() => composer.chain().focus().clearNodes().run()}>
          Clear nodes
        </button>
        <button
          onClick={() => composer.chain().focus().setParagraph().run()}
          className={composerValue.isParagraph ? 'is-active' : ''}>
          Paragraph
        </button>
        <button
          onClick={() =>
            composer.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={composerValue.isHeading1 ? 'is-active' : ''}>
          H1
        </button>
        <button
          onClick={() =>
            composer.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={composerValue.isHeading2 ? 'is-active' : ''}>
          H2
        </button>
        <button
          onClick={() =>
            composer.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={composerValue.isHeading3 ? 'is-active' : ''}>
          H3
        </button>
        <button
          onClick={() =>
            composer.chain().focus().toggleHeading({ level: 4 }).run()
          }
          className={composerValue.isHeading4 ? 'is-active' : ''}>
          H4
        </button>
        <button
          onClick={() =>
            composer.chain().focus().toggleHeading({ level: 5 }).run()
          }
          className={composerValue.isHeading5 ? 'is-active' : ''}>
          H5
        </button>
        <button
          onClick={() =>
            composer.chain().focus().toggleHeading({ level: 6 }).run()
          }
          className={composerValue.isHeading6 ? 'is-active' : ''}>
          H6
        </button>
        <button
          onClick={() => composer.chain().focus().toggleBulletList().run()}
          className={composerValue.isBulletList ? 'is-active' : ''}>
          Bullet list
        </button>
        <button
          onClick={() => composer.chain().focus().toggleOrderedList().run()}
          className={composerValue.isOrderedList ? 'is-active' : ''}>
          Ordered list
        </button>
        <button
          onClick={() => composer.chain().focus().toggleCodeBlock().run()}
          className={composerValue.isCodeBlock ? 'is-active' : ''}>
          Code block
        </button>
        <button
          onClick={() => composer.chain().focus().toggleBlockquote().run()}
          className={composerValue.isBlockquote ? 'is-active' : ''}>
          Blockquote
        </button>
        <button
          onClick={() => composer.chain().focus().setHorizontalRule().run()}>
          Horizontal rule
        </button>
        <button onClick={() => composer.chain().focus().setHardBreak().run()}>
          Hard break
        </button>
        <button
          onClick={() => composer.chain().focus().undo().run()}
          disabled={!composerValue.canUndo}>
          Undo
        </button>
        <button
          onClick={() => composer.chain().focus().redo().run()}
          disabled={!composerValue.canRedo}>
          Redo
        </button>
      </div>
    </div>
  )
}
