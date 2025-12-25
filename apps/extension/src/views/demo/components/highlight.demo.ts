import hljsCore from 'highlight.js/lib/core'
import CSS from 'highlight.js/lib/languages/css'
import JavaScript from 'highlight.js/lib/languages/javascript'
import TypeScript from 'highlight.js/lib/languages/typescript'
import XML from 'highlight.js/lib/languages/xml'

// 主题样式（与原 demo 保持一致）
import 'highlight.js/styles/github-dark-dimmed.css'

let initialized = false

export function getHljs() {
  if (!initialized) {
    try {
      hljsCore.registerLanguage('javascript', JavaScript)
      hljsCore.registerLanguage('typescript', TypeScript)
      hljsCore.registerLanguage('css', CSS)
      hljsCore.registerLanguage('html', XML)
      initialized = true
    } catch {
      // 忽略重复注册等异常
      initialized = true
    }
  }
  return hljsCore
}

export type HLJS = ReturnType<typeof getHljs>
