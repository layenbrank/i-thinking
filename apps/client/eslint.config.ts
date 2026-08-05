import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url))

/**
 * Client ESLint：type-checked + projectService，与 tsconfig.app / tsconfig.node 对齐。
 * unused 仅由 @typescript-eslint/no-unused-vars 管理（支持 `_` 前缀），tsconfig 关闭 noUnused*。
 */
export default defineConfig(
  globalIgnores([
    'src/components/tiptap-ui/**',
    'src/components/tiptap-node/**',
    'src/components/tiptap-ui-primitive/**',
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/src-tauri/**',
    'chunks.log'
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.recommended,
  reactRefresh.configs.vite,
  {
    name: 'client/typescript',
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser
      },
      parserOptions: {
        ecmaVersion: 2025,
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: ROOT_DIR
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      'no-var': 'error',
      eqeqeq: 'error',
      'no-unused-vars': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports'
        }
      ],
      /* React 事件/props 常写 async handler，关闭 attributes 上的 Promise 误报 */
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false
          }
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    name: 'client/node-tooling',
    files: [
      'vite.config.*',
      'vite.chunk.*',
      'vitest.config.*',
      'playwright.config.*',
      'eslint.config.*',
      'scripts/**/*.{ts,mts}'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
)


