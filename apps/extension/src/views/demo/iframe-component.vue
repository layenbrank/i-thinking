<script setup lang="ts">
import { RootDOMstringify } from './DOMstringify.ts'

defineOptions({
  name: 'iframe-component'
})

const iframeRef = useTemplateRef<HTMLIFrameElement>('iframeRef')

const DOMStringify = ref(
  RootDOMstringify.replace(
    '</body>',
    `
		</body>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				// 发送消息给父窗口
				window.parent.postMessage({ type: 'iframe-loaded', payload: 'Iframe content loaded' }, '*');
			});
		<\/script>
		`
  )
)

function handleIframeLoad() {
  console.log('Iframe loaded')
}

onMounted(function () {
  const iframe = iframeRef.value
  if (!iframe?.contentWindow) return
  iframe.contentWindow.postMessage('render-markdown', '*')
})

defineExpose({
  iframeRef
})
</script>

<template>
  <div class="iframe-component">
    <iframe
      ref="iframeRef"
      src="https://localhost:1024"
      :srcdoc="DOMStringify"
      @load="handleIframeLoad"
      frameborder="0"
      sandbox="allow-scripts allow-popups">
      asdasklfsdklnf
    </iframe>
  </div>
</template>

<style lang="scss" scoped>
.iframe-component {
  width: 100%;
  height: 100%;

  iframe {
    width: 100%;
    height: 100%;
  }
}
</style>
