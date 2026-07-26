<script setup lang="ts">
import { useMarkdownStore } from '@/stores/markdown.ts'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import MarkdownImage from '@tiptap/extension-image'
import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list'
import Mention from '@tiptap/extension-mention'
import { TableCell, TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent as MarkdownTiptap, VueNodeViewRenderer } from '@tiptap/vue-3'
import type { Key } from 'ant-design-vue/es/_util/type'
import CSS from 'highlight.js/lib/languages/css'
import JavaScript from 'highlight.js/lib/languages/javascript'
import TypeScript from 'highlight.js/lib/languages/typescript'
import HTML from 'highlight.js/lib/languages/xml'
import { throttle } from 'lodash-es'
import { all, createLowlight as definelowlight } from 'lowlight'
import { from, take } from 'rxjs'
import PlusOutlined from '~icons/ant-design/plus-outlined'
import { ColorHighlighter, MetadataExtension, SmilieReplacer } from './extension.ts'
import MarkdownCodeBlock from './markdown-code-block.vue'
import MarkdownControl from './markdown-control.vue'
import Suggestion from './markdown-mention.ts'
// import MarkdownBubble from './markdown-bubble.vue'
// import MarkdownFloating from './markdown-floating.vue'
// import Document from '@tiptap/extension-document'

