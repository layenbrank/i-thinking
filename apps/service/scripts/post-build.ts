import {
  access,
  constants,
  copyFile,
  mkdir,
  readFile,
  writeFile
} from 'node:fs'
import { resolve } from 'node:path'

readFile(
  resolve(__dirname, '..', 'package.json'),
  {
    encoding: 'utf-8'
  },
  function (error, data) {
    if (error) return console.error(`Read failed: ${error}`)
    const parsed = JSON.parse(data)

    console.log('Read succeeded! Package: ', parsed.name)

    const packageJson = {
      scripts: {
        preview: parsed.scripts.preview.replace('dist/', '')
      },
      dependencies: parsed.dependencies
    }

    const distDir = resolve(__dirname, '..', 'dist')

    mkdir(distDir, { recursive: true }, function (mkdirError) {
      if (mkdirError) console.error(`Mkdir failed: ${mkdirError}`)
    })

    // 创建文件

    writeFile(
      resolve(distDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      function (error) {
        if (error) console.error(`Write failed: ${error}`)
        else console.log('Write succeeded!')
      }
    )

    const envSource = resolve(__dirname, '..', '.env.production')
    const envTarget = resolve(distDir, '.env.production')

    access(envSource, constants.F_OK, function (accessError) {
      if (accessError)
        return console.warn('Skip copy: .env.production not found')
      copyFile(envSource, envTarget, function (error) {
        if (error) console.error(`Copy failed: ${error}`)
        else console.log('Copy succeeded!')
      })
    })
  }
)
