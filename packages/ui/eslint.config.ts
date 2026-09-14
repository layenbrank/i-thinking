import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

/**
 * UI 包规则与 app 侧保持一致，但**不禁止箭头函数**：
 * 本包大量代码来自 shadcn / assistant-ui registry（copy-in），
 * 生成物用箭头函数表达 render prop / 事件回调，逐次改写不划算。
 */
export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2025,
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
        globals: globals.browser
      }
    },
    rules: {
      eqeqeq: 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      // shadcn 组件与自身的 cva 变体同文件导出（buttonVariants 等）是上游惯例；
      // 该规则针对 app 的 HMR 边界，这里放宽以免每 add 一次就要拆文件。
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },

  // 工具脚本跑在 Node 里
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node
    }
  },

  /**
   * assistant-ui registry 生成物（`shadcn add @assistant-ui/*`，见 scripts/normalize-registry.mjs）。
   * 保持与上游一致，不做逐次改写 —— 否则每次重新 add 都要重做一遍：
   * - `== null` 是上游的 null/undefined 双检惯用法（smart 允许它，但仍禁其它 `==`）
   * - 空 catch 用于"尽力而为"的序列化回退
   * - 组件里读 ref 是上游的测量写法，本包不改上游实现
   */
  {
    files: ['src/components/assistant-ui/**/*.tsx'],
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-hooks/refs': 'off'
    }
  }
])
