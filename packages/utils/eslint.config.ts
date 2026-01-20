import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    ignores: ['**/dist/**', '**/node_modules/**']
  },
  globalIgnores(['dist', 'node_modules']),
  eslint.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2025,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        globals: globals.browser
      }
    }
  },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,tsx}'],
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
    rules: {
      eqeqeq: 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../*', '../../*', '../../../*']
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
  }
])
