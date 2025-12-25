# AI Streaming + Iframe Rendering 集成文档

本方案将大模型的流式响应（NDJSON）与 Markdown 渲染、iframe 隔离展示、插件化扩展、Worker 沙箱与性能监控进行整合，形成一套安全、可扩展、可观测的前端渲染基座。

## 架构概览

- iframe 容器：隔离渲染结果，仅允许执行脚本（`sandbox="allow-scripts"`），通过 `srcdoc` 注入 HTML。
- 渲染引擎：`useMarkdownRenderer`
  - Marked 渲染 + 插件钩子（beforeRender/afterRender）
  - 渲染缓存（访问次数与 TTL 清理）
  - 元数据提取（目录、链接、图片、代码块统计）
- 插件系统：`useMarkdownPlugin`
  - 生命周期管理、依赖/冲突校验
  - 内置插件：Highlight、KaTeX、Mermaid
- 跨上下文通信：`useCrossContextBridge`
  - RPC、心跳、超时控制、序列化
- 序列化：`useMessageSerializer`
  - 可传输对象提取、循环引用处理、特殊类型（Date/RegExp/Map/Set）
- Worker 沙箱：`useWorkerRuntime` + `plugin-runtime.worker.ts`
  - 插件隔离执行、错误上报、心跳健康检查
- 性能监控：`usePerformanceMonitor`
  - FPS、内存、响应时延、缓存命中率、Performance API

## 关键数据流

1. 触发流式通信
   - `GeneratorJSON<Communicate.Response>(POST_COMMUNICATE)` 打开 NDJSON 流
   - 对于每个 `chunk.message.content`：
     - 过滤 `<think>...</think>`
     - 累积到 `markdownContent`
     - 调用 `renderMarkdown(markdownContent)` 实时渲染

2. 渲染流程（`useMarkdownRenderer.render`）
   - 命中缓存则直接返回（记录命中计数）
   - 插件 `beforeRender` 预处理 Markdown
   - Marked 解析生成 HTML
   - 插件 `afterRender` 后处理 HTML（高亮/公式/图表）
   - 提取元数据，回填缓存与访问计数

3. 注入 iframe
   - 生成完整 HTML 模板（基础样式 + 渲染结果）
   - 设置 `iframe.srcdoc = htmlDoc`

## 安全策略

- iframe `sandbox` 仅允许 `allow-scripts`，禁止 `allow-same-origin` 以避免沙箱逃逸
- 父子页通信通过 `useCrossContextBridge`，校验 origin，并统一序列化与超时
- 渲染层默认 `sanitize: true`，插件需避免注入不受控脚本

## 性能策略

- 渲染缓存：命中优先、TTL 清理、按访问次数淘汰
- 插件懒加载（动态 import）
- requestIdleCallback 批调度（`useMessageBatcher` 可选）
- Performance API：render-start/end mark + measure

## 对外 API（在父页）

```ts
(window as any).__iframeViewAPI = {
  render: (markdown: string) => Promise<void>,
  streamAI: (params: Communicate.Params) => Promise<void>,
  clearCache: () => void,
  getStats: () => RendererCacheStats,
  getPerformance: () => {
    current: PerformanceMetrics,
    history: PerformanceMetrics[],
    summary: {...}
  }
}
```

- `render`：渲染任意 Markdown 文本
- `streamAI`：启动 AI NDJSON 流式渲染
- `clearCache`：清空渲染缓存
- `getStats`：返回缓存占用、条目访问计数等
- `getPerformance`：返回 FPS、平均响应时延、缓存命中率等

## 使用示例

```ts
// 在父页面中
await (window as any).__iframeViewAPI.render('# Hello')
await (window as any).__iframeViewAPI.streamAI({
  model: 'your-model-id',
  messages: [{ role: 'user', content: 'Explain Rust ownership with examples.' }]
})
const perf = (window as any).__iframeViewAPI.getPerformance()
console.log('FPS:', perf.current.fps)
```

## 插件开发指南（简述）

- 定义 `Plugin`：包含 `meta` 与 `hooks`
- 在 `beforeRender` 中处理原 Markdown（如自定义语法）
- 在 `afterRender` 中处理 HTML（注入样式、替换标记块）
- 在 `meta.dependencies/conflicts` 声明兼容性

## 常见问题

- 看到“allow-scripts + allow-same-origin 组合会逃逸”：已通过移除 `allow-same-origin` 解决
- NDJSON 字段取值：使用 `chunk.message.content` 而非平铺的 `chunk.content`
- Marked 实例：直接使用 `marked` 实例并 `setOptions`

## 目录索引

- 视图：`apps/extension/src/views/iframe-view.vue`
- 渲染：`apps/extension/src/composables/useMarkdownRenderer.ts`
- 插件：`apps/extension/src/composables/useMarkdownPlugin.ts`
- 通信：`apps/extension/src/composables/useCrossContextBridge.ts`
- 序列化：`apps/extension/src/composables/useMessageSerializer.ts`
- 性能：`apps/extension/src/composables/usePerformanceMonitor.ts`
- Worker：`apps/extension/src/composables/useWorkerRuntime.ts`
- Worker 入口：`apps/extension/src/workers/plugin-runtime.worker.ts`
