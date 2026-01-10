import { clsx } from 'clsx'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { useContext, useEffect, useRef } from 'react'
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

import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/code/overlay.module.scss'

// interface Props {}

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

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  useEffect(() => {
    if (!visible) {
      editorRef.current?.dispose()
      editorRef.current = null
      return
    }

    let raf = 0
    let cancelled = false

    function tryReady() {
      if (cancelled || editorRef.current) return

      const section = containerRef.current
      if (!section) return (raf = requestAnimationFrame(tryReady))

      // 关键：Modal 动画阶段可能尺寸为 0
      const clientWidth = section.clientWidth
      const clientHeight = section.clientHeight
      if (clientWidth === 0) {
        return (raf = requestAnimationFrame(tryReady))
      }
      if (clientHeight === 0) {
        return (raf = requestAnimationFrame(tryReady))
      }

      editorRef.current = monaco.editor.create(section, options)
      // 再补一次 layout，避免首次尺寸抖动
      requestAnimationFrame(() => editorRef.current?.layout())
    }

    raf = requestAnimationFrame(tryReady)

    return function () {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [visible])

  return (
    <Application.Overlay
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div
        id="monacoGraph"
        ref={containerRef}
      />
    </Application.Overlay>
  )
}
