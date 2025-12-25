import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import type { Plugin, RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import { dts } from 'rollup-plugin-dts'

/**
 * External dependencies that should not be bundled
 * Following the pattern from Vite and Vue ecosystem projects
 */
const EXTERNAL_DEPS = [
  /^vue($|\/)/,
  /^pinia($|\/)/,
  /^rxjs($|\/)/,
  /^dayjs($|\/)/,
  /^lunisolar($|\/)/,
  /^tyme4ts$/,
  /^@vueuse\//
] as const

/**
 * Package entry points configuration
 * Each entry represents a separately bundled submodule
 */
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

/**
 * Path mappings for index file re-exports
 * Maps source import paths to distribution output paths
 */
const PATH_REWRITES = {
  './directives/index': './directives',
  './hooks/index': './hooks',
  './utils/index': './utils'
} as const

/**
 * Custom plugin to rewrite import/export paths in the main entry point
 * Ensures that re-exports point to the correct flat output structure
 *
 * @example
 * // Before: export * from './directives/index'
 * // After:  export * from './directives'
 */
function definePathRewrite(): Plugin {
  return {
    name: 'path-rewrite',
    renderChunk(code) {
      let result = code
      for (const [from, to] of Object.entries(PATH_REWRITES)) {
        const pattern = new RegExp(`(from\\s+['"\`])${from.replace(/\//g, '\\/')}(['"\`])`, 'g')
        result = result.replace(pattern, `$1${to}$2`)
      }
      return result
    }
  }
}

/**
 * Pre-configured TypeScript plugin instance
 */
function defineTypescript(): Plugin {
  return typescript({
    tsconfig: 'tsconfig.json',
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    compilerOptions: {
      declaration: false,
      composite: false
    }
  })
}

/**
 * Pre-configured Terser plugin instance for production builds
 */
function defineTerser(): Plugin {
  return terser({
    compress: {
      passes: 2,
      pure_getters: true,
      unsafe_arrows: true,
      drop_console: false,
      ecma: 2020
    },
    mangle: {
      reserved: []
    },
    format: {
      comments: false,
      ecma: 2020
    }
  })
}

interface BuildOptions {
  readonly minify?: boolean
  readonly external?: readonly string[]
  readonly plugins?: readonly Plugin[]
}

/**
 * Rollup configuration for JavaScript output
 *
 * @param input - Source file path
 * @param output - Destination file path
 * @param options - Additional build options
 */
function defineJSConfig(input: string, output: string, options: BuildOptions): RollupOptions {
  const { minify = false, external = [], plugins = [] } = options

  return {
    input,
    output: {
      file: output,
      format: 'es',
      esModule: true,
      sourcemap: false,
      generatedCode: {
        constBindings: true,
        arrowFunctions: true
      },
      preserveModules: false
    },
    external(id) {
      // External npm dependencies
      if (EXTERNAL_DEPS.some((pattern) => pattern.test(id))) return true
      // Custom external modules
      return external.some((mod) => id === mod || id.startsWith(`${mod}/`))
    },
    plugins: [
      nodeResolve({ extensions: ['.ts', '.tsx'] }),
      defineTypescript(),
      minify ? defineTerser() : null,
      ...plugins
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false
    }
  }
}

/**
 * Rollup configuration for TypeScript declaration output
 *
 * @param input - Source file path
 * @param output - Destination declaration file path
 * @param options - Additional build options
 */
function defineDTSConfig(input: string, output: string, options: BuildOptions = {}): RollupOptions {
  const { external = [], plugins = [] } = options

  return {
    input,
    output: {
      file: output,
      format: 'es'
    },
    external(id) {
      // External npm dependencies
      if (EXTERNAL_DEPS.some((pattern) => pattern.test(id))) return true
      // Custom external modules
      return external.some((mod) => id === mod || id.startsWith(`${mod}/`))
    },
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          preserveSymlinks: false
        }
      }),
      ...plugins
    ]
  }
}

/**
 * Generate all build configurations from entry points
 */
function buildConfigs(): RollupOptions[] {
  const configs: RollupOptions[] = []
  const defineRewrite = definePathRewrite()

  // Get submodule paths for the main entry's external configuration
  const modulePaths = ENTRIES.filter(function (entry) {
    return entry.name !== 'index'
  }).map(function (entry) {
    return `./${entry.name}`
  })

  for (const entry of ENTRIES) {
    const { name, source, minify } = entry
    const isMainEntry = name === 'index'

    // JavaScript build
    configs.push(
      defineJSConfig(source, `dist/${name}.js`, {
        minify,
        external: isMainEntry ? modulePaths : [],
        plugins: isMainEntry ? [defineRewrite] : []
      })
    )

    // TypeScript declaration build
    configs.push(
      defineDTSConfig(source, `dist/${name}.d.ts`, {
        external: isMainEntry ? modulePaths : [],
        plugins: isMainEntry ? [defineRewrite] : []
      })
    )
  }

  return configs
}

export default defineConfig(buildConfigs())
