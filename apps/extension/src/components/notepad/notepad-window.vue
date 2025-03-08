<script setup lang="ts">
import { BubbleMenu, Editor, EditorContent, useEditor, FloatingMenu } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
// import Paragraph from '@tiptap/extension-paragraph'
// import Document from '@tiptap/extension-document'
// import Text from '@tiptap/extension-text'
// import Heading from '@tiptap/extension-heading'
// import Strike from '@tiptap/extension-strike'
// import Bold from '@tiptap/extension-bold'
// import Italic from '@tiptap/extension-italic'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'

import type { JSONContent, generateJSON, getDebugJSON } from '@tiptap/core'

import EditorMenu from './editor-menu.vue'
import type { ShallowRef } from 'vue'
import { debounce, throttle } from 'lodash-es'

defineOptions({
  name: 'AppWindow'
})

// const editor: ShallowRef<Editor | undefined, Editor | undefined> = useEditor({
const editor = useEditor({
  content: `
        <p>This isn’t highlighted.</s></p>
        <p><mark>But that one is.</mark></p>
        <p><mark style="background-color: red;">And this is highlighted too, but in a different color.</mark></p>
        <p><mark data-color="#ffa8a8">And this one has a data attribute.</mark></p>
      `,
  extensions: [
    // Text,
    // Document,
    // Strike,
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6]
      }
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    // Paragraph.configure({
    //   HTMLAttributes: {
    //     class: 'my-custom-paragraph',
    //   },
    // }),
    // Heading.configure({
    //   HTMLAttributes: {
    //     class: 'my-custom-heading',
    //   },
    //   levels: [1, 2, 3,4,5,6],
    // }),
    // Bold.extend({
    //   renderHTML({ HTMLAttributes }) {
    //     // Original:
    //     // return ['strong', HTMLAttributes, 0]
    //     return ['b', HTMLAttributes, 0]
    //   },
    // }),
    // Italic.extend({
    //   renderHTML({ HTMLAttributes }) {
    //     return ['i', HTMLAttributes, 0]
    //   },
    // }),
    Highlight.configure({
      HTMLAttributes: {
        class: 'my-custom-class'
      },
      multicolor: true
    })
  ],
  autofocus: true,
  editable: true,
  injectCSS: false,
  editorProps: {
    attributes(state) {
      return {
        class:
          'prose prose-sm sm:prose sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none max-w-none p-4',
        spellcheck: 'true'
      }
    }
  },
  onUpdate(props) {
    const json = props.editor.getJSON()
    console.log(json)
  },
  onSelectionUpdate(props) {
    console.log(props)
  }
})

// const editor = new Editor({
//   extensions: [StarterKit],
//   content: `
//         <p>This isn’t highlighted.</s></p>
//         <p><mark>But that one is.</mark></p>
//         <p><mark style="background-color: red;">And this is highlighted too, but in a different color.</mark></p>
//         <p><mark data-color="#ffa8a8">And this one has a data attribute.</mark></p>
//       `,
// })

