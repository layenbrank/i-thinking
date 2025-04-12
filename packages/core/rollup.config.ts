import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import resolve from '@rollup/plugin-node-resolve'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dts from 'rollup-plugin-dts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 通用外部依赖
const externals: (string | RegExp)[] = [
  'vue',
  '@vueuse/core',
  'rxjs',
  'rxjs/operators',
  'dayjs',
  /^dayjs\/.*/,
  'lunisolar',
  /^lunisolar\/.*/,
  'tyme4ts',
  'pinia'
]

// 模块名称
const moduleNames: string[] = ['directives', 'hooks', 'utils']

type ModuleName = (typeof moduleNames)[number]

// 创建JS构建配置的工厂函数
function JsConfig(moduleName: ModuleName) {
  return {
    input: path.resolve(__dirname, `src/${moduleName}/index.ts`),
    output: {
      file: `dist/${moduleName}.js`,
      format: 'es',
      sourcemap: false
    },
    plugins: [
      terser(),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        sourceMap: false
      })
    ],
    external: externals
  }
}

// 创建类型声明构建配置的工厂函数
function DtsConfig(moduleName: ModuleName) {
  return {
    input: path.resolve(__dirname, `src/${moduleName}/index.ts`),
    output: {
      file: `dist/${moduleName}.d.ts`,
      format: 'es'
    },
    plugins: [dts()],
    external: externals
  }
}

// 创建index重导出构建配置
function IndexJsConfig() {
  return {
    input: path.resolve(__dirname, 'src/index.ts'),
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: false
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        sourceMap: false
      })
    ],
    // 关键：正确标记导入的子模块为外部依赖
    external: [
      ...externals,
      './directives/index',
      './hooks/index',
      './utils/index',
      // 兼容不同可能的引入路径
      './directives',
      './hooks',
      './utils'
    ]
  }
}

// 创建index类型声明构建配置
function IndexDtsConfig() {
  return {
    input: path.resolve(__dirname, 'src/index.ts'),
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()],
    external: [
      ...externals,
      './directives/index',
      './hooks/index',
      './utils/index',
      // 兼容不同可能的引入路径
      './directives',
      './hooks',
      './utils'
    ]
  }
}

// 使用映射生成所有模块的JS构建配置
const jsConfigs = moduleNames.map(JsConfig)

// 使用映射生成所有模块的类型声明构建配置
const dtsConfigs = moduleNames.map(DtsConfig)

// 添加index构建配置
jsConfigs.push(IndexJsConfig())
dtsConfigs.push(IndexDtsConfig())

// 合并所有配置
export default [...jsConfigs, ...dtsConfigs]
