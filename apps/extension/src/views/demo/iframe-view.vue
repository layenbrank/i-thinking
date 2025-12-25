<script setup lang="ts">
import { MARKDOWN } from '@/constants/constant.ts'
import { http } from '@/utils/http/http.ts'
import { HttpHeaders } from '@ngify/http'
import dompurify from 'dompurify'
import hljs from 'highlight.js'
import { marked } from 'marked'
import { DOMstringify } from './DOMstringify.ts'
import IframeComponent from './iframe-component.vue'

defineOptions({
  name: 'iframe-view'
})

const iframeComponentRef = useTemplateRef<typeof IframeComponent>('iframeComponentRef')

function sendMessage() {
  const iframeWindow = iframeComponentRef.value?.iframeRef?.contentWindow
  if (!iframeWindow) console.warn('iframeWindow', iframeWindow)

  if (!iframeWindow) return
  const content = marked.parse(MARKDOWN, { async: false })

  // 匹配body 结束签 并在之后插入脚本

  const sanitizedContent = dompurify.sanitize(content)

  // console.log( 'sanitizedContent', sanitizedContent )

  // iframeWindow.postMessage(
  // 	{
  // 		type: 'render-markdown',
  // 		payload: sanitizedContent
  // 	},
  // 	'*' // 允许所有源，但建议指定具体源以提高安全性
  // )
  // 发送消息，* 表示允许所有源，但建议指定具体源
  iframeWindow.postMessage({ type: 'render-markdown', payload: sanitizedContent }, '*')
}

function onMessage(event: MessageEvent) {
  const { data, origin } = event

  console.log('[MAIN APP] Received message from iframe:', event, data, 'from origin:', origin)
}

function handleSendMsg() {
  const data = new FormData()
  data.append('message', '帮我写一段介绍 Vue3 的文字，要求不少于200字。')
  data.append('chatId', 'user-123')
  http
    .post('/go/ai/chat/multi-turn', data, {
      // headers: new HttpHeaders().set('Content- 		', value),
      // headers: {
      // 	'Content-Type': 'multipart/form-data'
      // }
    })
    .subscribe(function (response) {
      console.log('response', response)
    })
}

onMounted(function () {
  window.addEventListener('message', onMessage)
})

onUnmounted(function () {
  window.removeEventListener('message', onMessage)
})
</script>

<template>
  <div class="iframe-view">
    <a-button
      type="primary"
      @click="sendMessage"
      >向 iframe 发送消息</a-button
    >
    <a-button @click="handleSendMsg">test</a-button>
    <IframeComponent ref="iframeComponentRef" />
  </div>
</template>

<style lang="scss" scoped>
.iframe-view {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;

  iframe {
    width: 100%;
    height: 100%;
    flex: 1;
  }
}
</style>
