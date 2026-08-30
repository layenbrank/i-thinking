import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'

import { assertSha256, hashFileStream } from './hash.ts'
import { downloadToFile } from './http.ts'

function findProxyUrl(): string | undefined {
  const raw =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy
  if (!raw || !raw.trim()) {
    return undefined
  }
  return raw.trim()
}

/** ky 不可达时的兜底（例如仅 curl 能吃代理环境变量）。 */
async function downloadWithCurl(url: string, destPath: string): Promise<void> {
  const probe = spawnSync('curl.exe', ['--version'], { encoding: 'utf8' })
  const curlBin = !probe.error && (probe.status === 0 || probe.status === null) ? 'curl.exe' : 'curl'
  const version = spawnSync(curlBin, ['--version'], { encoding: 'utf8' })
  if (version.error || (version.status !== 0 && version.status !== null)) {
    throw new Error('[download] 本机无 curl')
  }

  mkdirSync(path.dirname(destPath), { recursive: true })
  const args = ['-L', '--fail', '--retry', '5', '--retry-delay', '2', '--connect-timeout', '30']
  const proxy = findProxyUrl()
  if (proxy) {
    args.push('-x', proxy)
  }
  args.push('-o', destPath, url)

  console.log(`[download] 回退 curl${proxy ? '（已传代理）' : ''}`)
  const result = spawnSync(curlBin, args, {
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env
  })
  if (result.status !== 0 || !existsSync(destPath) || statSync(destPath).size <= 0) {
    throw new Error(`[download] curl 失败: ${url}`)
  }
}

async function fetchToFile(url: string, destPath: string): Promise<void> {
  const proxy = findProxyUrl()
  if (proxy) {
    console.log(
      `[download] HTTPS_PROXY=${proxy}（ky 需 NODE_USE_ENV_PROXY=1 才吃代理；失败时 curl 会带 -x）`
    )
  }

  try {
    await downloadToFile(url, destPath)
    return
  } catch (kyError) {
    console.log(`[download] ky 失败: ${String(kyError)}`)
    if (existsSync(destPath)) {
      unlinkSync(destPath)
    }
    try {
      await downloadWithCurl(url, destPath)
      return
    } catch (curlError) {
      throw new Error(
        `[download] ky 与 curl 均失败: ${url}\n- ky: ${String(kyError)}\n- curl: ${String(curlError)}`
      )
    }
  }
}

async function fetchVerified(url: string, destPath: string, sha256: string): Promise<string> {
  if (existsSync(destPath)) {
    const existing = await hashFileStream(destPath)
    if (existing.toLowerCase() === sha256.toLowerCase()) {
      console.log(`[download] 缓存命中 ${destPath}`)
      return destPath
    }
    const size = statSync(destPath).size
    console.log(`[download] 缓存失效（${size} 字节），重新下载 ${destPath}`)
    unlinkSync(destPath)
  }
  await fetchToFile(url, destPath)
  const actual = await hashFileStream(destPath)
  assertSha256(actual, sha256, path.basename(destPath))
  console.log(`[download] 完成 ${path.basename(destPath)}（${statSync(destPath).size} 字节）`)
  return destPath
}

export { fetchToFile, fetchVerified, findProxyUrl }
