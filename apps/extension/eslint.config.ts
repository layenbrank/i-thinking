import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import oxlint from 'eslint-plugin-oxlint'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
import { configureVueProject } from '@vue/eslint-config-typescript'

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
  rootDir: import.meta.dirname
})

// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  oxlint.configs['flat/recommended'],
  skipFormatting,
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      /* 禁止使用 `var` 声明变量，推荐使用 `let` 或 `const` */
      'no-var': 'error',
      /* 要求使用严格相等（`===`）和严格不相等（`!==`），避免宽松相等带来的潜在问题 */
      eqeqeq: 'error',
      /* 对显式使用 `any` 类型发出警告，尽量避免使用 `any` 以保证类型安全 */
      '@typescript-eslint/no-explicit-any': 'off',
      /* 避免在条件表达式中使用赋值语句，这可能导致逻辑错误 */
      '@typescript-eslint/no-unused-expressions': 'off',
      /* 对不安全的赋值操作发出警告，确保赋值操作的类型安全 */
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      /* 限制嵌套代码块的最大深度，保持代码的清晰结构 */
      'max-depth': ['error', 4],
      '@typescript-eslint/no-namespace': 'off',
      /* 对未使用的变量发出错误，保持代码的简洁性 */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      /* 限制每行代码的最大长度，增强代码的可读性 */
      'vue/max-len': [
        'error',
        {
          code: 300,
          template: 300,
          tabWidth: 2,
          comments: 200,
          ignorePattern: '(<svg.*>|<path.*>|<circle.*>|<g.*>|<rect.*>/.*>|xlink:href=".*"|d=.*)',
          ignoreComments: false,
          ignoreTrailingComments: false,
          ignoreUrls: true,
          ignoreStrings: false,
          ignoreTemplateLiterals: false,
          ignoreRegExpLiterals: false,
          ignoreHTMLAttributeValues: false,
          ignoreHTMLTextContents: true
        }
      ],
      /* 要求组件名称使用驼峰命名法，增强代码的可读性 */
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: ['TODO', 'Bookmarks', 'Download']
        }
      ]
    }
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**']
  }
)
