import { watch, rollup, defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
export default defineConfig([
    {
        input: './src/index.ts',
        external: [
            'vue',
            '@vueuse/core',
            'rxjs',
            'rxjs/operators',
            'dayjs',
            'dayjs/*',
            'lunisolar',
            'tyme4ts'
        ],
        plugins: [
            terser(),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: true,
                rootDir: 'src',
                declarationDir: 'dist',
                outputToFilesystem: true
            })
        ],
        output: {
            file: 'index.js',
            format: 'es',
            name: 'core'
        }
    },
    {
        input: './src/directives/index.ts',
        external: [
            'vue',
            '@vueuse/core',
            'rxjs',
            'rxjs/operators',
            'dayjs',
            'dayjs/*',
            'lunisolar',
            'tyme4ts'
        ],
        plugins: [
            terser(),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: true,
                rootDir: 'src/directives',
                declarationDir: 'dist',
                outputToFilesystem: true
            })
        ],
        output: {
            file: 'directives.js',
            format: 'es',
            name: 'directives'
        }
    },
    {
        input: './src/hooks/index.ts',
        external: [
            'vue',
            '@vueuse/core',
            'rxjs',
            'rxjs/operators',
            'dayjs',
            'dayjs/*',
            'lunisolar',
            'tyme4ts'
        ],
        plugins: [
            terser(),
            typescript({
                tsconfig: './tsconfig.json',
                rootDir: 'src/hooks',
                declaration: true,
                declarationDir: 'dist',
                outputToFilesystem: true
            })
        ],
        output: {
            file: 'hooks.js',
            format: 'es',
            name: 'hooks'
        }
    },
    {
        input: './src/utils/index.ts',
        external: [
            'vue',
            '@vueuse/core',
            'rxjs',
            'rxjs/*',
            'dayjs',
            'dayjs/*',
            'lunisolar',
            'tyme4ts'
        ],
        plugins: [
            terser(),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: true,
                rootDir: 'src/utils',
                declarationDir: 'dist',
                outputToFilesystem: true
            })
        ],
        output: {
            file: 'utils.js',
            format: 'es',
            name: 'utils'
        }
    }
]);
//# sourceMappingURL=rollup.config.js.map