import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'
import importeslint from 'eslint-plugin-import'

export default defineConfig([
  globalIgnores(['dist', 'dist-ssr', 'coverage', 'node_modules']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.recommended,
  reactRefresh.configs.vite,
  importeslint.flatConfigs.recommended,

  {
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:import/recommended',
      'plugin:import/electron',
      'plugin:import/typescript'
    ],
    languageOptions: {
      parser: tseslint.parser,
      project: ['tsconfig.json'],
      parserOptions: {
        ecmaVersion: 2025,
        projectService: true,
        tsconfigRootDir: fileURLToPath(import.meta.url),
        globals: globals.browser
      }
    }
  },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,tsx}'],
    extends: [],
    rules: {
      eqeqeq: 'error',
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
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          ignores: ['env.d.ts']
        }
      ],
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
    ignores: ['src/main.ts', 'src/plugins/**', 'src/preload.ts', 'src/preload.*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/plugins/(?!itc$).*',
              message: 'Renderer may only import type surface from @/plugins/itc'
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
              regex: '^\\./plugins/(?!channels$|result$|itc$).*',
              message: 'Preload may only use plugins/channels, result, itc'
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
    files: ['src/main.ts', 'src/plugins/**/*.{ts,tsx}'],
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
    name: 'app/files-to-ignore',
    ignores: []
  }
])