onMounted(() => {
  editor.value?.commands.unsetHighlight()
  editor.value?.commands.setHighlight({ color: '#ffcc00' })
  editor.value?.commands.toggleHighlight()
  editor.value?.commands.toggleHighlight({ color: '#ffcc00' })
  editor.value?.commands.unsetHighlight()
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div v-if="editor" class="notepad-window">
    <!-- <EditorMenu v-resize="handleResize" v-if="editor" :editor="editor" /> -->

    <bubble-menu
      v-if="editor"
      class="bubble-menu"
      :tippy-options="{ duration: 100 }"
      :editor="editor"
    >
      <button
        @click="editor?.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor?.isActive('bold') }"
      >
        Bold
      </button>
      <button
        @click="editor?.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor?.isActive('italic') }"
      >
        Italic
      </button>
      <button
        @click="editor?.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor?.isActive('strike') }"
      >
        Strike
      </button>
    </bubble-menu>

    <floating-menu
      v-if="editor"
      class="floating-menu"
      :tippy-options="{ duration: 100 }"
      :editor="editor"
    >
      <button
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
      >
        H1
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
      >
        H2
      </button>
      <button
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
      >
        Bullet list
      </button>
    </floating-menu>

    <EditorContent
      :editor="editor"
      :style="{
        // height: rect && `calc(100% - ${rect.height.toFixed(2)}px)`
      }"
      class="notepad-edit"
    />
  </div>
</template>

<style lang="scss" scoped>
.notepad-window {
  @apply w-full h-full;
}

.notepad-edit {
  @apply w-full h-full overflow-x-hidden overflow-y-scroll;

  :deep(div[class*='tiptap ProseMirror']) {
    @apply h-full;
    :first-child {
      margin-top: 0;
    }

    mark {
      background-color: #faf594;
      border-radius: 0.4rem;
      box-decoration-break: clone;
      padding: 0.1rem 0.3rem;
    }

    /* List styles */
    ul,
    ol {
      padding: 0 1rem;
      margin: 1.25rem 1rem 1.25rem 0.4rem;

      li p {
        margin-top: 0.25em;
        margin-bottom: 0.25em;
      }
    }

    /* Heading styles */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      line-height: 1.1;
      margin-top: 2.5rem;
      text-wrap: pretty;
    }

    h1,
    h2 {
      margin-top: 3.5rem;
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.4rem !important;
    }

    h2 {
      font-size: 1.2rem !important;
    }

    h3 {
      font-size: 1.1rem !important;
    }

    h4,
    h5,
    h6 {
      font-size: 1rem !important;
    }

    /* Code and preformatted text styles */
    code {
      background-color: var(--purple-light);
      border-radius: 0.4rem;
      color: var(--black);
      font-size: 0.85rem;
      padding: 0.25em 0.3em;
    }

    pre {
      background: var(--black);
      border-radius: 0.5rem;
      color: var(--white);
      font-family: 'JetBrainsMono', monospace;
      margin: 1.5rem 0;
      padding: 0.75rem 1rem;

      code {
        background: none;
        color: inherit;
        font-size: 0.8rem;
        padding: 0;
      }
    }

    blockquote {
      border-left: 3px solid var(--gray-3);
      margin: 1.5rem 0;
      padding-left: 1rem;
    }

    hr {
      border: none;
      border-top: 1px solid var(--gray-2);
      margin: 2rem 0;
    }

    img {
      display: block;
      height: auto;
      margin: 1.5rem 0;
      max-width: 100%;

      &.ProseMirror-selectednode {
        outline: 3px solid var(--purple);
      }
    }

    /* Figure */
    .figure {
      align-items: start;
      border: 2px solid var(--black);
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 1rem 0;
      padding: 0.5rem;
      width: fit-content;

      > *:not(figcaption) {
        margin: 0;
        max-width: 100%;
      }

      &:has(figcaption:active) {
        border-color: var(--purple);
      }

      figcaption {
        border-radius: 0.5rem;
        border: 2px dashed #0d0d0d20;
        padding: 0.5rem;
        text-align: center;
        width: 100%;
      }
    }
  }
}

/* Bubble menu */
.bubble-menu {
  background-color: var(--white);
  border: 1px solid var(--gray-1);
  border-radius: 0.7rem;
  box-shadow: var(--shadow);
  display: flex;
  padding: 0.2rem;

  button {
    margin: 5px;
    padding: 0.275rem 0.425rem;
    border-radius: 0.3rem;
    background-color: unset;

    &:hover {
      background-color: var(--gray-3);
    }

    &.is-active {
      background-color: var(--purple);

      &:hover {
        background-color: var(--purple-contrast);
      }
    }
  }
}

/* Floating menu */
:global(.floating-menu) {
  display: flex;
  background-color: var(--gray-3);
  padding: 0.1rem;
  border-radius: 0.5rem;

  button {
    background-color: unset;

    &:hover {
      background-color: var(--gray-3);
    }

    &.is-active {
      background-color: var(--white);
      color: var(--purple);

      &:hover {
        color: var(--purple-contrast);
      }
    }
  }
}
</style>
