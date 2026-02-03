import React from '@vitejs/plugin-react-swc'
import { findUpSync } from 'find-up'
import { createWriteStream } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Icons from 'unplugin-icons/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ws = createWriteStream(resolve(__dirname, 'chunks.log'), {
  flush: true,
  autoClose: true,
  encoding: 'utf-8'
})

const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])

const cssRegex: Readonly<RegExp> = /\.css$/i
const imageRegex: Readonly<RegExp> = /\.(png|jpe?g|gif|svg|webp|ico)$/i
const fontRegex: Readonly<RegExp> = /\.(woff2?|ttf|eot|otf)$/i
const videoRegex: Readonly<RegExp> = /\.(mp4|webm|ogg)$/i
const audioRegex: Readonly<RegExp> = /\.(mp3|wav|ogg)$/i
const wasmRegex: Readonly<RegExp> = /\.wasm$/i
const jsonRegex: Readonly<RegExp> = /\.json$/i
const svgRegex: Readonly<RegExp> = /\.svg$/i
const gifRegex: Readonly<RegExp> = /\.gif$/i
const workerRegex: Readonly<RegExp> = /\.worker\.js$/i

const inlineRegexes: readonly RegExp[] = [gifRegex]

const noInlineRegexes: readonly RegExp[] = [
  /icon.*\.(png|jpe?g)$/i, // 图标文件
  /background.*\.(png|jpe?g)$/i // 背景图片
].concat(svgRegex, jsonRegex, videoRegex, audioRegex, fontRegex)

const filePath = 'C:/Users/MACHENIKE/Documents/Vue3/'

