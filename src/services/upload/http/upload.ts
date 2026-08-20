/**
 * Upload API 端到端测试（Node fetch + TS）
 *
 * 流程：signin → prepare → chunk(s) → progress → finalize → download
 *
 * 用法：
 *   npx tsx src/services/upload/http/upload.ts
 *   npx tsx src/services/upload/http/upload.ts ./path/to/file.bin
 *
 * 环境变量：
 *   API_BASE     默认 http://127.0.0.1:3000
 *   USERNAME     默认 admin
 *   PASSWORD     默认 123456
 *   CHUNK_SIZE   默认 1048576（1MB，服务端下限）
 */

import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Buffer } from 'node:buffer'
import process from 'node:process'

/** 统一成功信封（与服务端 Exception/Envelope 对齐） */
type RSF<T> = {
  success: boolean
  code: number
  msg: string
  data: T
}

declare namespace Auth {
  namespace SignIn {
    export interface Params {
      username: string
      password: string
    }

    export interface Response {
      token: string
      id: string
      username: string
      createdAt: number
      updatedAt: number
    }
  }

  namespace SignUp {
    export interface Params {
      username: string
      password: string
    }

    export interface Response {
      token: string
      id: string
      username: string
      createdAt: number
      updatedAt: number
    }
  }
}

declare namespace Upload {
  namespace Prepare {
    export interface Params {
      name: string
      size: number
      hash: string
      mime: string
      chunk: number
    }

    export interface Response {
      id: string
      exists: boolean
      chunks: number[]
      url: string
    }
  }

  namespace Chunk {
    export interface Params {
      id: string
      index: number
      hash: string
      data: Buffer
    }

    export interface Response {
      success: boolean
      index: number
      message: string
    }
  }

  namespace Finalize {
    export interface Params {
      id: string
    }

    export interface Response {
      success: boolean
      url: string
      id: string
    }
  }

  namespace Progress {
    export interface Response {
      id: string
      progress: number
      chunks: number[]
      total: number
      status: string
    }
  }
}

type TokenContext = { token?: string }

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000'
const USERNAME = process.env.USERNAME ?? 'admin'
const PASSWORD = process.env.PASSWORD ?? '123456'
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 1024 * 1024)

/** 登录后写入，供需鉴权接口通过 context 携带 */
const AUTH_TOKEN: TokenContext = {}

const http = {
  async post<T>(path: string, data?: unknown, opts?: { context?: TokenContext; form?: FormData }) {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const token = opts?.context?.token
    if (token) headers.Authorization = `Bearer ${token}`

    let body: BodyInit | undefined
    if (opts?.form) {
      body = opts.form
    } else if (data !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(data)
    }

    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body })
    return (await res.json()) as T
  },

  async get<T>(path: string, opts?: { context?: TokenContext }) {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const token = opts?.context?.token
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${BASE}${path}`, { method: 'GET', headers })
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) {
      throw new Error(`期望 JSON，收到 ${ct || 'unknown'} (${res.status})`)
    }
    return (await res.json()) as T
  },

  async getBuffer(path: string, opts?: { context?: TokenContext }) {
    const headers: Record<string, string> = { Accept: 'application/octet-stream' }
    const token = opts?.context?.token
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${BASE}${path}`, { method: 'GET', headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`download failed ${res.status}: ${text}`)
    }
    return Buffer.from(await res.arrayBuffer())
  }
}

function POST_SIGNIN(data: Auth.SignIn.Params) {
  return http.post<RSF<Auth.SignIn.Response>>('/api/v1/auth/signin', data)
}

function POST_SIGNUP(data: Auth.SignUp.Params) {
  return http.post<RSF<Auth.SignUp.Response>>('/api/v1/auth/signup', data)
}

function POST_PREPARE(data: Upload.Prepare.Params) {
  return http.post<RSF<Upload.Prepare.Response>>('/api/v1/upload/prepare', data, {
    context: AUTH_TOKEN
  })
}

function POST_CHUNK(data: Upload.Chunk.Params) {
  const form = new FormData()
  form.append('id', data.id)
  form.append('index', String(data.index))
  form.append('hash', data.hash)
  form.append(
    'chunk',
    new Blob([data.data], { type: 'application/octet-stream' }),
    `chunk-${data.index}.part`
  )
  return http.post<RSF<Upload.Chunk.Response>>('/api/v1/upload/chunk', undefined, {
    context: AUTH_TOKEN,
    form
  })
}

function POST_FINALIZE(data: Upload.Finalize.Params) {
  return http.post<RSF<Upload.Finalize.Response>>('/api/v1/upload/finalize', data, {
    context: AUTH_TOKEN
  })
}

function GET_PROGRESS(id: string) {
  return http.get<RSF<Upload.Progress.Response>>(`/api/v1/upload/progress/${id}`, {
    context: AUTH_TOKEN
  })
}

function GET_FILES(pathOrUrl: string) {
  const path = pathOrUrl.startsWith('http') ? new URL(pathOrUrl).pathname : pathOrUrl
  return http.getBuffer(path, { context: AUTH_TOKEN })
}

function sha256Hex(buf: Uint8Array) {
  return createHash('sha256').update(buf).digest('hex')
}

