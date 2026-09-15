import eslint from '@eslint/js'
import importeslint from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

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
  }
])
