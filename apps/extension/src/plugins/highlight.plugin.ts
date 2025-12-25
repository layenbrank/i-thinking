import 'highlight.js/styles/github-dark.css'
/**
 * 语法高亮插件 - 使用 highlight.js
 */

export interface HighlightConfig {
  /** 主题名称 */
  theme?: string
  /** 支持的语言 */
  languages?: string[]
  /** 是否自动检测语言 */
  autoDetect?: boolean
  /** 行号显示 */
  lineNumbers?: boolean
}

/**
 * 创建语法高亮插件
 */
export function createHighlightPlugin() {
  let hljs: any = null

  return {
    meta: {
      name: 'highlight',
      version: '1.0.0',
      provides: ['code-highlight']
    },
    defaultConfig: {
      theme: 'github-dark',
      languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'css', 'html', 'json'],
      autoDetect: true,
      lineNumbers: false
    },
    hooks: {
      async afterInit(config: HighlightConfig, context: any) {
        try {
          // 动态导入 highlight.js
          const module = await import('highlight.js/lib/core')
          hljs = module.default

          // 注册语言
          const languages = config.languages ?? []
          const langModule = await import(`highlight.js/lib/languages/javascript`)
          hljs.registerLanguage('javascript', langModule.default)
          console.log('langModule', langModule)
          // for (const lang of languages) {
          // 	try {
          // 		const langModule = await import(`highlight.js/lib/languages/${lang}`)
          // 		console.log('langModule', langModule)

          // 		hljs.registerLanguage(lang, langModule.default)
          // 	} catch (error) {
          // 		context.logger.warn(`Failed to load language: ${lang}`, error)
          // 	}
          // }

          // 加载主题样式
          if (config.theme) {
            const themeStyle = document.createElement('link')
            themeStyle.rel = 'stylesheet'
            themeStyle.href = `https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/${config.theme}.min.css`
            document.head.appendChild(themeStyle)
            context.state.set('themeStyle', themeStyle)
          }

          context.logger.info('Highlight.js initialized')
          hljs.highlightAll()
        } catch (error) {
          context.logger.error('Failed to initialize highlight.js:', error)
          throw error
        }
      },

      afterRender(DOMStringify: string, context: any) {
        if (!hljs) return DOMStringify

        // 使用 DOM 解析
        const parser = new DOMParser()
        const doc = parser.parseFromString(DOMStringify, 'text/html')
        const codeBlocks = doc.querySelectorAll('pre code')

        for (const block of codeBlocks) {
          const codeElement = block as HTMLElement
          const lang = codeElement.getAttribute('data-lang')

          try {
            if (lang && hljs.getLanguage(lang)) {
              const result = hljs.highlight(codeElement.textContent || '', { language: lang })
              codeElement.innerHTML = result.value
              codeElement.classList.add('hljs')
            } else {
              const result = hljs.highlightAuto(codeElement.textContent || '')
              codeElement.innerHTML = result.value
              codeElement.classList.add('hljs')
            }

            // 添加行号
            const config = context.state.get('config') as HighlightConfig
            if (config?.lineNumbers) {
              const lines = codeElement.innerHTML.split('\n')
              const numberedLines = lines
                .map((line, index) => {
                  return `<span class="line-number">${index + 1}</span>${line}`
                })
                .join('\n')
              codeElement.innerHTML = numberedLines
            }
          } catch (error) {
            context.logger.warn('Failed to highlight code block:', error)
          }
        }

        return doc.body.innerHTML
      },

      onDestroy(context: any) {
        // 移除主题样式
        const themeStyle = context.state.get('themeStyle')
        if (themeStyle && themeStyle instanceof HTMLLinkElement) {
          themeStyle.remove()
        }
      }
    }
  }
}
