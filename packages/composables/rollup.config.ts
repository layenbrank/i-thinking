import defineResolve from '@rollup/plugin-node-resolve'
import defineMinify from '@rollup/plugin-terser'
import defineTs from '@rollup/plugin-typescript'
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import { dts as defineType } from 'rollup-plugin-dts'

const dirname = process.cwd()

// ./src/deferred-render
// ./src/useWheel

const chunkmap = [
  /^@vueuse\//,
  /^vue($|\/)/,
  /^@vue($|\/)/,
  /^rxjs($|\/)/,
  /\/src\/useWheel$/,
  /\/src\/deferred-render$/
]

const configures: RollupOptions[] = [
  {
    input: 'index.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        name: 'composables'
      }
    ]
  },
  {
    input: 'index.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/index.min.js',
        format: 'esm',
        name: 'composables'
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
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/useWheel.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/useWheel.js',
        format: 'esm',
        name: 'composables'
      }
    ]
  },
  {
    input: 'src/useWheel.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/useWheel.min.js',
        format: 'esm',
        name: 'composables'
      }
    ]
  },
  {
    input: 'src/useWheel.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/useWheel.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/deferred-render.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/deferred-render.js',
        format: 'esm',
        name: 'composables'
      }
    ]
  },
  {
    input: 'src/deferred-render.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/deferred-render.min.js',
        format: 'esm',
        name: 'composables'
      }
    ]
  },
  {
    input: 'src/deferred-render.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/deferred-render.d.ts',
        format: 'esm'
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
