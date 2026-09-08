import { defineConfig, type Plugin } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const EXTERNAL = [/^react($|\/)/, /\/src\/useResize$/]

function definePathRewrite(rewrites: Record<string, string>): Plugin {
  return {
    name: 'path-rewrite',
    renderChunk(code) {
      let result = code
      for (const [from, to] of Object.entries(rewrites)) {
        const pattern = new RegExp(`(from\\s+['"\`])${from.replace(/\//g, '\\/')}(['"\`])`, 'g')
        result = result.replace(pattern, `$1${to}$2`)
      }
      return result
    }
  }
}

const pathRewrite = definePathRewrite({
  './src/useResize': './useResize.js'
})

export default defineConfig([
  {
    input: { index: 'index.ts' },
    external: EXTERNAL,
    plugins: [pathRewrite, dts({ tsconfig: './tsconfig.build.json' })],
    output: { dir: 'dist', format: 'esm' }
  },
  {
    input: { useResize: 'src/useResize.ts' },
    external: EXTERNAL,
    plugins: [dts({ tsconfig: './tsconfig.build.json' })],
    output: { dir: 'dist', format: 'esm' }
  }
])
