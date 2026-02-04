import defineResolve from '@rollup/plugin-node-resolve'
import defineTs from '@rollup/plugin-typescript'
import type { RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import { dts as defineType } from 'rollup-plugin-dts'

// Rollup 配置是 ESM，Node 无法解析无扩展名的 TS 导入。把导入改成显式 .ts 了。见
import { definePathRewrite } from './src/path-rewrite.ts'

const chunkmap: RegExp[] = [/^rollup$/, /src\/path-rewrite$/]

const configures: RollupOptions[] = [
  {
    input: 'index.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      definePathRewrite({
        './src/path-rewrite': './path-rewrite.js'
      }),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: {
      file: 'dist/index.js',
      format: 'esm',
      name: 'Construct'
    }
  },
  {
    input: 'index.ts',
    external: chunkmap,
    plugins: [
      definePathRewrite({
        './src/path-rewrite': './path-rewrite'
      }),
      defineResolve(),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
      name: 'Construct'
    }
  },
  {
    input: 'src/path-rewrite.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: {
      file: 'dist/path-rewrite.js',
      format: 'esm',
      name: 'Construct'
    }
  },
  {
    input: 'src/path-rewrite.ts',
    external: chunkmap,
    plugins: [
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: {
      file: 'dist/path-rewrite.d.ts',
      format: 'esm',
      name: 'Construct'
    }
  }
]

export default defineConfig(configures)