defineOptions({
  name: 'markdown-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

// const editor = useEditor()

const store = useMarkdownStore()
const editor = shallowRef<Editor>()

const markdown = computed(function () {
  return store.markdowns?.find(function (value) {
    return value.id === store.activeKey
  })
})

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      // extend the existing attributes …
      ...this.parent?.(),

      // and add a new one …
      backgroundColor: {
        default: null,
        parseHTML(element) {
          return element.getAttribute('data-background-color')
        },
        renderHTML(attributes) {
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`
          }
        }
      }
    }
  }
})

const CustomTaskItem = TaskItem.extend({
  content: 'inline*'
})

const lowlight = definelowlight(all)

lowlight.register('html', HTML)
lowlight.register('css', CSS)
lowlight.register('js', JavaScript)
lowlight.register('ts', TypeScript)

function logger(label: string, msg: any) {
  console.log(
    `%c ${label} %c`,
    'background-color: #1e90ff; padding: 1px; border-radius: 4px; color: #ffffff; border: 1px solid #1e90ff;',
    msg
  )
}

// const unwatch = watch(
// 	() => store.markdowns,
// 	function (values) {
// 		if (values) unwatch.stop()
// 		if (!values) return
// 		const [value] = values
// 		if (!editor.value) return
// 		if (!value) buildMarkdown()
// 		else {
// 			editor.value.commands.setMetadata({
// 				id: value.id,
// 				createdAt: value.createdAt,
// 				updatedAt: value.updatedAt
// 			})
// 			editor.value.commands.setContent(value)
// 			// activeKey.value = value.id
// 			store.activeKey = value.id
// 		}
// 	}
// )

// const throttle = (func: Function, limit: number) => {
// 	let inThrottle: boolean
// 	return function (this: any) {
// 		const args = arguments
// 		// eslint-disable-next-line @typescript-eslint/no-this-alias
// 		const context = this
// 		if (!inThrottle) {
// 			func.apply(context, args)
// 			inThrottle = true
// 			setTimeout(() => (inThrottle = false), limit)
// 		}
// 	}
// }

function buildMarkdown() {
  if (!editor.value) return
  const value = store.toGenerate()
  const content = editor.value.getJSON()

  editor.value.commands.setMetadata({
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    index: value.index ?? 1
  })

  value.content = content.content ?? []
  void store.toInsert(value)

  store.activeKey = value.id
}

const toUpdate = throttle(function () {
  if (!editor.value) return

  // 获取文档内容
  const content = editor.value.getJSON()

  // 获取存储的元数据
  const metadata = editor.value.storage.metadata

  const value = {
    ...content,
    id: metadata.id,
    updatedAt: Date.now(),
    index: metadata.index ?? 1,
    createdAt: metadata.createdAt
  } as Markdown

  if (value.id) return store.toUpdate(value)
  else return buildMarkdown()
  // else {
  // 	// 创建新文档时设置元数据
  // 	editor.value.commands.setMetadata({
  // 		id: crypto.randomUUID(),
  // 		createdAt: Date.now(),
  // 		updatedAt: Date.now()
  // 	})

  // 	// 重新获取更新后的数据
  // 	const content = editor.value.getJSON()
  // 	const metadata = editor.value.storage.metadata
  // 	const value: Markdown = {
  // 		...content,
  // 		id: metadata.id,
  // 		createdAt: metadata.createdAt,
  // 		updatedAt: metadata.updatedAt
  // 	}

  // 	void store.toInsert(value)
  // }
}, 3000)

function updateActiveKey(value: Key) {
  if (typeof value !== 'string') return
  store.activeKey = value
  console.log('ActiveKey', value)
  from(store.toRead(value))
    .pipe(take(1))
    .subscribe(function (markdown) {
      if (!editor.value) return
      if (!markdown) return editor.value.commands.setContent('')
      editor.value.commands.setMetadata({
        id: markdown.id,
        index: markdown.index ?? 1,
        createdAt: markdown.createdAt,
        updatedAt: markdown.updatedAt
      })
      editor.value.commands.setContent(markdown)
    })
}

function initialize() {
  editor.value = new Editor({
    content: markdown.value ?? '',
    editorProps: {
      attributes: {
        spellcheck: 'false'
      }
    },
    extensions: [
      StarterKit.configure({
        undoRedo: {
          depth: 100,
          newGroupDelay: 300
        },
        bold: {
          HTMLAttributes: {
            class: 'markdown-bold',
            'data-type': 'bold'
          }
        },
        code: {
          HTMLAttributes: {
            class: 'markdown-code',
            'data-type': 'code'
          }
        },
        codeBlock: false,
        italic: {
          HTMLAttributes: {
            class: 'markdown-italic',
            'data-type': 'italic'
          }
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'markdown-link',
            'data-type': 'link'
          }
        },
        dropcursor: {
          color: 'var(--blue-6)',
          width: 3,
          class: 'markdown-dropcursor'
        },
        strike: {
          HTMLAttributes: {
            class: 'markdown-strike',
            'data-type': 'strike'
          }
        },
        paragraph: {
          HTMLAttributes: {
            class: 'markdown-paragraph',
            'data-type': 'paragraph'
          }
        },
        heading: {
          HTMLAttributes: {
            class: 'markdown-heading',
            'data-type': 'heading'
          },
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'markdown-mention',
          'data-type': 'mention'
        },
        suggestion: Suggestion
      }),
      Highlight.extend({
        addOptions() {
          return {
            ...this.parent?.(),
            multicolor: true,
            HTMLAttributes: {
              class: 'markdown-highlight',
              'data-type': 'highlight'
            }
          }
        }
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return VueNodeViewRenderer(MarkdownCodeBlock)
        }
      }).configure({
        lowlight,
        HTMLAttributes: {
          class: 'markdown-code-block',
          'data-type': 'code-block'
        },
        defaultLanguage: 'javascript',
        languageClassPrefix: 'language-'
      }),
      Color.configure({
        types: [TextStyle.name, ListItem.name]
      }),
      TextStyle.configure({
        mergeNestedSpanStyles: true,
        HTMLAttributes: {
          class: 'markdown-text-style',
          'data-type': 'text-style'
        }
      }),
      TableKit.configure({
        table: {
          resizable: true
        },
        tableCell: false
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      MetadataExtension,
      TaskList,
      Typography,
      MarkdownImage,
      CustomTaskItem,
      CustomTableCell,
      ColorHighlighter,
      SmilieReplacer
    ]
  })
}

onMounted(function () {
  initialize()

  if (!editor.value) return
  if (markdown.value) {
    editor.value.commands.setMetadata({
      id: markdown.value.id,
      index: markdown.value.index ?? 1,
      createdAt: markdown.value.createdAt,
      updatedAt: markdown.value.updatedAt
    })
    editor.value.commands.setContent(markdown.value ?? '')
  }
  // if (store.markdown === undefined) buildMarkdown()
  editor.value.on('update', toUpdate)
})

onBeforeUnmount(function () {
  if (!editor.value) return
  void toUpdate()
  editor.value.off('update', toUpdate)
  editor.value.destroy()
})
</script>

<template>
  <div class="markdown-overlay">
    <div class="markdown-tabs">
      <aside class="markdown-aside">
        <div class="markdown-nav">
          <div class="markdown-aside-list">
            <template
              v-for="value in store.markdowns"
              :key="value.id">
              <div
                :class="[
                  'markdown-aside-item',
                  {
                    'is-active': store.activeKey === value.id
                  }
                ]"
                @click="updateActiveKey(value.id)">
                <span>{{ store.findHead(value) }}</span>
              </div>
            </template>
            <a-button
              type="dashed"
              @click="buildMarkdown"
              class="insert-button">
              <plus-outlined />
            </a-button>
          </div>
        </div>
      </aside>
      <main class="markdown-main">
        <div class="markdown-main-item">
          <markdown-control
            :editor="editor"
            v-if="editor" />
          <markdown-tiptap
            :editor="editor"
            v-if="editor"
            class="markdown-tiptap" />
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'markdown.scss' as *;

.markdown-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  // flex-direction: column;

  $markdown-w: 200px;
  $markdown-p: 8px;

  .markdown-tiptap {
    * {
      outline: 0;
    }
  }

  .insert-button {
    position: absolute;
    bottom: 16px;
    transform: translateX(-100%);
    left: $markdown-w - 16px;
  }

  .markdown {
    &-tabs {
      width: 100%;
      height: 100%;
      column-gap: 2px;
      display: flex;
    }

    &-aside {
      width: $markdown-w;
      height: 100%;
      padding-inline: 4px;
      padding-block: $markdown-p;
      position: relative;
      box-shadow: 2px 0 0 0 #0000001a;

      &-list {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        row-gap: 8px;
      }

      &-item {
        height: 40px;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding-inline-start: 12px;
        border-radius: 6px;

        transition:
          color 300ms cubic-bezier(0.165, 0.84, 0.44, 1),
          background-color 300ms cubic-bezier(0.165, 0.84, 0.44, 1);

        &:hover,
        &.is-active {
          background-color: rgba($color: #000000, $alpha: 0.15);
          color: rgba($color: #4080ff, $alpha: 1);
        }
      }
    }

    &-nav {
      width: 100%;
      height: 100%;
      scrollbar-width: none;
      overflow: hidden scroll;
      scroll-behavior: smooth;
      border-radius: var(--magnetic-tile-global-overlay-round);
    }

    .insert-button {
      position: absolute;
      bottom: 16px;
      transform: translateX(-100%);
      left: $markdown-w - 16px;
    }

    &-main {
      width: calc(100% - #{$markdown-w - 2px});
      padding: $markdown-p;

      &-item {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }
  }
}
</style>
