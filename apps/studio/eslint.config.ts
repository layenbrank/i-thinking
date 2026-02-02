import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'dist-ssr', 'coverage', 'node_modules']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.recommended,
  reactRefresh.configs.vite,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      project: ['tsconfig.app.json'],
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
    name: 'app/files-to-ignore',
    ignores: []
  }
])
