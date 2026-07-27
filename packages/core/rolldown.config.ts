import { defineConfig, type Plugin } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const EXTERNAL_DEPS = [
  /^vue($|\/)/,
  /^pinia($|\/)/,
  /^rxjs($|\/)/,
  /^dayjs($|\/)/,
  /^lunisolar($|\/)/,
  /^tyme4ts$/,
  /^@vueuse\//
] as const

const ENTRIES = [
  {
    name: 'index',
    source: 'src/index.ts',
    minify: false
  },
  {
    name: 'directives',
    source: 'src/directives/index.ts',
    minify: true
  },
  {
    name: 'hooks',
    source: 'src/hooks/index.ts',
    minify: true
  },
  {
    name: 'utils',
    source: 'src/utils/index.ts',
    minify: true
  }
] as const

const PATH_REWRITES = {
  './directives/index': './directives',
  './hooks/index': './hooks',
  './utils/index': './utils'
} as const

function definePathRewrite(): Plugin {
  return {
    name: 'path-rewrite',
    renderChunk(code) {
      let result = code
      for (const [from, to] of Object.entries(PATH_REWRITES)) {
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

const modulePaths = ENTRIES.filter(function (entry) {
  return entry.name !== 'index'
}).map(function (entry) {
  return `./${entry.name}`
})

const pathRewrite = definePathRewrite()

function isExternal(id: string, isMainEntry: boolean): boolean {
  if (EXTERNAL_DEPS.some((pattern) => pattern.test(id))) return true
  if (!isMainEntry) return false
  return modulePaths.some((mod) => id === mod || id.startsWith(`${mod}/`))
}

function defineEntryConfigs(entry: (typeof ENTRIES)[number]) {
  const isMainEntry = entry.name === 'index'
  const plugins = isMainEntry
    ? [pathRewrite, dts({ tsconfig: './tsconfig.json' })]
    : [dts({ tsconfig: './tsconfig.json' })]

  const configs = [
    {
      input: { [entry.name]: entry.source },
      external(id: string) {
        return isExternal(id, isMainEntry)
      },
      plugins,
      output: {
        dir: 'dist',
        format: 'esm' as const,
        minify: entry.minify
      }
    }
  ]

  return configs
}

export default defineConfig(ENTRIES.flatMap(defineEntryConfigs))
