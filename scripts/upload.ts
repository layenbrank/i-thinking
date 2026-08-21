/**
 * Upload API 端到端测试（支持大文件流式读盘，避免 Node Buffer 2GiB 上限）
 *
 * 流程：signin → prepare(无 hash) →（流式算整文件 hash，完成即 PATCH）
 *       → 未秒传则按分片读盘上传 + progress 轮询 → finalize → 列表 → 流式校验下载
 *
 * 用法（必须指定已存在的本地文件）：
 *   pnpm run upload -- ./path/to/file.bin
 *   pnpm run upload -- "E:\\system\\ubuntu.iso"
 *
 * 环境变量（来自仓库根目录 `.env`）：
 *   HOST / PORT           拼成 API 根地址，默认 http://127.0.0.1:3000
 *   UPLOAD_USERNAME       默认 admin（勿用 USERNAME：Windows 会注入本机用户名）
 *   UPLOAD_PASSWORD       默认 123456
 *   CHUNK_SIZE            默认 10485760（10MB；须在服务端 10MB~100MB）
 *   PROGRESS_INTERVAL_MS  默认 500
 */

import { createHash } from 'node:crypto'
import { createReadStream, existsSync, openSync, readSync, closeSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Buffer } from 'node:buffer'
import process from 'node:process'

import { POST_SIGNIN, POST_SIGNUP } from '@/apis/auth.ts'
import {
  GET_FILES,
  GET_PROGRESS,
  PATCH_HASH,
  POST_CHUNK,
  POST_FINALIZE,
  POST_PREPARE
} from '@/apis/upload.ts'
import { BASE_URL, http } from '@/utils/http.ts'
import { authToken } from '@/utils/auth.ts'
import { HttpException } from '@/utils/http.errors.ts'

/** 与 src/services/upload/validation.rs 对齐 */
const MIN_CHUNK_SIZE = 1024 * 1024 * 10
const MAX_CHUNK_SIZE = 1024 * 1024 * 100

const USERNAME = process.env.UPLOAD_USERNAME ?? 'admin'
const PASSWORD = process.env.UPLOAD_PASSWORD ?? '123456'
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? MIN_CHUNK_SIZE)
const PROGRESS_INTERVAL_MS = Number(process.env.PROGRESS_INTERVAL_MS ?? 500)

type SourceFile = {
  name: string
  mime: string
  size: number
  path: string
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
  if (lower.endsWith('.iso')) return 'application/x-iso9660-image'
  return 'application/octet-stream'
}

function logStep(step: string, detail?: string) {
  console.log(`→ ${step}${detail ? ` ${detail}` : ''}`)
}

async function step<T>(name: string, task: Promise<T>, detail = ''): Promise<T> {
  const tag = detail ? `${name} ${detail}` : name
  try {
    const data = await task
    console.log(`✓ ${tag}`)
    return data
  } catch (err) {
    console.error(
      `✗ ${tag}`,
      err instanceof HttpException ? { code: err.code, msg: err.message } : err
    )
    process.exit(1)
  }
}

async function ensureToken() {
  logStep('signin', 'POST /auth/signin')
  try {
    const data = await POST_SIGNIN({ username: USERNAME, password: PASSWORD })
    authToken.toUpdate(data.token)
    console.log(`✓ signin`)
    return
  } catch {
    // fall through to signup
  }

  logStep('signup', 'POST /auth/signup（signin 失败则注册）')
  try {
    const data = await POST_SIGNUP({ username: USERNAME, password: PASSWORD })
    authToken.toUpdate(data.token)
    console.log(`✓ signup`)
  } catch (err) {
    console.error('✗ 无法获取 token', err)
    process.exit(1)
  }
}

/** 必须提供存在的本地文件；否则直接退出，不发任何请求 */
function loadFile(argvPath?: string): SourceFile {
  if (!argvPath) {
    console.error('✗ 请指定要上传的文件路径，例如: pnpm run upload -- ./file.bin')
    process.exit(1)
  }
  const filePath = resolve(argvPath)
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    console.error(`✗ 文件不存在或不是普通文件: ${filePath}`)
    process.exit(1)
  }
  const size = statSync(filePath).size
  if (size <= 0) {
    console.error(`✗ 文件大小为 0: ${filePath}`)
    process.exit(1)
  }
  return {
    name: basename(filePath),
    mime: guessMime(filePath),
    size,
    path: filePath
  }
}

function totalChunks(size: number, chunkSize: number) {
  return Math.ceil(size / chunkSize)
}

