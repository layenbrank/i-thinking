import defineResolve from '@rollup/plugin-node-resolve'
import defineMinify from '@rollup/plugin-terser'
import defineTs from '@rollup/plugin-typescript'
import type { RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import { dts as defineType } from 'rollup-plugin-dts'
import { definePathRewrite } from '@i-thinking/construct'

const chunkmap = [/^react($|\/)/, /\/src\/useResize$/]

const configures: RollupOptions[] = [
  {
    input: 'index.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      }),
      definePathRewrite({
        './src/useResize': './useResize.js'
      })
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        name: 'hooks'
      }
    ]
  },
  {
    input: 'index.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/index.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      defineResolve(),
      defineType({
        tsconfig: 'tsconfig.build.json'
      }),
      definePathRewrite({
        './src/useResize': './useResize'
      })
    ]
  },

  {
    input: 'src/useResize.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/useResize.js',
        format: 'esm',
        name: 'hooks'
      }
    ]
  },
  {
    input: 'src/useResize.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/useResize.d.ts',
        format: 'esm',
        name: 'hooks'
      }
    ],
    plugins: [
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  }
]

export default defineConfig(configures)
