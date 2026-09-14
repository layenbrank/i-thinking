import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

/**
 * extension 的 ESLint（flat config）：Vue 侧已全部迁到 React，这里不再需要
 * `eslint-plugin-vue` / `@vue/eslint-config-*`，与 studio 保持一致。
 */
export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage']),
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,

  {
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2025,
      globals: {
        ...globals.browser,
        ...globals.worker,
        chrome: 'readonly'
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url))
      }
    }
  },

  {
    name: 'app/rules',
    files: ['**/*.{ts,tsx}'],
    rules: {
      eqeqeq: 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },

  {
    // MV3 的 service worker / content script 还留着旧代码，chrome.* 大量是 any
    name: 'app/legacy-mv3',
    files: ['src/libs/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-prototype-builtins': 'off'
    }
  }
])
