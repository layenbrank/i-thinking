import defineResolve from '@rollup/plugin-node-resolve'
import defineMinify from '@rollup/plugin-terser'
import defineTs from '@rollup/plugin-typescript'
import type { Plugin, RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import { dts as defineType } from 'rollup-plugin-dts'

const chunkmap = [
  /^dayjs($|\/)/,
  /^lunisolar($|\/)/,
  /^tyme4ts$/,
  /\/generate$/,
  /\/support$/,
  /\/singleton$/,
  /\/calendar$/,
  /\/time-sphere$/
]

const PATH_REWRITES = {
  './src/time-sphere': './time-sphere',
  './src/calendar': './calendar',
  './src/singleton': './singleton',
  './src/generate': './generate',
  './src/support': './support',
  '@/time-sphere': './time-sphere',
  '@/calendar': './calendar',
  '@/singleton': './singleton',
  '@/generate': './generate',
  '@/support': './support'
} as const

function definePathRewrite(rewrites: Record<string, string>): Plugin {
  return {
    name: 'path-rewrite',
    renderChunk(code) {
      let result = code
      for (const [from, to] of Object.entries(rewrites)) {
        const pattern = new RegExp(
          `(from\\s+['"\`])${from.replace(/\//g, '\\/')}(['"\`])`,
          'g'
        )
        result = result.replace(pattern, `$1${to}$2`)
      }
      return result
    }
  }
}
const configures: RollupOptions[] = [
  {
    input: 'index.ts',
    external: chunkmap,
    // external(source) {
    //   console.log('external source:', source)
    //   return chunkmap.some((pattern) => pattern.test(source))
    // },
    plugins: [
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'index.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/index.min.js',
        format: 'esm',
        name: 'utils'
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
      definePathRewrite(PATH_REWRITES),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/time-sphere/index.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/time-sphere.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/time-sphere/index.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/time-sphere.min.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/time-sphere/index.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/time-sphere.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      definePathRewrite(PATH_REWRITES),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/calendar.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/calendar.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/calendar.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/calendar.min.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/calendar.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/calendar.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      definePathRewrite(PATH_REWRITES),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/singleton.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/singleton.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/singleton.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/singleton.min.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/singleton.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/singleton.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      definePathRewrite(PATH_REWRITES),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/generate.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/generate.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/generate.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/generate.min.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/generate.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/generate.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      definePathRewrite(PATH_REWRITES),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  },

  {
    input: 'src/support.ts',
    external: chunkmap,
    plugins: [
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/support.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/support.ts',
    external: chunkmap,
    plugins: [
      defineMinify(),
      defineResolve(),
      definePathRewrite(PATH_REWRITES),
      defineTs({
        tsconfig: 'tsconfig.build.json'
      })
    ],
    output: [
      {
        file: 'dist/support.min.js',
        format: 'esm',
        name: 'utils'
      }
    ]
  },
  {
    input: 'src/support.ts',
    external: chunkmap,
    output: [
      {
        file: 'dist/support.d.ts',
        format: 'esm'
      }
    ],
    plugins: [
      definePathRewrite(PATH_REWRITES),
      defineType({
        tsconfig: 'tsconfig.build.json'
      })
    ]
  }
]

export default defineConfig(configures)

// export default defineConfig([
//   {
//     input: ['src/index.ts', 'src/time-sphere/index.ts', 'src/singleton.ts'],
//     external: chunkmap,
//     plugins: [defineResolve(), defineTs({ tsconfig: 'tsconfig.build.json' })],
//     output: {
//       dir: 'dist',
//       format: 'esm',
//       preserveModules: true,
//       preserveModulesRoot: 'src',
//       entryFileNames: '[name].js'
//     }
//   },
//   {
//     input: ['src/index.ts', 'src/time-sphere/index.ts', 'src/singleton.ts'],
//     external: chunkmap,
//     plugins: [
//       defineResolve(),
//       defineTs({ tsconfig: 'tsconfig.build.json' }),
//       defineMinify()
//     ],
//     output: {
//       dir: 'dist',
//       format: 'esm',
//       // preserveModules: true,
//       // preserveModulesRoot: 'src',
//       entryFileNames: '[name].min.js'
//     }
//   },
//   {
//     input: ['src/index.ts', 'src/time-sphere/index.ts', 'src/singleton.ts'],
//     external: chunkmap,
//     plugins: [defineType({ tsconfig: 'tsconfig.build.json' })],
//     output: {
//       dir: 'dist',
//       format: 'esm',
//       // preserveModules: true,
//       // preserveModulesRoot: 'src',
//       entryFileNames: '[name].d.ts'
//     }
//   }
// ])
