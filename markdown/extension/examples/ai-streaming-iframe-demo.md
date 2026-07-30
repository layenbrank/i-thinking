# 示例：AI 流式渲染 + Iframe 预览

本示例展示如何在父页面中调用 iframe 暴露的 API，进行 Markdown 渲染与 AI 流式渲染。

主文档：[../ai-streaming-iframe.md](../ai-streaming-iframe.md)

## 前置

- 已挂载 `apps/extension/src/views/iframe-view/iframe-view.vue`（或 demo 变体）
- 组件会在 `window.__iframeViewAPI` 暴露以下方法

```ts
interface IframeViewAPI {
  render(markdown: string): Promise<void>
  streamAI(params: Communicate.Params): Promise<void>
  clearCache(): void
  getStats(): RendererCacheStats
  getPerformance(): {
    current: PerformanceMetrics
    history: PerformanceMetrics[]
    summary: any
  }
}
```

## 基础渲染

```ts
await (window as any).__iframeViewAPI.render(`
# 快速开始

- 支持代码高亮、KaTeX、Mermaid
- 支持目录与元数据提取
`)
```

## 启动 AI 流式渲染

```ts
await (window as any).__iframeViewAPI.streamAI({
  model: 'your-model',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: '生成一个包含代码与数学公式的教程大纲' }
  ]
})
```

## 获取性能与缓存统计

```ts
const perf = (window as any).__iframeViewAPI.getPerformance()
console.log('FPS:', perf.current.fps)

const cache = (window as any).__iframeViewAPI.getStats()
console.table(cache.entries)
```

## 清空缓存

```ts
;(window as any).__iframeViewAPI.clearCache()
```
