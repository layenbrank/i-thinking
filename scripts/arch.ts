/**
 * 仓库架构卫生检查：孤儿文件、模块必备文件、禁止路径。
 *
 * 用法: bun run arch
 * 退出码 0 = 通过；非 0 = 违规列表。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const LIB = join(SRC, 'lib.rs')

const STANDARD_SERVICES = ['auth', 'user', 'engine', 'application', 'markdown'] as const

const COMPLEX_SERVICES: Record<string, { extra: Set<string> }> = {
  upload: {
    extra: new Set(['error.rs', 'multipart.rs', 'repository.rs', 'storage.rs', 'validation.rs'])
  },
  search: { extra: new Set(['repository.rs']) }
}

const FORBIDDEN_FILES = [
  join(SRC, 'utils', 'http.rs'),
  join(SRC, 'utils', 'response.rs'),
  join(SRC, 'middlewares', 'jwt.rs'),
  join(SRC, 'middlewares', 'response.rs'),
  join(SRC, 'services', 'shared')
]

const REQUIRED_SERVICE_FILES = [
  'controller.rs',
  'module.rs',
  'schema.rs',
  'service.rs',
  'README.md'
] as const

function fail(msg: string, errors: string[]) {
  errors.push(msg)
}

function parseLibUtilsMods(libText: string): Set<string> {
  const m = libText.match(/pub mod utils \{([^}]+)\}/s)
  if (!m) return new Set()
  const names = [...m[1].matchAll(/pub mod (\w+);/g)].map((x) => x[1])
  return new Set(names)
}

function checkForbidden(errors: string[]) {
  for (const path of FORBIDDEN_FILES) {
    if (existsSync(path)) {
      fail(`禁止存在的路径仍在仓库: ${relative(ROOT, path)}`, errors)
    }
  }
}

function checkUtilsOrphans(errors: string[]) {
  const libText = readFileSync(LIB, 'utf8')
  const declared = parseLibUtilsMods(libText)
  const utilsDir = join(SRC, 'utils')
  if (!existsSync(utilsDir) || !statSync(utilsDir).isDirectory()) return
  for (const name of readdirSync(utilsDir)) {
    if (!name.endsWith('.rs')) continue
    const stem = name.slice(0, -3)
    if (!declared.has(stem)) {
      fail(`utils 孤儿文件未在 lib.rs 声明: utils/${name}`, errors)
    }
  }
}

function checkServices(errors: string[]) {
  const services = join(SRC, 'services')
  const names = [...STANDARD_SERVICES, ...Object.keys(COMPLEX_SERVICES)]
  for (const name of names) {
    const dirPath = join(services, name)
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
      fail(`缺少服务模块目录: services/${name}`, errors)
      continue
    }
    for (const req of REQUIRED_SERVICE_FILES) {
      if (!existsSync(join(dirPath, req))) {
        fail(`services/${name} 缺少必备文件: ${req}`, errors)
      }
    }

    const allowed = new Set<string>(REQUIRED_SERVICE_FILES)
    if (name in COMPLEX_SERVICES) {
      for (const e of COMPLEX_SERVICES[name].extra) allowed.add(e)
    }

    for (const entry of readdirSync(dirPath)) {
      const full = join(dirPath, entry)
      if (entry === 'http' && statSync(full).isDirectory()) continue
      if (!statSync(full).isFile()) continue
      if (entry.endsWith('.rs') && !allowed.has(entry)) {
        if ((STANDARD_SERVICES as readonly string[]).includes(name)) {
          fail(`services/${name} 出现非标准文件 ${entry}（标准模块仅四文件）`, errors)
        }
        if (name in COMPLEX_SERVICES) {
          fail(`services/${name} 未登记的额外文件: ${entry}（请更新 scripts/arch.ts）`, errors)
        }
      }
    }
  }
}

function checkCrossCutting(errors: string[]) {
  const requiredDirs: Record<string, readonly string[]> = {
    middlewares: ['access_log', 'cors'],
    guards: ['auth', 'blacklist', 'permission', 'public'],
    filters: ['exception'],
    interceptors: ['envelope']
  }
  for (const [dirname, mods] of Object.entries(requiredDirs)) {
    const base = join(SRC, dirname)
    for (const mod of mods) {
      const fileRs = join(base, `${mod}.rs`)
      if (!existsSync(fileRs)) {
        fail(`缺少横切模块: ${dirname}/${mod}.rs（勿仅用 ${mod}/mod.rs）`, errors)
      }
    }
  }
}

function main(): number {
  const errors: string[] = []
  if (!existsSync(LIB)) {
    console.error('ERROR: src/lib.rs 不存在')
    return 2
  }

  checkForbidden(errors)
  checkUtilsOrphans(errors)
  checkServices(errors)
  checkCrossCutting(errors)

  if (errors.length) {
    console.log('Architecture check FAILED:')
    for (const e of errors) console.log(`  - ${e}`)
    return 1
  }

  console.log('Architecture check passed.')
  return 0
}

process.exit(main())
