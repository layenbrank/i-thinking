<script setup lang="ts">
import { DOMstringify } from './DOMstringify'
import DemoMarkdownRenderer from './components/demo-markdown-renderer.vue'

defineOptions({
  name: 'intelligence-view'
})

const previewVisible = ref(false)
const preview = reactive<{ code: string; lang?: string | null }>({ code: '', lang: null })

function onPreview(payload: { code: string; lang?: string | null }) {
  preview.code = payload.code
  preview.lang = payload.lang ?? null
  previewVisible.value = true
}

function onCopy(payload: { success: boolean }) {
  if (payload.success) {
    // 这里保留为控制台提示，后续可替换为全局消息组件
    console.log('复制成功')
  } else {
    console.warn('复制失败')
  }
}
</script>

<template>
  <div class="intelligence-view">
    <demo-markdown-renderer
      :source="DOMstringify"
      @preview="onPreview"
      @copy="onCopy">
      <!-- 自定义代码块工具栏示例 -->
      <template #code-toolbar="{ preview, copy, lang }">
        <button
          class="preview-button"
          @click="preview">
          预览
        </button>
        <button
          class="preview-button"
          style="background: #10b981"
          @click="copy">
          复制
        </button>
        <span style="margin-left: 8px; color: #6b7280">{{ lang || 'text' }}</span>
      </template>
    </demo-markdown-renderer>

    <!-- 轻量预览弹层（演示用） -->
    <div
      v-if="previewVisible"
      class="preview-overlay"
      @click.self="previewVisible = false">
      <div class="preview-content">
        <div class="preview-header">
          <span>代码预览（{{ preview.lang || 'text' }}）</span>
          <button
            class="close-button"
            @click="previewVisible = false">
            关闭
          </button>
        </div>
        <pre><code>{{ preview.code }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.intelligence-view {
  width: 100%;
  height: 100%;

  * {
    user-select: text;
  }
}
</style>
<style lang="scss">
@use '@/views/demo/normalize.scss' as *;

.intelligence-view {
  @extend %normalize;

  .preview-button {
    padding: 6px 16px;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .preview-content {
      width: min(900px, 90vw);
      height: min(70vh, 700px);
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: #f5f5f5;

        .close-button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background: #ef4444;
          color: #fff;
          cursor: pointer;
        }
      }

      pre {
        flex: 1;
        margin: 0;
        padding: 12px;
        background: #0d1117;
        color: #e5e7eb;
        overflow: auto;
      }
    }
  }
}
</style>