function guessMime(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

/** 端到端固定步骤（分片循环在 step 3 内展开） */
const STEPS = ['signin', 'prepare', 'chunk', 'progress', 'finalize', 'download'] as const

type StepName = (typeof STEPS)[number]

function stepLabel(name: StepName, detail?: string) {
  const n = STEPS.indexOf(name) + 1
  const total = STEPS.length
  const suffix = detail ? ` ${detail}` : ''
  return `[${n}/${total}] ${name}${suffix}`
}

function logStep(name: StepName, detail?: string, extra?: unknown) {
  const label = stepLabel(name, detail)
  if (extra !== undefined) console.log(label, extra)
  else console.log(label)
}

function assertOk<T>(name: StepName, envelope: RSF<T>, detail?: string): T {
  const label = stepLabel(name, detail)
  if (!envelope || envelope.success !== true || envelope.code !== 200000) {
    console.error(`✗ ${label} 失败`, envelope)
    process.exit(1)
  }
  console.log(`✓ ${label}`, envelope.msg ?? '', envelope.data ?? '')
  return envelope.data
}

async function ensureToken() {
  logStep('signin', 'POST /auth/signin')
  let envelope = await POST_SIGNIN({ username: USERNAME, password: PASSWORD })
  if (envelope.success && envelope.code === 200000) {
    AUTH_TOKEN.token = envelope.data.token
    console.log(`✓ ${stepLabel('signin')}`, 'token acquired')
    return
  }

  console.log(`… ${stepLabel('signin')} 登录失败，改 signup`, envelope.msg ?? envelope)
  envelope = await POST_SIGNUP({ username: USERNAME, password: PASSWORD })
  if (envelope.success && envelope.code === 200000) {
    AUTH_TOKEN.token = envelope.data.token
    console.log(`✓ ${stepLabel('signin')}`, 'signup → token acquired')
    return
  }

  console.error(`✗ ${stepLabel('signin')} 无法获取 token`, envelope)
  process.exit(1)
}

function loadOrGenerateFile(argvPath?: string) {
  if (argvPath) {
    const filePath = resolve(argvPath)
    const buffer = readFileSync(filePath)
    return {
      name: basename(filePath),
      mime: guessMime(filePath),
      buffer
    }
  }

  const size = Math.floor(CHUNK_SIZE * 2.5)
  const buffer = randomBytes(size)
  return {
    name: `upload-test-${Date.now()}.bin`,
    mime: 'application/octet-stream',
    buffer
  }
}

function splitChunks(buffer: Buffer, chunkSize: number) {
  const chunks: Array<{ index: number; data: Buffer; hash: string }> = []
  for (let offset = 0, index = 0; offset < buffer.length; offset += chunkSize, index++) {
    const data = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length))
    chunks.push({ index, data, hash: sha256Hex(data) })
  }
  return chunks
}

async function main() {
  if (CHUNK_SIZE < 1024 * 1024 || CHUNK_SIZE > 10 * 1024 * 1024) {
    console.error('CHUNK_SIZE 须在 1MB~10MB')
    process.exit(1)
  }

  const { name, mime, buffer } = loadOrGenerateFile(process.argv[2])
  const fileHash = sha256Hex(buffer)
  const parts = splitChunks(buffer, CHUNK_SIZE)

  console.log('=== Upload test ===')
  console.log('步骤:', STEPS.map((s, i) => `${i + 1}.${s}`).join(' → '))
  console.log({
    base: BASE,
    user: USERNAME,
    name,
    mime,
    size: buffer.length,
    chunkSize: CHUNK_SIZE,
    totalChunks: parts.length,
    fileHash
  })

  await ensureToken()

  logStep('prepare', 'POST /upload/prepare')
  const prepare = assertOk(
    'prepare',
    await POST_PREPARE({
      name,
      size: buffer.length,
      hash: fileHash,
      mime,
      chunk: CHUNK_SIZE
    })
  )

  if (prepare.exists) {
    logStep('chunk', '秒传跳过', prepare)
  } else {
    const done = new Set(prepare.chunks ?? [])
    for (const part of parts) {
      const detail = `#${part.index + 1}/${parts.length}`
      if (done.has(part.index)) {
        console.log(`… ${stepLabel('chunk', detail)} 已上传，跳过`)
        continue
      }
      logStep('chunk', detail)
      assertOk(
        'chunk',
        await POST_CHUNK({
          id: prepare.id,
          index: part.index,
          hash: part.hash,
          data: part.data
        }),
        detail
      )
    }
  }

  logStep('progress', `GET /upload/progress/${prepare.id}`)
  const progress = assertOk('progress', await GET_PROGRESS(prepare.id))
  console.log(`✓ ${stepLabel('progress')} detail`, progress)

  if (!prepare.exists) {
    logStep('finalize', 'POST /upload/finalize')
    const finalized = assertOk('finalize', await POST_FINALIZE({ id: prepare.id }))

    logStep('download', finalized.url)
    const downloaded = await GET_FILES(finalized.url)
    const dlHash = sha256Hex(downloaded)
    if (dlHash !== fileHash || downloaded.length !== buffer.length) {
      console.error(`✗ ${stepLabel('download')} 校验失败`, {
        expect: fileHash,
        actual: dlHash,
        expectSize: buffer.length,
        actualSize: downloaded.length
      })
      process.exit(1)
    }
    console.log(`✓ ${stepLabel('download')} hash match`, {
      bytes: downloaded.length,
      url: finalized.url
    })
  } else {
    console.log(
      `… 秒传完成，跳过 [${STEPS.indexOf('finalize') + 1}–${STEPS.length}] finalize/download`
    )
  }

  console.log(`=== done（${STEPS.length}/${STEPS.length}）===`)
}

export {
  GET_FILES,
  GET_PROGRESS,
  POST_CHUNK,
  POST_FINALIZE,
  POST_PREPARE,
  POST_SIGNIN,
  POST_SIGNUP
}

const isDirect =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirect) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
