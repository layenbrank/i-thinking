import defineResolve from '@rollup/plugin-node-resolve'
import defineMinify from '@rollup/plugin-terser'
import defineTs from '@rollup/plugin-typescript'
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import { dts as defineType } from 'rollup-plugin-dts'

const dirname = process.cwd()

const chunkmap = [
  /^vue$/,
  /^@vue($|\/)/,
  /^dayjs($|\/)/,
  /^lunisolar($|\/)/,
  /^tyme4ts$/,
  /\/resize$/,
  /\/debounce$/
]

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

function isIndexEntry(path: string) {
  const normalized = normalizePath(path)
  return normalized.startsWith('src/') && normalized.endsWith('/index.ts')
}

function buildIndexDirSet(paths: string[]) {
  const indexDirSet = new Set<string>()
  for (const path of paths) {
    if (!isIndexEntry(path)) continue
    const indexDir = normalizePath(resolve(dirname, path)).replace(
      /\/index\.ts$/,
      ''
    )
    indexDirSet.add(indexDir)
  }
  return indexDirSet
}

const indexRegExp = /index\.ts$/

async function definePaths() {
  const dirs = await readdir(resolve(dirname, 'src'), {
    encoding: 'utf-8',
    recursive: true
  })

  const paths: string[] = []

  for (const dir of dirs) {
    // const dirPath = await readdir(resolve(dirname, 'src', dir))
    if (!dir.endsWith('.ts')) continue
    if (dir.endsWith('.d.ts')) continue

    const stats = await stat(join('src', dir))
    if (!stats.isFile()) continue

    paths.push(join('src', dir))
  }

  let configures: RollupOptions[] = []
  const sourceAbsSet = new Set(paths.map((path) => resolve(dirname, path)))

  for (const path of paths) {
    const isIndex = indexRegExp.test(path)
    const currentAbs = resolve(dirname, path)

    const configure: RollupOptions = {
      input: path,
      external(source, importer, isResolved) {
        if (!isIndex) return false
        if (!importer) return false
        const resolved = resolve(
          importer ? resolve(importer, '..') : '',
          source
        )
        if (resolved === currentAbs) return false
        return sourceAbsSet.has(resolved)
      },
      plugins: [
        defineResolve(),
        defineTs({
          tsconfig: 'tsconfig.build.json'
        })
      ],
      output: [
        {
          file: path.replace('src', 'dist').replace('.ts', '.js'),
          format: 'esm',
          name: 'directives'
        }
        // {
        //   file: path.replace('src', 'dist').replace('.ts', '.umd.js'),
        //   format: 'umd',
        //   name: 'directives'
        // }
      ]
    }

    const minify: RollupOptions = {
      input: path,
      plugins: [
        defineResolve(),
        defineTs({
          tsconfig: 'tsconfig.build.json'
        }),
        defineMinify()
      ],
      output: [
        {
          file: path.replace('src', 'dist').replace('.ts', '.min.js'),
          format: 'esm',
          name: 'directives'
        }
        // {
        //   file: path.replace('src', 'dist').replace('.ts', '.umd.min.js'),
        //   format: 'umd',
        //   name: 'directives'
        // }
      ]
    }

    const type: RollupOptions = {
      input: path,
      plugins: [
        defineType({
          tsconfig: 'tsconfig.build.json'
        })
      ],
      output: [
        {
          file: path.replace('src', 'dist').replace('.ts', '.d.ts'),
          format: 'esm'
        }
      ]
    }

    configures = configures.concat([configure, minify, type])
  }
  return configures
}

// const configures = await definePaths()

const configures: RollupOptions[] = [
  {
    input: 'src/index.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        name: 'directives'
      }
    ]
  },
  {
    input: 'src/index.ts',
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
        name: 'directives'
      }
    ]
  },
  {
    input: 'src/index.ts',
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
    input: 'src/debounce.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/debounce.js',
        format: 'esm',
        name: 'directives'
      }
    ]
  },
  {
    input: 'src/debounce.ts',
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
        file: 'dist/debounce.min.js',
        format: 'esm',
        name: 'directives'
      }
    ]
  },
  {
    input: 'src/debounce.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/debounce.d.ts',
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
    input: 'src/resize.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/resize.js',
        format: 'esm',
        name: 'directives'
      }
    ]
  },
  {
    input: 'src/resize.ts',
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
        file: 'dist/resize.min.js',
        format: 'esm',
        name: 'directives'
      }
    ]
  },
  {
    input: 'src/resize.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/resize.d.ts',
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
// export default defineConfig(function (command) {
//   return configures
// })
