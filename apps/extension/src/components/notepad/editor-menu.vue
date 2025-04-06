<script setup lang="ts">
import { Editor } from '@tiptap/vue-3'

interface EditorMenuItem {
  id: string
  label: string
  icon?: string
  action: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
}

const props = withDefaults(
  defineProps<{
    editor: Editor | undefined
  }>(),
  {
    editor: undefined
  }
)

const editorMenuItems: EditorMenuItem[] = [
  {
    id: 'bold',
    label: '粗体',
    action(editor) {
      return editor.chain().focus().toggleBold().run()
    },
    isActive: editor => editor.isActive('bold')
  },
  {
    id: 'italic',
    label: '斜体',
    action(editor) {
      return editor.chain().focus().toggleItalic().run()
    },
    isActive: editor => editor.isActive('italic')
  },
  {
    id: 'strike',
    label: '删除线',
    action(editor) {
      return editor.chain().focus().toggleStrike().run()
    },
    isActive: editor => editor.isActive('strike')
  },
  {
    id: 'code',
    label: '代码',
    action(editor) {
      return editor.chain().focus().toggleCode().run()
    },
    isActive: editor => editor.isActive('code')
  },
  {
    id: 'clearMarks',
    label: '清除标记',
    action(editor) {
      return editor.chain().focus().unsetAllMarks().run()
    }
  },
  {
    id: 'clearNodes',
    label: '清除节点',
    action(editor) {
      return editor.chain().focus().clearNodes().run()
    }
  },
  {
    id: 'paragraph',
    label: '段落',
    action(editor) {
      return editor.chain().focus().setParagraph().run()
    },
    isActive: editor => editor.isActive('paragraph')
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `h${i + 1}`,
    label: `标题${i + 1}`,
    action(editor: Editor) {
      return editor
        .chain()
        .focus()
        .toggleHeading({ level: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 })
        .run()
    },
    isActive: (editor: Editor) => editor.isActive('heading', { level: i + 1 })
  })),
  {
    id: 'bulletList',
    label: '无序列表',
    action(editor) {
      return editor.chain().focus().toggleBulletList().run()
    },
    isActive: editor => editor.isActive('bulletList')
  },
  {
    id: 'orderedList',
    label: '有序列表',
    action(editor) {
      return editor.chain().focus().toggleOrderedList().run()
    },
    isActive: editor => editor.isActive('orderedList')
  },
  {
    id: 'codeBlock',
    label: '代码块',
    action(editor) {
      return editor.chain().focus().toggleCodeBlock().run()
    },
    isActive: editor => editor.isActive('codeBlock')
  },
  {
    id: 'blockquote',
    label: '引用',
    action(editor) {
      return editor.chain().focus().toggleBlockquote().run()
    },
    isActive: editor => editor.isActive('blockquote')
  },
  {
    id: 'horizontalRule',
    label: '分隔线',
    action(editor) {
      return editor.chain().focus().setHorizontalRule().run()
    }
  },
  {
    id: 'hardBreak',
    label: '换行',
    action(editor) {
      return editor.chain().focus().setHardBreak().run()
    }
  },
  {
    id: 'textAlign',
    label: '对齐',
    action(editor) {
      return editor.chain().focus().setTextAlign('left').run()
    },
    isActive(editor) {
      return editor.isActive({ textAlign: 'left' })
    }
  },
  {
    id: 'textAlignCenter',
    label: '居中',
    action(editor) {
      return editor.chain().focus().setTextAlign('center').run()
    },
    isActive(editor) {
      return editor.isActive({ textAlign: 'center' })
    }
  },
  {
    id: 'textAlignRight',
    label: '右对齐',
    action(editor) {
      return editor.chain().focus().setTextAlign('right').run()
    },
    isActive(editor) {
      return editor.isActive({ textAlign: 'right' })
    }
  },
  {
    id: 'textAlignJustify',
    label: '两端对齐',
    action(editor) {
      return editor.chain().focus().setTextAlign('justify').run()
    },
    isActive(editor) {
      return editor.isActive({ textAlign: 'justify' })
    }
  },
  {
    id: 'undo',
    label: '撤销',
    action(editor) {
      return editor.chain().focus().undo().run()
    }
  },
  {
    id: 'redo',
    label: '重做',
    action(editor) {
      return editor.chain().focus().redo().run()
    }
  }
]

function handleClick(item: EditorMenuItem) {
  if (props.editor) {
    item.action(props.editor)
  }
}

function isActive(item: EditorMenuItem): boolean {
  if (!props.editor || !item.isActive) return false
  return item.isActive(props.editor)
}
</script>

<template>
  <div class="control-group">
    <div class="button-group">
      <button
        v-for="item in editorMenuItems"
        :key="item.id"
        class="menu-button"
        :class="{ 'is-active': isActive(item) }"
        @click="handleClick(item)"
        :title="item.label"
      >
        <span class="button-label">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.control-group {
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: none;
  border-radius: 0.25rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.is-active {
    background: var(--primary-color);
    color: #4080ff;
  }

  .button-label {
    white-space: nowrap;
  }
}
</style>
