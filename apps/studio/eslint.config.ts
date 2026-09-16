import eslint from '@eslint/js'
import type { Rule } from 'eslint'
import importeslint from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

/** 哪些调用算「输出了一次异常」：console.* / log.* / toast.* / report* / notify* … */
const REPORTING_METHOD = /^(log|error|warn|info|debug|report|notify|track|toast)$/
const REPORTING_FN = /^(log|report|notify|track|warn|error)/

/** 在 catch 体里找「throw」或「输出一次」（数组/对象递归扫一遍 AST，不需要遍历器） */
function hasCatchOutput(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasCatchOutput)
  if (typeof value !== 'object' || value === null) return false

  const node = value as {
    type?: string
    callee?: { type?: string; name?: string; property?: { name?: string } }
  }
  if (node.type === 'ThrowStatement') return true
  if (node.type === 'CallExpression') {
    const callee = node.callee
    if (
      callee?.type === 'Identifier' &&
      callee.name !== undefined &&
      REPORTING_FN.test(callee.name)
    )
      return true
    const method = callee?.property?.name
    if (
      callee?.type === 'MemberExpression' &&
      method !== undefined &&
      REPORTING_METHOD.test(method)
    )
      return true
  }

  return Object.keys(value).some(function (key) {
    // parent 是回指（typescript-eslint 会挂上），必须跳过否则递归爆栈
    if (key === 'parent') return false
    return hasCatchOutput((value as Record<string, unknown>)[key])
  })
}

/**
 * 本地规则：**catch 不许吃掉异常** —— 要么 throw 出去，要么至少输出一次。
 *
 * 注释不算数：注释不是语句，只有注释（或只写兜底 return）都过不了。
 *
 * 为什么不写成 `no-restricted-syntax`：一条规则只能有一个 severity，而 arrow-function 的禁用
 * （同一条规则）对存量文件仍按 warning 保留，两者会互相覆盖。
 */
const catchMustReport: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'catch 必须 throw 出去或至少输出一次（注释不算）' },
    schema: [],
    messages: {
      report:
        'catch 不能吞掉异常：throw 出去，或至少输出一次（console.* / log.* / toast.* / report*），注释不算数'
    }
  },
  create: function (context) {
    return {
      CatchClause: function (clause) {
        if (hasCatchOutput(clause.body.body)) return
        context.report({ node: clause, messageId: 'report' })
      }
    }
  }
}

export default defineConfig([
  globalIgnores([
    'dist',
    '**/dist/**',
    '.vite',
    '**/.vite/**',
    'coverage',
    'node_modules',
    'playwright-report',
    'test-results'
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.recommended,
  reactRefresh.configs.vite,
  importeslint.flatConfigs.recommended,
  importeslint.flatConfigs.electron,

  {
    name: 'app/typescript',
    // 只对 TS 文件启用类型感知解析：`.mjs` 脚本不在任何 tsconfig 里
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2025,
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
        globals: globals.browser
      }
    }
  },
  {
    name: 'app/scripts',
    // 构建 / 脚本类文件（不在 tsconfig 里）只需要 node 全局
    files: ['**/*.{mjs,cjs,js}'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,tsx}'],
    rules: {
      eqeqeq: 'error',
      // 模块解析交给 TypeScript：@/ alias、显式 .tsx 扩展名、workspace exports map 都超出 node resolver 的能力
      'import/no-unresolved': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ArrowFunctionExpression',
          message:
            'Arrow functions are not allowed. Use function declarations or function expressions.'
        },
        {
          selector: 'FunctionExpression[id]',
          message:
            '回调函数不需要命名：对象字面量的属性值用方法简写（execute(input) { … }），其余用匿名的 function 表达式（有意递归/需要自引用才命名）'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    name: 'renderer-process-boundaries',
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/main.ts', 'src/host/**', 'src/preload.ts', 'src/preload.*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/host/(?!contract/itc$).*',
              message: 'Renderer may only import type surface from @/host/contract/itc'
            },
            {
              group: ['electron'],
              message: 'Renderer must not import electron'
            }
          ]
        }
      ]
    }
  },
  {
    name: 'preload-process-boundaries',
    files: ['src/preload.ts', 'src/preload.*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\./host(/.*)?$',
              message: 'Preload must not import main-process modules'
            },
            {
              group: ['@/', '@/*'],
              message: 'Preload must not use @/ UI alias'
            }
          ]
        }
      ]
    }
  },
  {
    name: 'host-process-boundaries',
    files: ['src/main.ts', 'src/host/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/', '@/*'],
              message: 'Host must not import renderer modules via @/'
            }
          ]
        }
      ]
    }
  },
  {
    // src/shared 被三个进程同时引入，任何运行时框架依赖都会被带进渲染包。
    // 把「框架无关」从口头约定变成机器可验的不变量。
    name: 'shared-framework-free',
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/*'],
              message: 'src/shared 必须框架无关：不得 import electron'
            },
            {
              group: ['node:*'],
              message: 'src/shared 必须框架无关：不得 import node 内置模块'
            }
          ]
        }
      ]
    }
  },
  {
    // 存量基线：studio 的 lint 在本次迁移前从未跑通，这些规则按 warning 处理，
    // 新写的代码（chat 等）本身就符合规则，不受影响。
    name: 'app/legacy-baseline',
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-syntax': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'import/no-duplicates': 'warn',
      'no-var': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      // 模块解析交给 TypeScript（@/ alias、显式扩展名、workspace exports 都超出 node resolver 能力）
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off'
    }
  },
  {
    // 放在最后：前面 app/legacy-baseline 会把 no-restricted-syntax 降成 warning，
    // 而这条是硬要求（catch 一律不许静默吃掉）
    name: 'app/catch-must-report',
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: { studio: { rules: { 'catch-must-report': catchMustReport } } },
    rules: {
      'studio/catch-must-report': 'error'
    }
  }
])
