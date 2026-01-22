import type { Plugin } from 'rollup'

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

export { definePathRewrite }
