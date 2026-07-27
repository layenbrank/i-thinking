import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const EXTERNAL = [
  /^vue$/,
  /^@vue($|\/)/,
  /^dayjs($|\/)/,
  /^lunisolar($|\/)/,
  /^tyme4ts$/,
  /\/resize$/,
  /\/debounce$/
]

type Entry = {
  readonly name: string
  readonly input: string
}

const ENTRIES: readonly Entry[] = [
  { name: 'index', input: 'src/index.ts' },
  { name: 'debounce', input: 'src/debounce.ts' },
  { name: 'resize', input: 'src/resize.ts' }
]

function defineEntryConfigs(entry: Entry) {
  const { name, input } = entry
  return [
    {
      input: { [name]: input },
      external: EXTERNAL,
      plugins: [dts({ tsconfig: './tsconfig.build.json' })],
      output: {
        dir: 'dist',
        format: 'esm' as const
      }
    },
    {
      input: { [`${name}.min`]: input },
      external: EXTERNAL,
      plugins: [],
      output: {
        dir: 'dist',
        format: 'esm' as const,
        minify: true
      }
    }
  ]
}

export default defineConfig(ENTRIES.flatMap(defineEntryConfigs))
