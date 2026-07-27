import { defineConfig, type Plugin } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const EXTERNAL = [
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

type Entry = {
  readonly name: string
  readonly input: string
  readonly minify?: boolean
}

const ENTRIES: readonly Entry[] = [
  { name: 'index', input: 'index.ts' },
  { name: 'time-sphere', input: 'src/time-sphere/index.ts' },
  { name: 'calendar', input: 'src/calendar.ts' },
  { name: 'singleton', input: 'src/singleton.ts' },
  { name: 'generate', input: 'src/generate.ts' },
  { name: 'support', input: 'src/support.ts' }
]

const pathRewrite = definePathRewrite(PATH_REWRITES)

function defineEntryConfigs(entry: Entry) {
  const { name, input } = entry
  return [
    {
      input: { [name]: input },
      external: EXTERNAL,
      plugins: [pathRewrite, dts({ tsconfig: './tsconfig.build.json' })],
      output: {
        dir: 'dist',
        format: 'esm' as const
      }
    },
    {
      input: { [`${name}.min`]: input },
      external: EXTERNAL,
      plugins: [pathRewrite],
      output: {
        dir: 'dist',
        format: 'esm' as const,
        minify: true
      }
    }
  ]
}

export default defineConfig(ENTRIES.flatMap(defineEntryConfigs))
