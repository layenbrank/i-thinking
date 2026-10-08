import { createWriteStream, existsSync, renameSync, rmSync } from 'node:fs'

import { net } from 'electron'

/**
 * 主进程侧的下载：只用 Electron 的 `net`，因为它**跟着系统代理走**
 * （本仓的开发机常年挂代理，Node 的 fetch 默认不吃 `HTTPS_PROXY`）。
 *
 * 与仓库 CLI（`scripts/commands/features/sidecar/infra/download.ts`）不是同一套：
 * 那边是构建期的仓库工具链（ky + curl 兜底、同步、无进度），这里是运行时、要进度、要能
 * 被窗口看见。共同的只有「先下到临时文件、校验过再上位」这个次序。
 */

interface DownloadProgress {
  received: number
  total: number
}

/** 慢于这个速度持续一段时间就断开：连上但不给数据的情况在下载大文件时最常见 */
const STALL_MS = 60_000

/**
 * 进度节流：183 MB 的包按 chunk 直推能推上万帧，渲染侧会 setState 上万次。
 * 100 ms 一帧对「一个百分比条」已经完全够用，末帧强制补一次。
 */
const PROGRESS_INTERVAL_MS = 100

/** 把响应体写到指定路径：不做原子落位，`part` 那一步的语义由 `download` 负责 */
function streamToFile(
  url: string,
  destPath: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  return new Promise(function (resolve, reject) {
    let settled = false
    let stallTimer: NodeJS.Timeout | undefined
    let writer: ReturnType<typeof createWriteStream> | null = null

    function finish(error: Error | null): void {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(stallTimer)
      if (error) {
        // abort 不会自己关流：句柄与半截文件都别留在系统里
        writer?.destroy()
        reject(error)
      } else {
        resolve()
      }
    }

    const request = net.request({ url, redirect: 'follow', method: 'GET' })

    request.on('response', function (response) {
      const status = response.statusCode
      if (status < 200 || status >= 300) {
        finish(new Error(`下载失败：HTTP ${status}（${url}）`))
        return
      }

      const total = Number(response.headers['content-length'] ?? 0)
      let received = 0
      let reportedAt = 0
      const file = createWriteStream(destPath)
      writer = file

      /** 节流上报；末帧强制发（否则进度条永远差最后一格） */
      function report(isLast: boolean): void {
        const now = Date.now()
        if (!isLast && now - reportedAt < PROGRESS_INTERVAL_MS) {
          return
        }
        reportedAt = now
        onProgress?.({ received, total })
      }

      function rearmStall(): void {
        clearTimeout(stallTimer)
        stallTimer = setTimeout(function () {
          request.abort()
          finish(new Error(`下载停滞超过 ${STALL_MS / 1000} 秒`))
        }, STALL_MS)
      }

      rearmStall()

      // Electron 的 IncomingMessage 不是 Node stream（没有 pipe / resume），只能自己写盘
      response.on('data', function (chunk: Buffer) {
        received += chunk.length
        rearmStall()
        report(false)
        file.write(chunk)
      })

      response.on('error', function (error: Error) {
        file.destroy()
        finish(error)
      })

      file.on('error', function (error) {
        finish(error)
      })

      response.on('end', function () {
        report(true)
        // 写完再 resolve：调用方拿到 callback 时文件必须已经落全，才好去算哈希
        file.end(function () {
          finish(null)
        })
      })
    })

    request.on('error', function (error: Error) {
      finish(error)
    })

    request.end()
  })
}

/** 下到 `.part` 再改名：半截文件不会被下一次的「已经有了」误判成完整 */
async function download(
  url: string,
  destPath: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const partPath = `${destPath}.part`
  rmSync(partPath, { force: true })
  await streamToFile(url, partPath, onProgress)
  if (!existsSync(partPath)) {
    throw new Error(`下载没有留下文件：${url}`)
  }
  rmSync(destPath, { force: true })
  renameSync(partPath, destPath)
}

export { download }
export type { DownloadProgress }
