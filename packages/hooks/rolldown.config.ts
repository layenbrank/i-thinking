import { definePathRewrite } from '@i-thinking/construct'
import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const EXTERNAL = [/^react($|\/)/, /\/src\/useResize$/]

const pathRewrite = definePathRewrite({
  './src/useResize': './useResize.js'
})

export default defineConfig([
  {
    input: {
      index: 'index.ts'
    },
    external: EXTERNAL,
    plugins: [pathRewrite, dts({ tsconfig: './tsconfig.build.json' })],
    output: {
      dir: 'dist',
      format: 'esm'
    }
  },
  {
    input: {
      useResize: 'src/useResize.ts'
    },
    external: EXTERNAL,
    plugins: [dts({ tsconfig: './tsconfig.build.json' })],
    output: {
      dir: 'dist',
      format: 'esm'
    }
  }
])
