<script setup lang="tsx">
import type { Editor } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'

defineOptions({
  name: 'markdown-control'
})

const props = withDefaults(
  defineProps<{
    editor: Editor
  }>(),
  {}
)

interface Configure {
  text: string
  className: string
  active: boolean
  command: () => void
  disabled: boolean
}

const { t } = useI18n()

const configurations = reactive<Configure[]>([
  {
    text: t('General.Undo'),
    className: 'button-control',
    active: false,
    command() {
      return props.editor.chain().focus().undo().run()
    },
    disabled: false
  },
  {
    text: t('General.Redo'),
    className: 'button-control',
    active: false,
    command() {
      return props.editor.chain().focus().redo().run()
    },
    disabled: false
  },
  {
    text: t('General.Bold'),
    className: 'button-control',
    active: props.editor.isActive('bold'),
    command() {
      return props.editor.chain().focus().toggleBold().run()
    },
    disabled: !props.editor.can().chain().focus().toggleBold().run()
  },
  {
    text: t('General.Italic'),
    className: 'button-control',
    active: props.editor.isActive('italic'),
    command() {
      return props.editor.chain().focus().toggleItalic().run()
    },
    disabled: !props.editor.can().chain().focus().toggleItalic().run()
  },
  {
    text: t('General.Strike'),
    className: 'button-control',
    active: props.editor.isActive('strike'),
    command() {
      return props.editor.chain().focus().toggleStrike().run()
    },
    disabled: !props.editor.can().chain().focus().toggleStrike().run()
  },
  {
    text: t('General.Code'),
    className: 'button-control',
    active: props.editor.isActive('code'),
    command() {
      return props.editor.chain().focus().toggleCode().run()
    },
    disabled: !props.editor.can().chain().focus().toggleCode().run()
  },
  {
    text: t('General.Clear-Marks'),
    className: 'button-control',
    active: false,
    command() {
      return props.editor.chain().focus().unsetAllMarks().run()
    },
    disabled: false
  },
  {
    text: t('General.Clear-Nodes'),
    className: 'button-control',
    active: false,
    command() {
      return props.editor.chain().focus().clearNodes().run()
    },
    disabled: false
  },
  {
    text: t('General.Paragraph'),
    className: 'button-control',
    active: props.editor.isActive('paragraph'),
    command() {
      return props.editor.chain().focus().setParagraph().run()
    },
    disabled: false
  },
  {
    text: t('General.Heading', { level: 1 }),
    className: 'button-control',
    active: props.editor.isActive('heading', { level: 1 }),
    command() {
      return props.editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    disabled: false
  },
  {
    text: t('General.Heading', { level: 2 }),
    className: 'button-control',
    active: props.editor.isActive('heading', { level: 2 }),
    command() {
      return props.editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    disabled: false
  },
  {
    text: t('General.Heading', { level: 3 }),
    className: 'button-control',
    active: props.editor.isActive('heading', { level: 3 }),
    command() {
      return props.editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    disabled: false
  },
  {
    text: t('General.Heading', { level: 4 }),
    className: 'button-control',
    active: props.editor.isActive('heading', { level: 4 }),
    command() {
      return props.editor.chain().focus().toggleHeading({ level: 4 }).run()
    },
    disabled: false
  },
  {
    text: t('General.Heading', { level: 5 }),
    className: 'button-control',
    active: props.editor.isActive('heading', { level: 5 }),
    command() {
      return props.editor.chain().focus().toggleHeading({ level: 5 }).run()
    },
    disabled: false
  },
  {
    text: t('General.Heading', { level: 6 }),
    className: 'button-control',
    active: props.editor.isActive('heading', { level: 6 }),
    command() {
      return props.editor.chain().focus().toggleHeading({ level: 6 }).run()
    },
    disabled: false
  },
  {
    text: t('General.Bulleted'),
    className: 'button-control',
    active: props.editor.isActive('bulletList'),
    command() {
      return props.editor.chain().focus().toggleBulletList().run()
    },
    disabled: false
  },
  {
    text: t('General.Ordered'),
    className: 'button-control',
    active: props.editor.isActive('orderedList'),
    command() {
      return props.editor.chain().focus().toggleOrderedList().run()
    },
    disabled: false
  },
  {
    text: t('General.Code-Block'),
    className: 'button-control',
    active: props.editor.isActive('codeBlock'),
    command() {
      return props.editor.chain().focus().toggleCodeBlock().run()
    },
    disabled: false
  },
  {
    text: t('General.Blockquote'),
    className: 'button-control',
    active: props.editor.isActive('blockquote'),
    command() {
      return props.editor.chain().focus().toggleBlockquote().run()
    },
    disabled: false
  },
  {
    text: t('General.Horizontal-Rule'),
    className: 'button-control',
    active: false,
    command() {
      return props.editor.chain().focus().setHorizontalRule().run()
    },
    disabled: false
  },
  {
    text: t('General.Hard-Break'),
    className: 'button-control',
    active: false,
    command() {
      return props.editor.chain().focus().setHardBreak().run()
    },
    disabled: false
  },

  {
    text: t('General.Purple'),
    className: 'button-control',
    active: props.editor.isActive('textStyle', {
      color: '#958DF1'
    }),
    command() {
      return props.editor.chain().focus().setColor('#958DF1').run()
    },
    disabled: false
  },
  {
    text: t('General.Export'),
    className: 'button-control',
    active: false,
    command() {
      const json = props.editor.getJSON()
      console.log('json', json)
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'markdown.json'
      a.click()
      URL.revokeObjectURL(url)
      return json
    },
    disabled: false
  }
])
</script>

<template>
  <div class="markdown-control">
    <template
      v-for="configuration in configurations"
      :key="configuration.text">
      <a-button
        type="dashed"
        size="small"
        @click="configuration.command()"
        :disabled="configuration.disabled"
        :class="[
          configuration.className,
          {
            'is-active': configuration.active
          }
        ]">
        {{ configuration.text }}
      </a-button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.markdown-control {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, 80px);
  gap: 8px;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0%;
  align-content: space-between;
  justify-content: space-between;

  :deep(.button-control) {
    width: 100%;
    height: 32px;
    text-align: center;

    span {
      line-height: 32px;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