/** 按分片读盘，单片不超过 CHUNK_SIZE，不整文件进 Buffer */
function readChunkAt(source: SourceFile, index: number): Buffer {
  const offset = index * CHUNK_SIZE
  const length = Math.min(CHUNK_SIZE, source.size - offset)
  if (length <= 0) {
    throw new Error(`无效分片 index=${index}`)
  }
  const fd = openSync(source.path, 'r')
  try {
    const buf = Buffer.allocUnsafe(length)
    const read = readSync(fd, buf, 0, length, offset)
    if (read !== length) {
      throw new Error(`读取分片不完整: index=${index} expect=${length} got=${read}`)
    }
    return buf
  } finally {
    closeSync(fd)
  }
}

function hashSourceAsync(source: SourceFile): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(source.path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })
}

/** 流式下载并算 hash，不把整文件装进 Buffer */
async function hashRemoteAsset(pathOrUrl: string): Promise<{ hash: string; size: number }> {
  const path = pathOrUrl.startsWith('http') ? new URL(pathOrUrl).pathname : pathOrUrl
  const relative = path.replace(/^\//, '')
  const res = await http.get(relative)
  const body = res.body
  if (!body) {
    throw new Error('下载响应无 body')
  }
  const hash = createHash('sha256')
  let size = 0
  for await (const chunk of body) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    hash.update(buf)
    size += buf.length
  }
  return { hash: hash.digest('hex'), size }
}

/** 仅匹配服务端 discard 后的明确文案；勿用「不存在」——会误伤「分片在 CAS 中不存在」 */
function isSessionGone(err: unknown): boolean {
  if (!(err instanceof HttpException)) return false
  const msg = err.message
  return (
    msg.includes('上传会话不存在或已结束') ||
    msg === '资源不存在'
  )
}

async function uploadParts(
  uploadId: string,
  source: SourceFile,
  done: Map<number, string>,
  preferReuseOnly: boolean,
  signal: AbortSignal
) {
  const total = totalChunks(source.size, CHUNK_SIZE)
  let reused = 0
  let uploaded = 0
  for (let index = 0; index < total; index++) {
    if (signal.aborted) {
      console.log('… chunk 上传已中止（文件秒传或取消）')
      break
    }
    const data = readChunkAt(source, index)
    const hash = sha256Hex(data)
    const known = done.get(index)
    if (known === hash) {
      console.log(`… chunk #${index + 1}/${total} 已上传且 hash 一致，跳过`)
      continue
    }
    logStep('chunk', `#${index + 1}/${total}`)
    // hash 不一致时必须带字节；勿因 done 里有旧 hash 就改走「仅 hash」秒传
    const body: Upload.Chunk.Params = preferReuseOnly
      ? { id: uploadId, index, hash }
      : { id: uploadId, index, hash, data }
    try {
      const res = await POST_CHUNK(body)
      if (signal.aborted) {
        console.log('… chunk 上传已中止（文件秒传或取消）')
        break
      }
      console.log(`✓ chunk #${index}`)
      if (res.reused) reused++
      else uploaded++
      done.set(index, hash)
    } catch (err) {
      // 仅在客户端已因 exists 秒传 abort 后，在途请求的会话结束才算正常
      if (signal.aborted && isSessionGone(err)) {
        console.log('… chunk 上传已中止（文件秒传，会话已 discard）')
        break
      }
      if (signal.aborted) {
        console.log('… chunk 上传已中止（文件秒传或取消）')
        break
      }
      console.error(
        `✗ chunk #${index}`,
        err instanceof HttpException ? { code: err.code, msg: err.message } : err
      )
      process.exit(1)
    }
  }
  return { reused, uploaded }
}

function watchProgress(uploadId: string, signal: AbortSignal): { stop: () => void } {
  let lastKey = ''
  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight = false

  const tick = async () => {
    if (signal.aborted || inFlight) return
    inFlight = true
    try {
      const p = await GET_PROGRESS(uploadId)
      const key = `${p.progress}|${p.uploaded.length}|${p.total}|${p.status}`
      if (key !== lastKey) {
        lastKey = key
        console.log(`↻ progress`, {
          progress: p.progress,
          uploaded: p.uploaded.length,
          total: p.total,
          status: p.status
        })
      }
    } catch (err) {
      if (signal.aborted || isSessionGone(err)) {
        // 秒传 discard 后 progress 404 / 会话结束属预期
        return
      }
      console.warn('↻ progress poll failed', err instanceof Error ? err.message : err)
    } finally {
      inFlight = false
    }
  }

  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  signal.addEventListener('abort', stop, { once: true })
  void tick()
  timer = setInterval(() => void tick(), PROGRESS_INTERVAL_MS)
  return { stop }
}

