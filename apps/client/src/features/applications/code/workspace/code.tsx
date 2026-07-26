import { clsx } from 'clsx'
import { Splitter } from 'antd'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
// js
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
// ts
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'

// Language contributions (only import what you need)
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'

// import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp'
// import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard'

// 引入代码折叠特性 TODO: 暂时无法使用，待研究
// import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding'

import { Overlay } from '@/features/applications/code/workspace/overlay/index.ts'

import styles from '@/features/applications/code/workspace/code.module.scss'

self.MonacoEnvironment = {
  // 提供一个定义worker路径的全局变量
  getWorker(_: unknown, label: string): Worker {
    if (label === 'json') return new jsonWorker()

    if (label === 'css') return new cssWorker()
    if (label === 'scss') return new cssWorker()
    if (label === 'less') return new cssWorker()

    if (label === 'html') return new htmlWorker()
    if (label === 'razor') return new htmlWorker()
    if (label === 'handlebars') return new htmlWorker()

    if (label === 'typescript') return new tsWorker()
    if (label === 'javascript') return new tsWorker()

    // 基础功能文件， 提供了所有语言通用功能 无论使用什么语言，monaco都会去加载他
    return new editorWorker()
  }
}

const options: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'typescript',
  theme: 'vs-dark',
  value: `const a = 1;\nconsole.log(a);\n\ninterface Params {\n  attrs: string[]\n  get: (key: string) => string\n  set: (value: string) => void\n}\n\nconst params: Params = {\n  attrs: [''],\n  get(key) {\n    return this.attrs[key]\n  },\n  set(value) {\n    this.attrs = value\n  }\n}\n`,

  fontSize: 16,
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: true,
  trimAutoWhitespace: true,
  largeFileOptimizations: true,

  automaticLayout: true,
  wordWrap: 'on',
  smoothScrolling: true,
  scrollBeyondLastLine: false,
  fixedOverflowWidgets: true,

  minimap: { enabled: true },
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10
  },
  padding: { top: 12, bottom: 12 },

  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },

  formatOnPaste: true,
  formatOnType: true,

  quickSuggestions: { other: true, strings: true, comments: false },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'smart',
  inlineSuggest: { enabled: true },
  contextmenu: true
}

export default function Code() {
  const [sizes, updateSizes] = useState<(number | string)[]>(['15%', '85%'])

  const GraphRef = useRef<HTMLDivElement>(null)
  const composeRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(function () {
    const section = GraphRef.current
    console.log('section', section)
    if (!section) return

    composeRef.current = monaco.editor.create(section, options)
    requestAnimationFrame(function () {
      return composeRef.current?.layout()
    })
  }, [])

  return (
    <div className={clsx([styles.code, styles.root])}>
      <Overlay.Utility></Overlay.Utility>

      <Splitter onResize={updateSizes}>
        <Splitter.Panel
          min="15%"
          max="30%"
          resizable
          size={sizes[0]}
          className={clsx([styles.code, styles.navigation])}>
          <Overlay.Navigation />
        </Splitter.Panel>
        <Splitter.Panel
          className={clsx([styles.markdown, styles.section])}
          size={sizes[1]}>
          <Overlay.Section ref={GraphRef} />
        </Splitter.Panel>
      </Splitter>

      <Overlay.Summary></Overlay.Summary>
    </div>
  )
}
