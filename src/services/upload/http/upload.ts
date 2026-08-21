/**
 * Upload API 端到端测试（Node fetch + TS）
 *
 * 流程：signin → prepare(无 hash) → chunk(s) → PATCH hash → progress → finalize → 列表 → asset 下载
 * 演示：先开会话再算/传 hash；分片 CAS 秒传（第二轮 reused）；断点跳过。
 *
 * 用法：
 *   npx tsx src/services/upload/http/upload.ts
 *   npx tsx src/services/upload/http/upload.ts ./path/to/file.bin
 *
 * 环境变量：
 *   API_BASE          默认 http://127.0.0.1:3000
 *   UPLOAD_USERNAME   默认 admin（勿用 USERNAME：Windows 会注入本机用户名）
 *   UPLOAD_PASSWORD   默认 123456
 *   CHUNK_SIZE        默认 10485760（10MB，服务端上限）
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
  namespace UploadedChunk {
    export interface Item {
      index: number
      hash: string
    }
  }

  namespace Prepare {
    export interface Params {
      name: string
      size: number
      hash?: string
      mime: string
      chunk: number
    }

    export interface Response {
      id: string
      exists: boolean
      chunks: number[]
      uploaded: UploadedChunk.Item[]
      url: string
    }
  }

  namespace Hash {
    export interface Params {
      id: string
      hash: string
    }

    export interface Response {
      id: string
      exists: boolean
      chunks: number[]
      uploaded: UploadedChunk.Item[]
    }
  }

  namespace Chunk {
    export interface Params {
      id: string
      index: number
      hash: string
      data?: Buffer
    }

    export interface Response {
      success: boolean
      index: number
      reused: boolean
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
      uploaded: UploadedChunk.Item[]
      total: number
      status: string
    }
  }

  namespace Files {
    export interface Asset {
      id: string
      name: string
      size: number
      mime: string
      hash: string
      status: string
      createdAt: number
      url: string
    }

    export interface Response {
      items: Asset[]
      count: number
      page: number
      size: number
      total: number
      next: boolean
      prev: boolean
    }
  }
}

type TokenContext = { token?: string }

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000'
// Windows 会预设 USERNAME=本机账户，不能当登录名；统一用 UPLOAD_*。
const USERNAME = process.env.UPLOAD_USERNAME ?? 'admin'
const PASSWORD = process.env.UPLOAD_PASSWORD ?? '123456'
// 10MB
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 1024 * 1024 * 10)

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

  async patch<T>(path: string, data: unknown, opts?: { context?: TokenContext }) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
    const token = opts?.context?.token
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    })
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

function PATCH_HASH(data: Upload.Hash.Params) {
  return http.patch<RSF<Upload.Hash.Response>>('/api/v1/upload/hash', data, {
    context: AUTH_TOKEN
  })
}

function POST_CHUNK(data: Upload.Chunk.Params) {
  const form = new FormData()
  form.append('id', data.id)
  form.append('index', String(data.index))
  form.append('hash', data.hash)
  if (data.data && data.data.length > 0) {
    form.append(
      'chunk',
      new Blob([data.data], { type: 'application/octet-stream' }),
      `chunk-${data.index}.part`
    )
  }
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

function GET_FILE_LIST(page = 1, size = 20) {
  return http.get<RSF<Upload.Files.Response>>(
    `/api/v1/upload/files?page=${page}&size=${size}`,
    { context: AUTH_TOKEN }
  )
}

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex')
}

function guessMime(filePath: string) {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

function assertOk<T>(step: string, envelope: RSF<T>, detail = ''): T {
  const tag = detail ? `${step} ${detail}` : step
  if (!envelope.success) {
    console.error(`✗ ${tag}`, envelope)
    process.exit(1)
  }
  console.log(`✓ ${tag}`, envelope.msg)
  return envelope.data
}

function logStep(step: string, detail?: string) {
  console.log(`→ ${step}${detail ? ` ${detail}` : ''}`)
}

async function ensureToken() {
  logStep('signin', 'POST /auth/signin')
  let envelope = await POST_SIGNIN({ username: USERNAME, password: PASSWORD })
  if (envelope.success && envelope.data?.token) {
    AUTH_TOKEN.token = envelope.data.token
    console.log(`✓ signin`, envelope.msg)
    return
  }

  logStep('signup', 'POST /auth/signup（signin 失败则注册）')
  envelope = await POST_SIGNUP({ username: USERNAME, password: PASSWORD })
  if (envelope.success && envelope.data?.token) {
    AUTH_TOKEN.token = envelope.data.token
    console.log(`✓ signup`, envelope.msg)
    return
  }

  console.error('✗ 无法获取 token', envelope)
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

async function uploadParts(
  uploadId: string,
  parts: Array<{ index: number; data: Buffer; hash: string }>,
  done: Map<number, string>,
  preferReuseOnly: boolean
) {
  let reused = 0
  let uploaded = 0
  for (const part of parts) {
    const known = done.get(part.index)
    if (known === part.hash) {
      console.log(`… chunk #${part.index + 1}/${parts.length} 已上传且 hash 一致，跳过`)
      continue
    }
    logStep('chunk', `#${part.index + 1}/${parts.length}`)
    const body =
      preferReuseOnly || done.has(part.index)
        ? { id: uploadId, index: part.index, hash: part.hash }
        : { id: uploadId, index: part.index, hash: part.hash, data: part.data }
    const res = assertOk('chunk', await POST_CHUNK(body), `#${part.index}`)
    if (res.reused) reused++
    else uploaded++
    done.set(part.index, part.hash)
  }
  return { reused, uploaded }
}

async function runOnce(
  label: string,
  name: string,
  mime: string,
  buffer: Buffer,
  parts: Array<{ index: number; data: Buffer; hash: string }>,
  fileHash: string,
  preferChunkReuse: boolean
) {
  console.log(`\n=== ${label} ===`)

  logStep('prepare', 'POST /upload/prepare（无整文件 hash）')
  let prepare = assertOk(
    'prepare',
    await POST_PREPARE({
      name,
      size: buffer.length,
      mime,
      chunk: CHUNK_SIZE
    })
  )

  if (prepare.exists) {
    console.log('… 文件秒传（prepare.exists）', prepare.id)
    return prepare
  }

  const done = new Map(prepare.uploaded?.map((u) => [u.index, u.hash]) ?? [])
  await uploadParts(prepare.id, parts, done, preferChunkReuse)

  logStep('hash', 'PATCH /upload/hash')
  const bound = assertOk(
    'hash',
    await PATCH_HASH({
      id: prepare.id,
      hash: fileHash
    })
  )
  if (bound.exists) {
    console.log('… 文件秒传（bindHash.exists）', bound.id)
    return { ...prepare, id: bound.id, exists: true }
  }
  prepare = { ...prepare, id: bound.id, uploaded: bound.uploaded, chunks: bound.chunks }

  logStep('progress', `GET /upload/progress/${prepare.id}`)
  const progress = assertOk('progress', await GET_PROGRESS(prepare.id))
  console.log(`✓ progress detail`, {
    progress: progress.progress,
    uploaded: progress.uploaded.length,
    total: progress.total
  })

  logStep('finalize', 'POST /upload/finalize（不合并落盘）')
  const finalized = assertOk('finalize', await POST_FINALIZE({ id: prepare.id }))

  logStep('list', 'GET /upload/files')
  const listed = assertOk('list', await GET_FILE_LIST(1, 20))
  const hit = listed.items.find((item) => item.id === finalized.id)
  if (!hit) {
    console.error('✗ list 未包含刚完成的资产', { id: finalized.id, count: listed.count })
    process.exit(1)
  }
  console.log(`✓ list hit`, { id: hit.id, url: hit.url })

  logStep('download', '按 asset id 流式下载 ' + finalized.url)
  const downloaded = await GET_FILES(finalized.url)
  const downloadedHash = sha256Hex(downloaded)
  if (downloadedHash !== fileHash || downloaded.length !== buffer.length) {
    console.error('✗ download hash/size mismatch', {
      expect: fileHash,
      got: downloadedHash,
      expectSize: buffer.length,
      gotSize: downloaded.length
    })
    process.exit(1)
  }
  console.log(`✓ download hash match`, { size: downloaded.length, url: finalized.url })
  return { ...prepare, exists: false }
}

async function main() {
  if (CHUNK_SIZE < 1024 * 1024 || CHUNK_SIZE > 10 * 1024 * 1024) {
    console.error('CHUNK_SIZE 须在 1MB~10MB')
    process.exit(1)
  }

  const { name, mime, buffer } = loadOrGenerateFile(process.argv[2])
  // 模拟「先 prepare 再算 hash」：先开会话，再在本地算
  const parts = splitChunks(buffer, CHUNK_SIZE)
  const fileHash = sha256Hex(buffer)

  console.log('=== Upload test ===')
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

  await runOnce('首传（写入 CAS）', name, mime, buffer, parts, fileHash, false)
  // 同内容再传：prepare 无 hash → 分片应全部 reused；bind 后文件秒传或 finalize
  await runOnce('再传（分片/文件秒传）', `copy-${name}`, mime, buffer, parts, fileHash, true)

  console.log('\n全部通过')
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirect) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
