import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { VitePlugin } from '@electron-forge/plugin-vite'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { cpSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from './package.json' with { type: 'json' }

// 兼容 ESM/CJS：package 为 commonjs 时 Forge 可能以 CJS 加载配置
const __dirname =
  typeof import.meta !== 'undefined' && import.meta.url
    ? path.dirname(fileURLToPath(import.meta.url))
    : path.resolve(process.cwd())

const appVersion = pkg.version

const appName = 'i-thinking'
const appAuthors = pkg.author.name
const appDescription = pkg.description

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appVersion,
    // 只保留构建产物与运行时所需文件，排除源码、配置与开发期文件（兼容 Windows 路径）
    // ignore: (pathToCheck: string) => {
    //   const n = pathToCheck.replace(/\\/g, '/')
    //   const rootIgnore = [
    //     '/.vscode',
    //     '/.git',
    //     '/.turbo',
    //     '/src',
    //     '/dist',
    //     '/docs',
    //     '/nsis',
    //     '/prisma',
    //     '/public',
    //     '/.env',
    //     'chunks.log',
    //     'eslint.config.ts',
    //     'forge.config.ts',
    //     'index.html',
    //     'postcss.config.js',
    //     'prisma.config.ts',
    //     'README.md',
    //     'tailwind.config.mts',
    //     'tsconfig.app.json',
    //     'tsconfig.node.json',
    //     'tsconfig.json',
    //     'vite.main.config.ts',
    //     'vite.preload.config.ts',
    //     'vite.renderer.config.ts'
    //   ]
    //   return rootIgnore.some(
    //     (p) => n === p || n === p + '/' || n.startsWith(p + '/')
    //   )
    // },
    name: appName,
    executableName: 'i-thinking',
    extraResource: [
      path.join(__dirname, '..', 'service', 'dist'),
      path.join(__dirname, '..', 'service', 'node_modules'),
      path.join(__dirname, 'src', 'bin')
    ],
    // 打包后主进程 external 的 better-sqlite3 需在 app 目录存在（pnpm 下 node_modules 可能为链接，此处复制实体）
    afterCopy: [
      (
        buildPath: string,
        _electronVersion: string,
        _platform: string,
        _arch: string,
        done: () => void
      ) => {
        const candidates = [
          path.join(__dirname, 'node_modules', 'better-sqlite3'),
          path.join(__dirname, '..', '..', 'node_modules', 'better-sqlite3')
        ]
        let src: string | null = null
        for (const p of candidates) {
          if (existsSync(p)) {
            src = realpathSync(p)
            break
          }
        }
        if (src) {
          const dest = path.join(buildPath, 'node_modules', 'better-sqlite3')
          mkdirSync(path.dirname(dest), { recursive: true })
          cpSync(src, dest, { recursive: true })
        }
        done()
      }
    ]
  },
  rebuildConfig: {},
  makers: [
    // name 用于 NuGet/安装路径，不能含 / 等；description 为 nuspec 必填
    new MakerSquirrel({
      title: appName,
      name: appName,
      description: appDescription,
      authors: appAuthors
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({})
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: true,
      [FuseV1Options.EnableNodeCliInspectArguments]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}

export default config
