import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { VitePlugin } from '@electron-forge/plugin-vite'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { cpSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from './package.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const appVersion = pkg.version

const appName = 'i-thinking'
const appAuthors = pkg.author.name
const appDescription = pkg.description

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appVersion,
    name: appName,
    executableName: 'i-thinking'
    // 原生 .node 不能从 asar 内加载，必须解包
    // 打包后主进程 external 的 better-sqlite3 需在 app 目录存在（node-linker=hoisted 时 node_modules 为实体，此处作兜底复制）
    // afterCopy: [
    //   async (buildPath, _electronVersion, _platform, _arch, done) => {
    //     try {
    //       const src = path.join(__dirname, 'node_modules', 'better-sqlite3')
    //       if (existsSync(src)) {
    //         const realSrc = realpathSync(src)
    //         const dest = path.join(buildPath, 'node_modules', 'better-sqlite3')
    //         mkdirSync(path.dirname(dest), { recursive: true })
    //         cpSync(realSrc, dest, { recursive: true })
    //       }
    //     } finally {
    //       done()
    //     }
    //   }
    // ]
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
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}

export default config
