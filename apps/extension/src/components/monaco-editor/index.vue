<script setup lang="ts">
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

defineOptions({
  name: 'MonacoEditor'
})

const monacoEditorRef = useTemplateRef('monacoEditorRef')
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let isEditorReady = false

const modelValue = ref(
  '// 在此处输入代码\nconst greeting = "Hello, World!";\nconsole.log(greeting);'
)

// 配置Monaco编辑器的worker
self.MonacoEnvironment = {
  getWorker(moduleId: string, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (['css', 'scss', 'less'].includes(label)) {
      return new cssWorker()
    }
    if (['html', 'handlebars', 'razor'].includes(label)) {
      return new htmlWorker()
    }
    if (['typescript', 'javascript'].includes(label)) {
      return new tsWorker()
    }
    return new EditorWorker()
  }
}

// 定义Monaco编辑器主题
function defineMonacoThemes() {
  try {
    monaco.editor.defineTheme('vs-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'variable.predefined', foreground: '4FC1FF' }
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorCursor.foreground': '#AEAFAD',
        'editor.lineHighlightBackground': '#2D2D30',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41'
      }
    })
  } catch (error) {
    console.warn('定义主题失败', error)
  }
}

// 确保在组件初始化前配置Monaco
function configureMonaco() {
  // 定义主题
  defineMonacoThemes()

  // 注册语言
  try {
    monaco.languages.register({ id: 'typescript' })
    monaco.languages.register({ id: 'javascript' })

    // 添加语言定义
    monaco.languages.setMonarchTokensProvider('typescript', {
      defaultToken: '',
      tokenPostfix: '.ts',
      keywords: [
        'abstract',
        'as',
        'break',
        'case',
        'catch',
        'class',
        'continue',
        'const',
        'constructor',
        'debugger',
        'declare',
        'default',
        'delete',
        'do',
        'else',
        'enum',
        'export',
        'extends',
        'false',
        'finally',
        'for',
        'from',
        'function',
        'get',
        'if',
        'implements',
        'import',
        'in',
        'infer',
        'instanceof',
        'interface',
        'is',
        'keyof',
        'let',
        'module',
        'namespace',
        'never',
        'new',
        'null',
        'number',
        'object',
        'package',
        'private',
        'protected',
        'public',
        'readonly',
        'require',
        'global',
        'return',
        'set',
        'static',
        'string',
        'super',
        'switch',
        'symbol',
        'this',
        'throw',
        'true',
        'try',
        'type',
        'typeof',
        'unique',
        'var',
        'void',
        'while',
        'with',
        'yield',
        'async',
        'await',
        'of'
      ],
      operators: [
        '<=',
        '>=',
        '==',
        '!=',
        '===',
        '!==',
        '=>',
        '+',
        '-',
        '**',
        '*',
        '/',
        '%',
        '++',
        '--',
        '<<',
        '</',
        '>>',
        '>>>',
        '&',
        '|',
        '^',
        '!',
        '~',
        '&&',
        '||',
        '??',
        '?',
        ':',
        '=',
        '+=',
        '-=',
        '*=',
        '**=',
        '/=',
        '%=',
        '<<=',
        '>>=',
        '>>>=',
        '&=',
        '|=',
        '^=',
        '@'
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      digits: /\d+(_+\d+)*/,
      octaldigits: /[0-7]+(_+[0-7]+)*/,
      binarydigits: /[0-1]+(_+[0-1]+)*/,
      hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
      tokenizer: {
        root: [[/[{}]/, 'delimiter.bracket'], { include: 'common' }],
        common: [
          // 标识符和关键字
          [
            /[a-z_$][\w$]*/,
            {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier'
              }
            }
          ],
          [/[A-Z][\w\$]*/, 'type.identifier'],
          // 空格
          { include: '@whitespace' },
          // 分隔符和运算符
          [/[()[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [
            /@symbols/,
            {
              cases: {
                '@operators': 'operator',
                '@default': ''
              }
            }
          ],
          // 数字
          [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
          [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
          [/0[xX](@hexdigits)/, 'number.hex'],
          [/0[oO]?(@octaldigits)/, 'number.octal'],
          [/0[bB](@binarydigits)/, 'number.binary'],
          [/(@digits)/, 'number'],
          // 字符串
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/`/, 'string', '@string_backtick']
        ],
        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*\*(?!\/)/, 'comment.doc', '@jsdoc'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment']
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        jsdoc: [
          [/[^\/*]+/, 'comment.doc'],
          [/\*\//, 'comment.doc', '@pop'],
          [/[\/*]/, 'comment.doc']
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/'/, 'string', '@pop']
        ],
        string_backtick: [
          [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
          [/[^\\`$]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/`/, 'string', '@pop']
        ],
        bracketCounting: [
          [/\{/, 'delimiter.bracket', '@bracketCounting'],
          [/\}/, 'delimiter.bracket', '@pop'],
          { include: 'common' }
        ]
      }
    })

    // 添加JavaScript语言定义
    monaco.languages.setMonarchTokensProvider('javascript', {
      defaultToken: '',
      tokenPostfix: '.js',
      keywords: [
        'break',
        'case',
        'catch',
        'class',
        'continue',
        'const',
        'constructor',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'export',
        'extends',
        'false',
        'finally',
        'for',
        'from',
        'function',
        'get',
        'if',
        'import',
        'in',
        'instanceof',
        'let',
        'new',
        'null',
        'return',
        'set',
        'super',
        'switch',
        'symbol',
        'this',
        'throw',
        'true',
        'try',
        'typeof',
        'undefined',
        'var',
        'void',
        'while',
        'with',
        'yield',
        'async',
        'await',
        'of'
      ],
      typeKeywords: [],
      operators: [
        '<=',
        '>=',
        '==',
        '!=',
        '===',
        '!==',
        '=>',
        '+',
        '-',
        '**',
        '*',
        '/',
        '%',
        '++',
        '--',
        '<<',
        '</',
        '>>',
        '>>>',
        '&',
        '|',
        '^',
        '!',
        '~',
        '&&',
        '||',
        '??',
        '?',
        ':',
        '=',
        '+=',
        '-=',
        '*=',
        '**=',
        '/=',
        '%=',
        '<<=',
        '>>=',
        '>>>=',
        '&=',
        '|=',
        '^=',
        '@'
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      digits: /\d+(_+\d+)*/,
      octaldigits: /[0-7]+(_+[0-7]+)*/,
      binarydigits: /[0-1]+(_+[0-1]+)*/,
      hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
      regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
      regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
      tokenizer: {
        root: [[/[{}]/, 'delimiter.bracket'], { include: 'common' }],
        common: [
          // 标识符和关键字
          [
            /[a-z_$][\w$]*/,
            {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier'
              }
            }
          ],
          [/[A-Z][\w\$]*/, 'type.identifier'],
          // 空格
          { include: '@whitespace' },
          // 分隔符和运算符
          [/[()[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [
            /@symbols/,
            {
              cases: {
                '@operators': 'operator',
                '@default': ''
              }
            }
          ],
          // 数字
          [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
          [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
          [/0[xX](@hexdigits)/, 'number.hex'],
          [/0[oO]?(@octaldigits)/, 'number.octal'],
          [/0[bB](@binarydigits)/, 'number.binary'],
          [/(@digits)/, 'number'],
          // 字符串
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/`/, 'string', '@string_backtick'],
          // 正则表达式
          [
            /\/(?=([^\/\\\[]|\\.|\[([^\]\\]|\\.)*\])+\/([gimsuy]*)(\s*)(\.|;|,|\)|\]|\}|$))/,
            { token: 'regexp', bracket: '@open', next: '@regexp' }
          ]
        ],
        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*\*(?!\/)/, 'comment.doc', '@jsdoc'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment']
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        jsdoc: [
          [/[^\/*]+/, 'comment.doc'],
          [/\*\//, 'comment.doc', '@pop'],
          [/[\/*]/, 'comment.doc']
        ],
        regexp: [
          [
            /(\{)(\d+(?:,\d*)?)(\})/,
            ['regexp.escape.control', 'regexp.escape.control', 'regexp.escape.control']
          ],
          [
            /(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
            ['regexp.escape.control', { token: 'regexp.escape.control', next: '@regexrange' }]
          ],
          [/(\()(\?:|\?=|\?!)/, ['regexp.escape.control', 'regexp.escape.control']],
          [/[()]/, 'regexp.escape.control'],
          [/@regexpctl/, 'regexp.escape.control'],
          [/[^\\\/]/, 'regexp'],
          [/@regexpesc/, 'regexp.escape'],
          [/\\\./, 'regexp.invalid'],
          [
            /(\/)([gimsuy]*)/,
            [{ token: 'regexp', bracket: '@close', next: '@pop' }, 'keyword.other']
          ]
        ],
        regexrange: [
          [/-/, 'regexp.escape.control'],
          [/\^/, 'regexp.invalid'],
          [/@regexpesc/, 'regexp.escape'],
          [/[^\]]/, 'regexp'],
          [/\]/, { token: 'regexp.escape.control', next: '@pop', bracket: '@close' }]
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/'/, 'string', '@pop']
        ],
        string_backtick: [
          [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
          [/[^\\`$]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/`/, 'string', '@pop']
        ],
        bracketCounting: [
          [/\{/, 'delimiter.bracket', '@bracketCounting'],
          [/\}/, 'delimiter.bracket', '@pop'],
          { include: 'common' }
        ]
      }
    })
  } catch (error) {
    console.warn('注册语言失败', error)
  }

  // 确保TypeScript语言服务已加载
  try {
    if (monaco.languages.typescript) {
      // 配置TypeScript
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        esModuleInterop: true,
        typeRoots: ['node_modules/@types']
      })

      // 配置JavaScript
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        esModuleInterop: true,
        typeRoots: ['node_modules/@types']
      })

      // 添加默认库
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `declare var console: {
          log(message?: any, ...optionalParams: any[]): void;
          info(message?: any, ...optionalParams: any[]): void;
          warn(message?: any, ...optionalParams: any[]): void;
          error(message?: any, ...optionalParams: any[]): void;
        };`,
        'global.d.ts'
      )
    }
  } catch (error) {
    console.warn('配置TypeScript语言服务失败', error)
  }
}

// 尝试配置Monaco
try {
  configureMonaco()
} catch (error) {
  console.warn('Monaco初始配置失败，将在编辑器创建后重试', error)
}

// 监听modelValue的变化，更新编辑器内容
watch(
  () => modelValue.value,
  newValue => {
    if (editor && isEditorReady) {
      const value = editor.getValue()
      if (newValue !== value) {
        editor.setValue(newValue)
      }
    }
  }
)

// 创建编辑器实例
function createEditor() {
  if (!monacoEditorRef.value) return

  try {
    // 创建模型
    const model = monaco.editor.createModel(
      modelValue.value,
      'typescript', // 使用typescript
      monaco.Uri.parse('file:///main.ts') // 使用唯一URI，注意扩展名与语言匹配
    )

    // 创建编辑器实例
    editor = monaco.editor.create(monacoEditorRef.value, {
      model: model, // 使用创建的模型
      theme: 'vs-dark', // 使用自定义主题
      readOnly: false, // 默认允许编辑
      contextmenu: true, // 启用右键菜单
      automaticLayout: true,
      minimap: { enabled: true }, // 启用代码缩略图
      scrollBeyondLastLine: false, // 防止滚动超过最后一行
      fontSize: 14,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      tabSize: 2,
      // 启用语法提示和自动完成
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true
      },
      snippetSuggestions: 'inline',
      wordBasedSuggestions: 'allDocuments',
      parameterHints: {
        enabled: true
      },
      formatOnType: true,
      formatOnPaste: true,
      // 添加更多配置以增强语法高亮和提示
      colorDecorators: true,
      folding: true,
      guides: {
        indentation: true,
        bracketPairs: true
      },
      bracketPairColorization: {
        enabled: true
      },
      // 添加更多高亮相关配置
      renderValidationDecorations: 'on',
      fontLigatures: true
    })

    // 监听编辑器内容变化
    editor.onDidChangeModelContent(() => {
      if (editor) {
        modelValue.value = editor.getValue()
      }
    })

    // 标记编辑器已准备好
    isEditorReady = true

    // 再次尝试配置Monaco
    try {
      configureMonaco()

      // 强制刷新编辑器
      setTimeout(() => {
        if (editor) {
          editor.updateOptions({})
          editor.layout()

          // 触发编辑器内容变化，强制重新渲染
          const currentValue = editor.getValue()
          editor.setValue(currentValue + ' ')
          setTimeout(() => {
            if (editor) {
              editor.setValue(currentValue)

              // 强制重新设置语言模式
              const model = editor.getModel()
              if (model) {
                monaco.editor.setModelLanguage(model, 'javascript')
              }
            }
          }, 50)
        }
      }, 100)
    } catch (error) {
      console.warn('Monaco配置失败，但编辑器基本功能仍可使用', error)
    }
  } catch (error) {
    console.error('创建编辑器失败', error)
  }
}

onMounted(async () => {
  // 确保DOM已经渲染
  await nextTick()
  createEditor()
})

// 组件销毁前清理编辑器实例
onBeforeUnmount(() => {
  if (editor) {
    isEditorReady = false
    const model = editor.getModel()
    if (model) {
      model.dispose() // 释放模型资源
    }
    editor.dispose() // 释放编辑器资源
    editor = null
  }
})
</script>

<template>
  <div ref="monacoEditorRef" class="monaco-editor"></div>
</template>

<style lang="scss" scoped>
.monaco-editor {
  @apply w-full h-full;
  min-height: 300px; /* 确保编辑器有最小高度 */
}
</style>
