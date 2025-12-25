/**
 * Mermaid 图表插件
 */

export interface MermaidConfig {
  /** 主题 */
  theme?: 'default' | 'dark' | 'forest' | 'neutral'
  /** 起始编号 */
  startOnLoad?: boolean
  /** 安全等级 */
  securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox'
  /** 字体 */
  fontFamily?: string
}

/**
 * 创建 Mermaid 插件
 */
export function createMermaidPlugin() {
  let mermaid: any = null
  let chartId = 0

  return {
    meta: {
      name: 'mermaid',
      version: '1.0.0',
      provides: ['diagram-chart']
    },
    defaultConfig: {
      theme: 'default',
      startOnLoad: false,
      securityLevel: 'strict',
      fontFamily: 'monospace'
    },
    hooks: {
      async afterInit(config: MermaidConfig, context: any) {
        try {
          // 动态导入 Mermaid
          const module = await import('mermaid')
          mermaid = module.default

          // 初始化配置
          mermaid.initialize({
            startOnLoad: config.startOnLoad ?? false,
            theme: config.theme ?? 'default',
            securityLevel: config.securityLevel ?? 'strict',
            fontFamily: config.fontFamily ?? 'monospace'
          })

          context.logger.info('Mermaid initialized')
        } catch (error) {
          context.logger.error('Failed to initialize Mermaid:', error)
          throw error
        }
      },

      async afterRender(html: string, context: any) {
        if (!mermaid) return html

        // 查找 Mermaid 代码块
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const mermaidBlocks = doc.querySelectorAll('code[data-lang="mermaid"]')

        const renderPromises: Promise<void>[] = []

        for (const block of mermaidBlocks) {
          const codeElement = block as HTMLElement
          const code = codeElement.textContent || ''
          const id = `mermaid-${++chartId}`

          // 创建容器
          const container = document.createElement('div')
          container.className = 'mermaid-container'
          container.id = id

          // 替换代码块
          const pre = codeElement.parentElement
          if (pre?.parentElement) {
            pre.parentElement.replaceChild(container, pre)
          }

          // 异步渲染
          const promise = mermaid
            .render(id, code)
            .then((result: { svg: string }) => {
              container.innerHTML = result.svg
            })
            .catch((error: Error) => {
              context.logger.warn(`Failed to render Mermaid chart ${id}:`, error)
              container.innerHTML = `<div class="mermaid-error">Failed to render chart</div><pre><code>${code}</code></pre>`
            })

          renderPromises.push(promise)
        }

        // 等待所有图表渲染完成
        await Promise.all(renderPromises)

        return doc.body.innerHTML
      }
    }
  }
}
