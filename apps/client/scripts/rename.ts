import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const applications = resolve(__dirname, '..', 'src/components/applications')

const modules = await readdir(applications)

for (const module of modules) {
  console.log('module', module)
  const application = resolve(applications, module)
  const files = await readdir(application)

  for (const file of files) {
    console.log(' - file', file)
    if (file.startsWith('index')) {
      const oldPath = resolve(application, file)
      const newPath = oldPath.replace('index', module)
      console.log(`   -> Renaming ${oldPath} to ${newPath}`)
      await import('node:fs/promises').then((fs) => fs.rename(oldPath, newPath))
    }
  }
}