const chunkMap: Readonly<Record<string, RegExp[]>> = {
  'workspace-deps': [/[\\/]packages[\\/](core|wasm)[\\/]/],

  'core-apis': [/[\\/]src[\\/]apis[\\/]/],
  'core-utils': [/[\\/]src[\\/]utils[\\/]/],
  'core-hooks': [/[\\/]src[\\/]hooks[\\/]/],
  'core-stores': [/[\\/]src[\\/]stores[\\/]/],
  'core-assets': [/[\\/]src[\\/]assets[\\/]/],
  'core-locales': [/[\\/]src[\\/]locales[\\/]/],
  'core-plugins': [/[\\/]src[\\/]plugins[\\/]/],
  'core-database': [/[\\/]src[\\/]database[\\/]/],

  'core-framework': [/[\\/]node_modules[\\/](react|react-dom)[\\/]/],

  'ui-antd': [
    /[\\/]node_modules[\\/]antd[\\/]/,
    /[\\/]node_modules[\\/]@rc-component[\\/]/,
    /[\\/]node_modules[\\/]@ant-design[\\/]/,
    /[\\/]node_modules[\\/]antd-style[\\/]/,
    /[\\/]node_modules[\\/]throttle-debounce[\\/]/,

    /[\\/]node_modules[\\/]@emotion[\\/]/,
    /[\\/]node_modules[\\/]react-is[\\/]/,
    /[\\/]node_modules[\\/]json2mq[\\/]/,
    /[\\/]node_modules[\\/]string-convert[\\/]/,
    /[\\/]node_modules[\\/]stylis[\\/]/,
    /[\\/]node_modules[\\/]is-mobile[\\/]/,

    /[\\/]node_modules[\\/]rc-util[\\/]/,
    /[\\/]node_modules[\\/]rc-motion[\\/]/,
    /[\\/]node_modules[\\/]mermaid[\\/]/,
    /[\\/]node_modules[\\/]ts-dedent[\\/]/,
    /[\\/]node_modules[\\/]roughjs[\\/]/,
    /[\\/]node_modules[\\/]@iconify[\\/]/,
    /[\\/]node_modules[\\/]khroma[\\/]/,
    /[\\/]node_modules[\\/]katex[\\/]/,
    /[\\/]node_modules[\\/]cytoscape[\\/]/,
    /[\\/]node_modules[\\/]cytoscape-/,
    /[\\/]node_modules[\\/]cose-base[\\/]/,
    /[\\/]node_modules[\\/]layout-base[\\/]/,
    /[\\/]node_modules[\\/]langium[\\/]/,
    /[\\/]node_modules[\\/]vscode-/,
    /[\\/]node_modules[\\/]@mermaid-js[\\/]/,
    /[\\/]node_modules[\\/]chevrotain[\\/]/,
    /[\\/]node_modules[\\/]chevrotain-/,
    /[\\/]node_modules[\\/]@chevrotain[\\/]/,
    /[\\/]node_modules[\\/]character-/,
    /[\\/]node_modules[\\/]fault[\\/]/,
    /[\\/]node_modules[\\/]format[\\/]/,
    /[\\/]node_modules[\\/]delaunator[\\/]/,
    /[\\/]node_modules[\\/]is-hexadecimal[\\/]/,
    /[\\/]node_modules[\\/]is-alphanumerical[\\/]/,
    /[\\/]node_modules[\\/]is-decimal[\\/]/,
    /[\\/]node_modules[\\/]parse-entities[\\/]/,
    /[\\/]node_modules[\\/]dagre-d3-es[\\/]/,
    /[\\/]node_modules[\\/]internmap[\\/]/,
    /[\\/]node_modules[\\/]robust-predicates[\\/]/,
    /[\\/]node_modules[\\/]is-alphabetical[\\/]/,
    /[\\/]node_modules[\\/]@braintree[\\/]/,
    /[\\/]node_modules[\\/]classnames[\\/]/,
    /[\\/]node_modules[\\/]lodash.throttle[\\/]/,
    /[\\/]node_modules[\\/]react-syntax-highlighter[\\/]/,
    /[\\/]node_modules[\\/]refractor[\\/]/,

    /[\\/]node_modules[\\/]scroll-into-view-if-needed[\\/]/,
    /[\\/]node_modules[\\/]compute-scroll-into-view[\\/]/,

    /[\\/]node_modules[\\/]html-react-parser[\\/]/,
    /[\\/]node_modules[\\/]html-dom-parser[\\/]/,
    /[\\/]node_modules[\\/]domhandler[\\/]/,
    /[\\/]node_modules[\\/]react-property[\\/]/,
    /[\\/]node_modules[\\/]toggle-selection[\\/]/,
    /[\\/]node_modules[\\/]domelementtype[\\/]/
  ],

  'ui-radix': [
    /[\\/]node_modules[\\/]@radix-ui[\\/]/,
    /[\\/]node_modules[\\/]react-remove-scroll[\\/]/,
    /[\\/]node_modules[\\/]use-sidecar[\\/]/,
    /[\\/]node_modules[\\/]aria-hidden[\\/]/,
    /[\\/]node_modules[\\/]react-remove-scroll-bar[\\/]/,
    /[\\/]node_modules[\\/]react-remove-scroll-bar[\\/]/,
    /[\\/]node_modules[\\/]use-callback-ref[\\/]/,
    /[\\/]node_modules[\\/]react-style-singleton[\\/]/,
    /[\\/]node_modules[\\/]detect-node-es[\\/]/,
    /[\\/]node_modules[\\/]get-nonce[\\/]/
  ],

  'ui-marks': [
    /[\\/]node_modules[\\/]@iconify[\\/](?:json|iconify)[\\/]/,
    /~icons/
  ],

  'ui-animation': [/[\\/]node_modules[\\/](gsap|swiper)[\\/]/],

  'utils-media': [
    /[\\/]node_modules[\\/](mp4box)[\\/]/,
    /[\\/]node_modules[\\/](@ffmpeg)[\\/]/,
    /[\\/]node_modules[\\/]ffmpeg-core\.(js|wasm|worker\.js)$/
  ],

  'utils-core': [
    /[\\/]node_modules[\\/]lodash-es[\\/]/,
    /[\\/]node_modules[\\/]rxjs[\\/]/,
    /[\\/]node_modules[\\/]uuid[\\/]/,
    /[\\/]node_modules[\\/]clsx[\\/]/,
    /[\\/]node_modules[\\/]reflect-metadata[\\/]/,
    /[\\/]node_modules[\\/]react-use[\\/]/,
    /[\\/]node_modules[\\/]js-cookie[\\/]/,
    /[\\/]node_modules[\\/]nano-css[\\/]/,
    /[\\/]node_modules[\\/]react-universal-interface[\\/]/,
    /[\\/]node_modules[\\/]screenfull[\\/]/,
    /[\\/]node_modules[\\/]set-harmonic-interval[\\/]/,
    /[\\/]node_modules[\\/]ts-easing[\\/]/,
    /[\\/]node_modules[\\/]fast-shallow-equal[\\/]/,
    /[\\/]node_modules[\\/]fast-deep-equal[\\/]/,
    /[\\/]node_modules[\\/]copy-to-clipboard[\\/]/,
    /[\\/]node_modules[\\/]@xobotyi[\\/]/
  ],

  // ========== 编辑器 ==========
  'utils-markdown': [
    /[\\/]node_modules[\\/]rehype-/,
    /[\\/]node_modules[\\/]hast-util-raw[\\/]/,
    /[\\/]node_modules[\\/]hastscript[\\/]/,
    /[\\/]node_modules[\\/]@ungap\/structured-clone[\\/]/,
    /[\\/]node_modules[\\/]hast-util-from-parse5[\\/]/,
    /[\\/]node_modules[\\/]vfile-location[\\/]/,
    /[\\/]node_modules[\\/]hast-util-to-parse5[\\/]/,
    /[\\/]node_modules[\\/]html-void-elements[\\/]/,
    /[\\/]node_modules[\\/]parse5[\\/]/,
    /[\\/]node_modules[\\/]entities[\\/]/,
    /[\\/]node_modules[\\/]unist-util-position[\\/]/,
    /[\\/]node_modules[\\/]unist-util-visit[\\/]/,
    /[\\/]node_modules[\\/]unist-util-is[\\/]/,
    /[\\/]node_modules[\\/]unist-util-visit-parents[\\/]/,
    /[\\/]node_modules[\\/]web-namespaces[\\/]/,
    /[\\/]node_modules[\\/]zwitch[\\/]/,
    /[\\/]node_modules[\\/]vfile[\\/]/,
    /[\\/]node_modules[\\/]hast-util-to-text[\\/]/,
    /[\\/]node_modules[\\/]hast-util-is-element[\\/]/,
    /[\\/]node_modules[\\/]hast-util-parse-selector[\\/]/,
    /[\\/]node_modules[\\/]unist-util-find-after[\\/]/,

    /[\\/]node_modules[\\/]remark-/,
    /[\\/]node_modules[\\/]unified[\\/]/,
    /[\\/]node_modules[\\/]bail[\\/]/,
    /[\\/]node_modules[\\/]trough[\\/]/,
    /[\\/]node_modules[\\/]is-plain-obj[\\/]/,
    /[\\/]node_modules[\\/]extend[\\/]/,
    /[\\/]node_modules[\\/]ccount[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-gfm[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-gfm-autolink-literal[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-find-and-replace[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-phrasing[\\/]/,
    /[\\/]node_modules[\\/]escape-string-regexp[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-gfm-footnote[\\/]/,
    /[\\/]node_modules[\\/]micromark-core-commonmark[\\/]/,
    /[\\/]node_modules[\\/]micromark-factory-space[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-character[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-normalize-identifier[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-sanitize-uri[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-symbol[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-types[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-gfm-strikethrough[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-gfm-table[\\/]/,
    /[\\/]node_modules[\\/]markdown-table[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-gfm-task-list-item[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-from-markdown[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-to-markdown[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-to-string[\\/]/,
    /[\\/]node_modules[\\/]longest-streak[\\/]/,
    /[\\/]node_modules[\\/]decode-named-character-reference[\\/]/,
    /[\\/]node_modules[\\/]micromark[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-decode-numeric-character-reference[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-decode-string[\\/]/,
    /[\\/]node_modules[\\/]unist-util-stringify-position[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-combine-extensions[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm-autolink-literal[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm-footnote[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm-strikethrough[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm-table[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm-tagfilter[\\/]/,
    /[\\/]node_modules[\\/]micromark-extension-gfm-task-list-item[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-chunked[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-classify-character[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-resolve-all[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-encode[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-subtokenize[\\/]/,
    /[\\/]node_modules[\\/]micromark-factory-destination[\\/]/,
    /[\\/]node_modules[\\/]micromark-factory-label[\\/]/,
    /[\\/]node_modules[\\/]micromark-factory-title[\\/]/,
    /[\\/]node_modules[\\/]micromark-factory-whitespace[\\/]/,
    /[\\/]node_modules[\\/]micromark-util-html-tag-name[\\/]/,

    /[\\/]node_modules[\\/]marked[\\/]/,

    /[\\/]node_modules[\\/]prosemirror-/,
    /[\\/]node_modules[\\/]rope-sequence[\\/]/,
    /[\\/]node_modules[\\/]orderedmap[\\/]/,
    /[\\/]node_modules[\\/]w3c-keyname[\\/]/,

    /[\\/]node_modules[\\/]dompurify[\\/]/,
    /[\\/]node_modules[\\/]@floating-ui[\\/]/,
    /[\\/]node_modules[\\/]tabbable[\\/]/,

    /[\\/]node_modules[\\/]react-markdown[\\/]/,
    /[\\/]node_modules[\\/]devlop[\\/]/,
    /[\\/]node_modules[\\/]html-url-attributes[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-to-hast[\\/]/,
    /[\\/]node_modules[\\/]trim-lines[\\/]/,
    /[\\/]node_modules[\\/]hast-util-to-jsx-runtime[\\/]/,
    /[\\/]node_modules[\\/]style-to-js[\\/]/,
    /[\\/]node_modules[\\/]style-to-object[\\/]/,
    /[\\/]node_modules[\\/]inline-style-parser[\\/]/,
    /[\\/]node_modules[\\/]vfile-message[\\/]/,
    /[\\/]node_modules[\\/]space-separated-tokens[\\/]/,
    /[\\/]node_modules[\\/]property-information[\\/]/,
    /[\\/]node_modules[\\/]comma-separated-tokens[\\/]/,
    /[\\/]node_modules[\\/]estree-util-is-identifier-name[\\/]/,
    /[\\/]node_modules[\\/]hast-util-whitespace[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-mdx-expression[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-mdx-jsx[\\/]/,
    /[\\/]node_modules[\\/]mdast-util-mdxjs-esm[\\/]/,

    /[\\/]node_modules[\\/]@tiptap[\\/]/,
    /[\\/]node_modules[\\/]fast-equals[\\/]/,
    /[\\/]node_modules[\\/]linkifyjs[\\/]/,
    /[\\/]node_modules[\\/]use-sync-external-store[\\/]/,

    /[\\/]node_modules[\\/]@ariakit[\\/]/
  ],

  'utils-code': [
    /[\\/]node_modules[\\/](monaco-editor|highlight\.js|lowlight)[\\/]/
  ],

  'utils-datetime': [/[\\/]node_modules[\\/](dayjs|lunisolar|tyme4ts)[\\/]/],

  'utils-crypto': [/[\\/]node_modules[\\/](crypto-js)[\\/]/],

  'utils-matches': [/[\\/]node_modules[\\/](fuse\.js)[\\/]/],

  'utils-math': [
    /[\\/]node_modules[\\/](mathjs|complex\.js|decimal\.js|escape-latex|fraction\.js)[\\/]/,
    /[\\/]node_modules[\\/](javascript-natural-sort|seedrandom|tiny-emitter|typed-function)[\\/]/
  ],

  'utils-enhance': [
    /[\\/]node_modules[\\/]qrcode[\\/]/,
    /[\\/]node_modules[\\/]d3[\\/]/,
    /[\\/]node_modules[\\/]react-hotkeys-hook[\\/]/,
    /[\\/]node_modules[\\/]d3-/
  ],

  'utils-network': [
    /[\\/]node_modules[\\/](@ngify)[\\/]/,
    /[\\/]node_modules[\\/](axios|follow-redirects|form-data|proxy-from-env|cookie|set-cookie-parser)[\\/]/
  ],

  'utils-store': [
    /[\\/]node_modules[\\/]zustand[\\/]/,
    /[\\/]node_modules[\\/]immer[\\/]/,
    /[\\/]node_modules[\\/]tslib[\\/]/
  ],

  'utils-storage': [
    /[\\/]node_modules[\\/]dexie[\\/]/,
    /[\\/]node_modules[\\/]dexie-/,
    /[\\/]node_modules[\\/]lib0[\\/]/,
    /[\\/]node_modules[\\/]y-dexie[\\/]/,
    /[\\/]node_modules[\\/]y-protocols[\\/]/,
    /[\\/]node_modules[\\/]yjs[\\/]/
  ],

  'utils-validation': [/[\\/]node_modules[\\/](zod)[\\/]/],

  'utils-polyfill': [/[\\/]node_modules[\\/]@babel[\\/]/],

  'utils-interaction': [/[\\/]node_modules[\\/]sortablejs[\\/]/],
  'utils-dnd': [/[\\/]node_modules[\\/]@dnd-kit[\\/]/],

  scheduler: [
    /[\\/]node_modules[\\/](scheduler)[\\/]/,
    /[\\/]node_modules[\\/]@tauri-apps[\\/]/
  ],

  router: [
    /[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/,
    /[\\/]node_modules[\\/]react-router[\\/]/,
    /[\\/]node_modules[\\/]react-router-dom[\\/]/
  ],

  'unknown-deps': []
}

const chunkEntries = Object.entries(chunkMap)

export default defineConfig(function ({
  mode,
  command
}: ConfigEnv): UserConfig {
  const env = loadEnv(mode || 'development', '')
  const interfaces = networkInterfaces()
  const LOOPBACK = '0.0.0.0'
  let IP = 'localhost'
  const PORT = 9523

  for (const inter of Object.keys(interfaces)) {
    const collection = interfaces[inter]
    if (!collection) continue
    for (const single of collection) {
      if (inter !== 'WLAN') continue
      if (single.family !== 'IPv4') continue
      if (single.internal) continue
      IP = single.address
    }
  }
  console.log('IP ===>', `http://${IP}:${PORT}`)

  return {
    envDir: resolve(fileURLToPath(new URL('.', import.meta.url))),
    plugins: [
      React({
        devTarget: 'esnext',
        jsxImportSource: 'react',
        tsDecorators: true,
        plugins: []
      }),
      Icons({
        compiler: 'jsx',
        autoInstall: true,
        scale: 1,
        defaultStyle: '',
        defaultClass: '',
        jsx: 'react',
        iconCustomizer(collection, icon, props) {
          props['aria-hidden'] = 'true'
        },
        collectionsNodeResolvePath: [
          '@iconify/icons-*',
          '@iconify-json/*',
          'packages/shared/src/assets/iconify.json'
        ],
        customCollections: {
          // 'local' 是自定义集合名称，可以改为任何你喜欢的名称
          // custom: FileSystemIconLoader(resolve(rootDir, 'packages/shared/src/assets/iconify.json'))
          // local: FileSystemIconLoader(
          // 	resolve(rootDir, 'packages/shared/src/assets/icons'),
          // 	function (svg) {
          // 		return svg.replace(/^<svg /, '<svg fill="currentColor" ')
          // 	}
          // )
        }
      }),
      AutoImport({
        dts: 'src/types/auto-imports.d.ts',
        include: [/\.(?:ts|tsx|js|jsx)$/i],
        imports: ['react', 'react-router-dom']
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['node_modules']
    },
    build: {
      assetsInlineLimit(filePath) {
        const isInline = inlineRegexes.some((regex) => regex.test(filePath))
        // return content.length < 10 * 1024 // 小于10kb则内联
        if (isInline) return true

        const isNoInline = noInlineRegexes.some((regex) => regex.test(filePath))
        if (isNoInline) return false

        // 默认情况下，不内联
        return false
      },
      rollupOptions: {
        output: {
          entryFileNames: 'javascript/[name]-[hash].js',
          chunkFileNames: 'javascript/[name]-[hash].js',
          assetFileNames(chunkInfo) {
            for (const name of chunkInfo.names) {
              if (cssRegex.test(name)) return `css/${name}`
              if (imageRegex.test(name)) return `images/${name}`
              if (fontRegex.test(name)) return `fonts/${name}`
              if (videoRegex.test(name)) return `videos/${name}`
              if (audioRegex.test(name)) return `audios/${name}`
              if (wasmRegex.test(name)) return `wasm/${name}`
              if (workerRegex.test(name)) return `workers/${name}`
            }

            return 'assets/[name].[ext]'
          },
          manualChunks(id) {
            // 遍历映射表，匹配当前模块路径

            for (const [chunkName, patterns] of chunkEntries) {
              const pattern = patterns.some((pattern) => pattern.test(id))
              if (pattern) return chunkName
            }

            const pattern = /apps\/client\/src\//.test(id)

            const replaced = id.replace(filePath, '')

            // if (!pattern) console.log('[manualChunks] ===>', replaced)
            if (!pattern) ws.write(`[manualChunks] ===> ${replaced}\n`)

            // 其他第三方依赖
            if (/[\\/]node_modules[\\/]/.test(id)) return 'vendors'
          }
        }
      }
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        hashPrefix: 'prefix'
      },
      preprocessorOptions: {
        scss: {
          additionalData: `
                            @use "@/styles/variables.scss";
                            @use "@/styles/mixin.scss";
                          `
        }
      }
    },
    server: {
      port: PORT,
      strictPort: true,
      host: LOOPBACK || false,
      // hmr: LOOPBACK
      //   ? {
      //       protocol: 'ws',
      //       host: IP,
      //       port: 1421
      //     }
      //   : undefined,
      watch: {
        ignored: ['**/dist-electron/**']
      }
    }
  }
})
