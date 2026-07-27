import type { Plugin } from 'rolldown'

function definePathRewrite(rewrites: Record<string, string>): Plugin {
  return {
    name: 'path-rewrite',
    renderChunk(code) {
      let result = code
      for (const [from, to] of Object.entries(rewrites)) {
        const escapedFrom = from.replace(/\//g, '\\/')
        const pattern = new RegExp(
          `(from\\s+['"\`])${escapedFrom}(?:\\.m?js|\\.ts)?(['"\`])`,
          'g'
        )
        result = result.replace(pattern, `$1${to}$2`)
      }
      return result
    }
  }
}

export { definePathRewrite }
