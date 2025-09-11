import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
	{
		ignores: ['eslint.config.ts']
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	eslintPluginPrettierRecommended,
	globalIgnores(['dist', 'node_modules']),
	{
		plugins: {
			'@typescript-eslint': tseslint.plugin
		},
		languageOptions: {
			parser: tseslint.parser,
			sourceType: 'commonjs',
			globals: {
				...globals.node,
				...globals.jest
			},
			parserOptions: {
				ecmaVersion: 2023,
				projectService: true,
				tsconfigRootDir: process.cwd(),
				globals: globals.browser
			}
		}
	},
	{
		name: 'app/files-to-lint',
		files: ['**/*.ts'],
		extends: [eslint.configs.recommended, tseslint.configs.recommended],
		rules: {
			eqeqeq: 'error',
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/interface-name-prefix': 'error',
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',

			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'no-trailing-spaces': 'off',

			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],
			'prettier/prettier': [
				'error',
				{
					arrowParens: 'always',
					bracketSpacing: true,
					endOfLine: 'crlf',
					printWidth: 100,
					semi: false,
					singleQuote: true,
					tabWidth: 2,
					trailingComma: 'none',
					useTabs: true
				}
			]
		}
	}
])
