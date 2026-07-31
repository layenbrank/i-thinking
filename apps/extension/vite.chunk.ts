import type { Rolldown } from 'vite'
type CodeSplitting = Rolldown.CodeSplittingGroup

export const chunks: CodeSplitting[] = [
  // ========== 最高优先级：核心业务 API ==========
  {
    name: 'core-apis',
    priority: 100,
    test(id) {
      const patterns = [/[\\/]src[\\/]apis[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 高优先级：其他核心业务代码 ==========
  {
    name: 'core-utils',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]utils[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'core-hooks',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]hooks[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'core-stores',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]stores[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'core-assets',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]assets[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'core-locales',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]locales[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'core-plugins',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]plugins[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'core-database',
    priority: 90,
    test(id) {
      const patterns = [/[\\/]src[\\/]database[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 中优先级：Vue 核心生态与 UI 组件库 ==========
  {
    name: 'core-framework',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](vue|vue-router|pinia|@vue)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-framework',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](@vueuse)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'ui-antd',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](ant-design-vue)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'ui-antd-deps',
    priority: 50,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/](@ant-design|@ctrl\/tinycolor|@emotion|stylis)[\\/]/,
        /[\\/]node_modules[\\/](@simonwep\/pickr|throttle-debounce|vue-types|warning)[\\/]/,
        /[\\/]node_modules[\\/](array-tree-filter|async-validator|dom-align|dom-scroll-into-view)[\\/]/,
        /[\\/]node_modules[\\/](resize-observer-polyfill|scroll-into-view-if-needed|shallow-equal)[\\/]/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'ui-markers',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/]@iconify[\\/](?:json|vue)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 中优先级：编辑器与媒体处理 ==========
  {
    name: 'utils-markdown',
    priority: 50,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/]@tiptap[\\/]/,
        /[\\/]node_modules[\\/]marked[\\/]/,
        /[\\/]node_modules[\\/]prosemirror-/,
        /[\\/]node_modules[\\/]dompurify[\\/]/,
        /[\\/]node_modules[\\/]@floating-ui[\\/]/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-code',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](monaco-editor|highlight\.js|lowlight)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-languages',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](vue-i18n|@intlify)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-media',
    priority: 50,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/](mp4box)[\\/]/,
        /[\\/]node_modules[\\/](@ffmpeg)[\\/]/,
        /[\\/]node_modules[\\/](ffmpeg-core\.(js|wasm|worker\.js))$/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 中优先级：各类工具库 ==========
  {
    name: 'utils-core',
    priority: 50,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/](lodash-es|rxjs|uuid|clsx)[\\/]/,
        /[\\/]node_modules[\\/](reflect-metadata)[\\/]/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-datetime',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](dayjs|lunisolar|tyme4ts)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-crypto',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](crypto-js)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-matches',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](fuse\.js)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-math',
    priority: 50,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/](mathjs)[\\/]/,
        /[\\/]node_modules[\\/](mathjs|complex\.js|decimal\.js|escape-latex|fraction\.js)[\\/]/,
        /[\\/]node_modules[\\/](javascript-natural-sort|seedrandom|tiny-emitter|typed-function)[\\/]/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-enhance',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](qrcode|d3)[\\/]/, /[\\/]node_modules[\\/]d3-/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-network',
    priority: 50,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/](@ngify)[\\/]/,
        /[\\/]node_modules[\\/](axios|follow-redirects|form-data|proxy-from-env)[\\/]/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-storage',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](dexie)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-validation',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](zod)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 中优先级：UI 增强与 Polyfill ==========
  {
    name: 'ui-animation',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](gsap|swiper)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'ui-interaction',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](sortablejs)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },
  {
    name: 'utils-polyfill',
    priority: 50,
    test(id) {
      const patterns = [/[\\/]node_modules[\\/](@babel)[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 低优先级：零散未知依赖 ==========
  {
    name: 'unknown-deps',
    priority: 10,
    test(id) {
      const patterns = [
        /[\\/]node_modules[\\/](rope-sequence|w3c-keyname)[\\/]/,
        /[\\/]node_modules[\\/](linkifyjs|devlop|orderedmap)[\\/]/,
        /[\\/]node_modules[\\/](compute-scroll-into-view|tslib)[\\/]/,
        /[\\/]node_modules[\\/](perfect-debounce|hookable|birpc)[\\/]/
      ]
      return patterns.some((pattern) => pattern.test(id))
    }
  },

  // ========== 最低优先级：兜底所有剩余 node_modules ==========
  {
    name: 'vendors',
    priority: 0, // 默认值即为 0，作为兜底确保不被其他规则覆盖的第三方库全部进入此 chunk
    test(id) {
      const patterns = [/[\\/]node_modules[\\/]/]
      return patterns.some((pattern) => pattern.test(id))
    }
  }
]
