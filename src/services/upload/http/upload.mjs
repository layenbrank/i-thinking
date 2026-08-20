#!/usr/bin/env node
/**
 * Upload API 端到端测试（Node.js fetch）
 *
 * 流程：signin → prepare → chunk(s) → progress → finalize → download
 *
 * 用法：
 *   node src/services/upload/http/upload.mjs
 *   node src/services/upload/http/upload.mjs ./path/to/file.bin
 *
 * 环境变量：
 *   API_BASE     默认 http://127.0.0.1:3000
 *   USERNAME     默认 admin
 *   PASSWORD     默认 123456
 *   CHUNK_SIZE   默认 1048576（1MB，服务端下限）
 */

import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000'
const USERNAME = process.env.USERNAME ?? 'admin'
const PASSWORD = process.env.PASSWORD ?? '123456'
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 1024 * 1024)

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function guessMime(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

async function api(method, path, { token, json, form } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body })
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    const raw = await res.arrayBuffer()
    return { httpStatus: res.status, headers: res.headers, raw }
  }
  const envelope = await res.json()
  return { httpStatus: res.status, envelope }
}

function assertOk(step, envelope) {
  if (!envelope || envelope.success !== true || envelope.code !== 200000) {
    console.error(`✗ ${step} 失败`, envelope)
    process.exit(1)
  }
  console.log(`✓ ${step}`, envelope.msg ?? '', envelope.data ?? '')
  return envelope.data
}

async function ensureToken() {
  let r = await api('POST', '/api/v1/auth/signin', {
    json: { username: USERNAME, password: PASSWORD }
  })
  if (r.envelope?.success && r.envelope?.code === 200000) {
    return r.envelope.data.token
  }

  console.log('登录失败，尝试注册…', r.envelope?.msg ?? r.envelope)
  r = await api('POST', '/api/v1/auth/signup', {
    json: { username: USERNAME, password: PASSWORD }
  })
  if (r.envelope?.success && r.envelope?.code === 200000) {
    return r.envelope.data.token
  }

  console.error('无法获取 token', r.envelope)
  process.exit(1)
}

function loadOrGenerateFile(argvPath) {
  if (argvPath) {
    const filePath = resolve(argvPath)
    const buffer = readFileSync(filePath)
    return {
      name: basename(filePath),
      mime: guessMime(filePath),
      buffer
    }
  }

  // 默认生成 ~2.5MB，便于测多分片（chunk=1MB → 3 片）
  const size = Math.floor(CHUNK_SIZE * 2.5)
  const buffer = randomBytes(size)
  return {
    name: `upload-test-${Date.now()}.bin`,
    mime: 'application/octet-stream',
    buffer
  }
}

function splitChunks(buffer, chunkSize) {
  const chunks = []
  for (let offset = 0, index = 0; offset < buffer.length; offset += chunkSize, index++) {
    const slice = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length))
    chunks.push({
      index,
      data: slice,
      hash: sha256Hex(slice)
    })
  }
  return chunks
}

async function uploadChunk(token, id, chunk) {
  const form = new FormData()
  form.append('id', id)
  form.append('index', String(chunk.index))
  form.append('hash', chunk.hash)
  form.append(
    'chunk',
    new Blob([chunk.data], { type: 'application/octet-stream' }),
    `chunk-${chunk.index}.part`
  )

  const r = await api('POST', '/api/v1/upload/chunk', { token, form })
  return assertOk(`chunk#${chunk.index}`, r.envelope)
}

async function main() {
  if (CHUNK_SIZE < 1024 * 1024 || CHUNK_SIZE > 10 * 1024 * 1024) {
    console.error('CHUNK_SIZE 须在 1MB~10MB')
    process.exit(1)
  }

  const fileArg = process.argv[2]
  const { name, mime, buffer } = loadOrGenerateFile(fileArg)
  const fileHash = sha256Hex(buffer)
  const parts = splitChunks(buffer, CHUNK_SIZE)

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

  const token = await ensureToken()
  console.log('✓ token acquired')

  console.log('[/api/v1/upload/prepare]', {
    name,
    size: buffer.length,
    hash: fileHash,
    mime,
    chunk: CHUNK_SIZE
  })

  const prepare = assertOk(
    'prepare',
    (
      await api('POST', '/api/v1/upload/prepare', {
        token,
        json: {
          name,
          size: buffer.length,
          hash: fileHash,
          mime,
          chunk: CHUNK_SIZE
        }
      })
    ).envelope
  )

  if (prepare.exists) {
    console.log('秒传：文件已存在，跳过分片', prepare)
  } else {
    const done = new Set(prepare.chunks ?? [])
    for (const part of parts) {
      if (done.has(part.index)) {
        console.log(`… skip chunk#${part.index} (already uploaded)`)
        continue
      }
      await uploadChunk(token, prepare.id, part)
    }
  }

  const progress = assertOk(
    'progress',
    (await api('GET', `/api/v1/upload/progress/${prepare.id}`, { token })).envelope
  )
  console.log('progress detail', progress)

  if (!prepare.exists) {
    const finalized = assertOk(
      'finalize',
      (
        await api('POST', '/api/v1/upload/finalize', {
          token,
          json: { id: prepare.id }
        })
      ).envelope
    )

    const downloadPath = finalized.url?.startsWith('http') ? finalized.url : finalized.url
    const dl = await api('GET', downloadPath, { token })
    if (!dl.raw) {
      console.error('✗ download 未返回二进制', dl.envelope ?? dl)
      process.exit(1)
    }
    const downloaded = Buffer.from(dl.raw)
    const dlHash = sha256Hex(downloaded)
    if (dlHash !== fileHash || downloaded.length !== buffer.length) {
      console.error('✗ download 校验失败', {
        expect: fileHash,
        actual: dlHash,
        expectSize: buffer.length,
        actualSize: downloaded.length
      })
      process.exit(1)
    }
    console.log('✓ download + hash match', {
      bytes: downloaded.length,
      url: downloadPath
    })

    const out = resolve(`download-${name}`)
    writeFileSync(out, downloaded)
    console.log('✓ saved', out)
  }

  console.log('=== done ===')
}

const isDirect = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirect) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
