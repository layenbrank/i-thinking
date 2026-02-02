import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs
} from '@vue/eslint-config-typescript'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginPlaywright from 'eslint-plugin-playwright'
import pluginVue from 'eslint-plugin-vue'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'

/**
 * 配置 Vue 项目的 ESLint 环境
 * @param {Object} options - 配置选项
 * @param {string[]} options.scriptLangs - 允许在 `.vue` 文件中使用的脚本语言
 * @param {string} options.rootDir - 项目的根目录
 */
configureVueProject({
  // 允许在 `.vue` 文件中使用 TypeScript 和 TSX
  scriptLangs: ['ts', 'tsx'],
  // 设置项目的根目录为当前模块的目录
  rootDir: fileURLToPath(import.meta.url)
})

// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  vueTsConfigs.recommendedTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  pluginOxlint.configs['flat/recommended'],
  skipFormatting,
  globalIgnores(['dist', 'node_modules']),
  {
    name: 'app/files-to-lint',
    // plugins: {
    // 	'@typescript-eslint': tseslint.plugin
    // },
    files: ['**/*.{ts,mts,tsx,vue}'],
    // extends: [eslint.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      // parser: tseslint.parser,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: fileURLToPath(import.meta.url),
        globals: globals.browser
      }
    },
    rules: {
      /* 禁止使用 `var` 声明变量，推荐使用 `let` 或 `const` */
      'no-var': 'error',
      'no-trailing-spaces': 'error',
      /* 要求使用严格相等（`===`）和严格不相等（`!==`），避免宽松相等带来的潜在问题 */
      eqeqeq: 'error',
      /* 对显式使用 `any` 类型发出警告，尽量避免使用 `any` 以保证类型安全 */
      '@typescript-eslint/no-explicit-any': 'off',
      /* 避免在条件表达式中使用赋值语句，这可能导致逻辑错误 */
      '@typescript-eslint/no-unused-expressions': 'off',
      /* 对不安全的赋值操作发出警告，确保赋值操作的类型安全 */
      '@typescript-eslint/no-unsafe-assignment': 'error',
      /* 限制嵌套代码块的最大深度，保持代码的清晰结构 */
      'max-depth': ['error', 4],
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      /* 禁止未处理的 Promise语句 */
      '@typescript-eslint/no-floating-promises': 'error',
      /* 禁止将 Promise 传递到错误逻辑位置的代码 */
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'off',

      /* 对未使用的变量发出错误，保持代码的简洁性 */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      /* 限制每行代码的最大长度，增强代码的可读性 */
      // 'vue/max-len': [
      //   'error',
      //   {
      //     code: 300,
      //     template: 300,
      //     tabWidth: 2,
      //     comments: 200,
      //     ignorePattern: '(<svg.*>|<path.*>|<circle.*>|<g.*>|<rect.*>/.*>|xlink:href=".*"|d=.*)',
      //     ignoreComments: false,
      //     ignoreTrailingComments: false,
      //     ignoreUrls: true,
      //     ignoreStrings: false,
      //     ignoreTemplateLiterals: false,
      //     ignoreRegExpLiterals: false,
      //     ignoreHTMLAttributeValues: false,
      //     ignoreHTMLTextContents: true
      //   }
      // ],
      /* 要求组件名称使用驼峰命名法，增强代码的可读性 */
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: [
            'contextmenu',
            'controller',
            'overview',

            'bookmark',
            'calendar',
            'marketplace',
            'settings',
            'navigation',
            'markdown',
            'intelligence',
            'clipchamp',
            'example',
            'gallery',
            'collection',
            'signboard',
            'clock'
          ]
        }
      ]
      // 'prettier/prettier': [
      // 	'error',
      // 	{
      // 		arrowParens: 'always',
      // 		bracketSpacing: true,
      // 		endOfLine: 'lf',
      // 		printWidth: 100,
      // 		semi: false,
      // 		singleQuote: true,
      // 		tabWidth: 2,
      // 		trailingComma: 'none',
      // 		useTabs: true
      // 	}
      // ]
    }
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*']
  },
  {
    ...pluginPlaywright.configs['flat/recommended'],
    files: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**']
  }
)