async function runOnce(label: string, source: SourceFile, preferChunkReuse: boolean) {
  console.log(`\n=== ${label} ===`)

  const hashPromise = hashSourceAsync(source)

  logStep('prepare', 'POST /upload/prepare（无整文件 hash）')
  const prepared = await step(
    'prepare',
    POST_PREPARE({
      name: source.name,
      size: source.size,
      mime: source.mime,
      chunk: CHUNK_SIZE
    })
  )

  if (prepared.exists) {
    console.log('… 文件秒传（prepare.exists）', prepared.id)
    return prepared
  }

  let uploadId = prepared.id
  const done = new Map(prepared.uploaded?.map((u) => [u.index, u.hash]) ?? [])
  const abort = new AbortController()
  const progressWatch = watchProgress(uploadId, abort.signal)

  let fileHash = ''
  let instantComplete = false

  try {
    // hash 与分片并行：算完立刻 PATCH；秒传则 abort，在途 chunk 按「会话已结束」软退出
    const bindHashTask = (async () => {
      fileHash = await hashPromise
      logStep('hash', 'PATCH /upload/hash（算完即绑，与分片并行）')
      const bound = await step('hash', PATCH_HASH({ id: uploadId, hash: fileHash }))
      if (bound.exists) {
        console.log('… 文件秒传（bindHash.exists），停止分片', bound.id)
        instantComplete = true
        abort.abort()
        uploadId = bound.id
        return
      }
      uploadId = bound.id
      for (const u of bound.uploaded ?? []) {
        done.set(u.index, u.hash)
      }
    })()

    const chunksTask = uploadParts(uploadId, source, done, preferChunkReuse, abort.signal)

    await Promise.all([bindHashTask, chunksTask])
  } finally {
    progressWatch.stop()
    if (!abort.signal.aborted) abort.abort()
  }

  if (instantComplete) {
    return { ...prepared, id: uploadId, exists: true }
  }

  logStep('progress', `GET /upload/progress/${uploadId}（终态）`)
  const prog = await step('progress', GET_PROGRESS(uploadId))
  console.log(`✓ progress detail`, {
    progress: prog.progress,
    uploaded: prog.uploaded.length,
    total: prog.total
  })

  logStep('finalize', 'POST /upload/finalize（不合并落盘）')
  const finalized = await step('finalize', POST_FINALIZE({ id: uploadId }))

  logStep('list', 'GET /upload/files')
  const listed = await step('list', GET_FILES(1, 20))
  const hit = listed.items.find((item) => item.id === finalized.id)
  if (!hit) {
    console.error('✗ list 未包含刚完成的资产', { id: finalized.id, count: listed.count })
    process.exit(1)
  }
  console.log(`✓ list hit`, { id: hit.id, url: hit.url })

  logStep('download', '流式下载并校验 hash ' + finalized.url)
  const downloaded = await hashRemoteAsset(finalized.url)
  if (downloaded.hash !== fileHash || downloaded.size !== source.size) {
    console.error('✗ download hash/size mismatch', {
      expect: fileHash,
      got: downloaded.hash,
      expectSize: source.size,
      gotSize: downloaded.size
    })
    process.exit(1)
  }
  console.log(`✓ download hash match`, { size: downloaded.size, url: finalized.url })
  return { ...prepared, id: uploadId, exists: false }
}

async function main() {
  if (CHUNK_SIZE < MIN_CHUNK_SIZE || CHUNK_SIZE > MAX_CHUNK_SIZE) {
    console.error(
      `CHUNK_SIZE 须在 ${MIN_CHUNK_SIZE / (1024 * 1024)}MB~${MAX_CHUNK_SIZE / (1024 * 1024)}MB（与 validation.rs 一致）`
    )
    process.exit(1)
  }

  const argvPath = process.argv.slice(2).find((a) => a !== '--')
  const source = loadFile(argvPath)

  console.log('=== Upload test ===')
  console.log({
    base: BASE_URL,
    user: USERNAME,
    name: source.name,
    mime: source.mime,
    size: source.size,
    path: source.path,
    chunkSize: CHUNK_SIZE,
    totalChunks: totalChunks(source.size, CHUNK_SIZE),
    progressIntervalMs: PROGRESS_INTERVAL_MS,
    mode: 'stream-from-disk'
  })

  await ensureToken()

  await runOnce('首传（写入 CAS）', source, false)
  await runOnce('再传（分片/文件秒传）', { ...source, name: `copy-${source.name}` }, true)

  console.log('\n全部通过')
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirect) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
