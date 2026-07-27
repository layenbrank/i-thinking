import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

import { definePathRewrite } from './src/path-rewrite.ts'

const EXTERNAL = [/^rolldown$/, /src\/path-rewrite$/]

export default defineConfig([
  {
    input: {
      index: 'index.ts'
    },
    external: EXTERNAL,
    plugins: [
      definePathRewrite({
        './src/path-rewrite': './path-rewrite.js'
      }),
      dts({ tsconfig: './tsconfig.build.json' })
    ],
    output: {
      dir: 'dist',
      format: 'esm'
    }
  },
  {
    input: {
      'path-rewrite': 'src/path-rewrite.ts'
    },
    external: EXTERNAL,
    plugins: [dts({ tsconfig: './tsconfig.build.json' })],
    output: {
      dir: 'dist',
      format: 'esm'
    }
  }
])
