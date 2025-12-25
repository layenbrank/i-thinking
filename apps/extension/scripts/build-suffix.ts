// import { readdir} from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import Stringify from '../dist/manifest.json' assert { type: 'json' }

export interface Manifest {
  name: string
  version: string
  incognito: string
  manifest_version: number
  host_permissions: string[]
  description: string
  permissions: string[]
  background: Background
  chrome_url_overrides: Overrides
  externally_connectable: Externally
  web_accessible_resources: Resource[]
}
export interface Background {
  service_worker: string
  content_scripts: Script[]
}

export interface Script {
  matches: string[]
  js: string[]
}

export interface Overrides {
  newtab: string
}

export interface Externally {
  matches: string[]
}

export interface Resource {
  matches: string[]
  resources: string[]
}

const dist = resolve(__dirname, '..', 'dist')

const manifest: Manifest = Stringify

function service(file: string) {
  console.log('manifest service', file)
  manifest.background.service_worker = basename(file)
}

function content(file: string) {
  console.log('manifest content', file)

  manifest.background.content_scripts = []

  manifest.background.content_scripts.push({
    matches: ['<all_urls>'],
    js: [file]
  })
}

const handlers: Record<string, (file: string) => void> = {
  'service-worker': service,
  'content-scripts': content
}

const libs = Object.keys(handlers)

async function runner() {
  const files = await readdir(dist, {
    encoding: 'utf-8',
    recursive: true
  })

  for (const file of files) {
    if (!libs.some((lib) => file.includes(lib))) continue

    // service-worker-2TKqLCms.js -> service-worker.js
    // content-scripts-l0sNRNKZ.js -> content-scripts.js

    const filename = basename(file, '.js')
    const replaced = filename.replace(/-([a-zA-Z0-9]{8,})$/, '')
    const handler = handlers[replaced]
    handler?.(file)
    // console.log('filename', filename, '\nhandler', handler)

    // manifest 对象排序
    // manifest = Object.fromEntries(Object.entries(manifest).sort()) as Manifest

    void writeFile(resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2), {
      encoding: 'utf-8'
    })
  }
}

void runner()
