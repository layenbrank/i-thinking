import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const EXTERNAL = [
  /^@vueuse\//,
  /^vue($|\/)/,
  /^@vue($|\/)/,
  /^rxjs($|\/)/,
  /\/src\/useWheel$/,
  /\/src\/deferred-render$/
]

type Entry = {
  readonly name: string
  readonly input: string
}

const ENTRIES: readonly Entry[] = [
  { name: 'index', input: 'index.ts' },
  { name: 'useWheel', input: 'src/useWheel.ts' },
  { name: 'deferred-render', input: 'src/deferred-render.ts' }
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
