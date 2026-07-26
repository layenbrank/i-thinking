<script setup lang="ts">
import { GeneratorJSON, POST_COMMUNICATE } from '@/apis/intelligence.ts'
import { onKeyDown } from '@vueuse/core'
import { throttle } from 'lodash-es'

type CommunicateParams = MagneticTile.Intelligence.Communicate.Params

defineOptions({
  name: 'intelligence-overlay'
})

// const props = withDefaults(defineProps<{}>(), {})
// const emits = defineEmits<{}>()

const sessionRef = useTemplateRef('sessionRef')
const contenteditableRef = useTemplateRef('contenteditableRef')

const session = ref('assistant:')
const question = ref('')
const params = ref<CommunicateParams>({
  model: 'deepseek-r1:8b',
  stream: true,
  raw: true,
  messages: [
    // {
    // 	role: 'user',
    // 	content: '你好'
    // 	// content: '[INST] 你好 [/INST]'
    // }
  ]
})

// 标记是否在中文输入法组合过程中
const isComposing = ref(false)

const delay = throttle(function () {
  if (!sessionRef.value) return
  sessionRef.value.scrollIntoView({
    block: 'end',
    behavior: 'smooth'
  })
}, 30)

async function toTokens() {
  params.value.messages.push({
    role: 'user',
    content: question.value
  })
  const generators = GeneratorJSON(POST_COMMUNICATE.bind(null, params.value))

  for await (const generator of generators) {
    if (generator.message.content.startsWith('<think>')) continue
    if (generator.message.content.endsWith('</think>')) continue

    session.value += generator.message.content

    delay()
  }
}

onKeyDown(
  'Enter',
  function (event) {
    if (event.shiftKey) return
    event.preventDefault()
    const target = event.target as HTMLDivElement
    const text = target.textContent.trim()
    if (!text) return
    session.value += `\n\nuser: ${text}\n\nassistant: `
    void toTokens().then(function () {
      target.textContent = ''
    })
  },
  {
    target: () => contenteditableRef.value
  }
)

function onUpdateValue(value: string) {
  // 如果在中文输入法组合过程中，不更新值
  if (isComposing.value) return

  console.log('[onUpdateValue]', value)

  if (value.length < 500) return (question.value = value)
  // question.value = value.slice(0, 500)

  // if (!contenteditableRef.value) return
  // // 将光标移动到末尾
  // const range = document.createRange()
  // const sel = window.getSelection()
  // range.selectNodeContents(contenteditableRef.value)
  // range.collapse(false)
  // sel?.removeAllRanges()
  // sel?.addRange(range)
}

function onInput(event: Event) {
  const target = event.target as HTMLDivElement
  const text = target.textContent || ''
  console.log('[onInput]', text)

  onUpdateValue(text)
}

// 中文输入法开始
function onCompositionBegin(event: CompositionEvent) {
  isComposing.value = true
}

// 中文输入法更新
function onCompositionUpdate(event: CompositionEvent) {
  const target = event.target as HTMLDivElement
  const text = target.textContent || ''
  console.log('[onCompositionUpdate]', text)

  onUpdateValue(text)
}

// 中文输入法结束
function onCompositionFinal(event: CompositionEvent) {
  isComposing.value = false
}

function onPaste(event: ClipboardEvent) {
  // event.preventDefault()

  const text = event.clipboardData?.getData('text/plain')
  console.log(
    '[onPaste]',
    text,
    'types',
    event.clipboardData?.types,
    'files',
    event.clipboardData?.files
  )

  if (text) onUpdateValue(text)

  // if (!text) return
  // const target = event.target as HTMLDivElement
  // // 获取光标位置
  // const selection = window.getSelection()
  // if (!selection || selection.rangeCount === 0) {
  // 	target.textContent += text
  // } else {
  // 	const range = selection.getRangeAt(0)
  // 	range.deleteContents()
  // 	const textNode = document.createTextNode(text)
  // 	range.insertNode(textNode)
  // 	// 将光标移动到插入内容的末尾
  // 	range.setStartAfter(textNode)
  // 	range.collapse(true)
  // 	selection.removeAllRanges()
  // 	selection.addRange(range)
  // }
  // question.value = text
}
</script>

<template>
  <div class="intelligence-overlay">
    <div class="histories-area">
      <div class="histories">
        <div
          v-for="value in 30"
          :key="value"
          class="history">
          {{ value }}
        </div>
        <div class="history">{{ 10 }}</div>
      </div>
    </div>
    <div class="thinking-area">
      <div class="visual-area">
        <div class="visual">
          <div
            ref="sessionRef"
            class="session-area">
            {{ session }}
          </div>
        </div>
      </div>
      <div class="interactive-area">
        <div
          ref="contenteditableRef"
          @input="onInput"
          @paste="onPaste"
          @compositionstart="onCompositionBegin"
          @compositionend="onCompositionFinal"
          @compositionupdate="onCompositionUpdate"
          contenteditable
          data-placeholder="请输入内容，Shift + Enter 换行"
          class="contenteditable"
          :inner-text="question"></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.intelligence-overlay {
  $columns: 24;
  $begin: 1;
  $final: 4;

  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat($columns, 1fr);

  .histories-area {
    grid-column: $begin / span $final;
    background-color: rgba($color: #f5b9b9, $alpha: 1);
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden scroll;
    scroll-behavior: smooth;
  }

  .histories {
    display: flex;
    min-height: 0;
    flex-direction: column;
  }

  .history {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }
  }

  .thinking-area {
    grid-column: ($final + 1) / span ($columns - $final);
    background-color: rgba($color: #b9d8f5, $alpha: 1);
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: repeat(24, 1fr);
  }

  .visual-area {
    width: 100%;
    height: 100%;
    padding: 16px;
    grid-row: 1 / span 18;
    min-height: 0;
    background-color: rgba($color: #d8f5b9, $alpha: 1);
  }

  .visual {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden scroll;
    scroll-behavior: smooth;
    background-color: rgba($color: #b9f5d8, $alpha: 0.6);

    *,
    *::before,
    *::after {
      user-select: text;
    }
  }

  .session-area {
    width: 100%;
    // height: 100%;
    // min-height: 0;
    white-space: pre-wrap;
    font-size: 14px;
    word-wrap: break-word;
    word-break: break-all;
    color: #333;
  }

  .interactive-area {
    width: 100%;
    height: 100%;
    grid-row: 19 / span 6;
    background-color: rgba($color: #f5b9e1, $alpha: 0.6);
  }

  .contenteditable {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden scroll;
    scroll-behavior: smooth;
    padding: 8px 12px;
    font-size: 14px;
    color: #333;
    background-color: rgba($color: #f0ebae, $alpha: 1);
    // outline: none;
    resize: none;
    // border: none;

    &:empty::before {
      content: attr(data-placeholder);
      color: #c0c4cc;
    }

    &:focus:empty:before {
      color: #a8abb2;
    }
  }
}
</style>
