import { OpenCode, type OpenCodeClient } from '@opencode/client'

/**
 * opencode 客户端的构造点。
 *
 * 两个容易踩的点：
 * 1. **鉴权必须显式带上**。server 端设了 `OPENCODE_SERVER_PASSWORD` 之后要用 Basic 认证，
 *    而 SDK **不会**自己去读那个环境变量，用户名固定是 `opencode`。
 * 2. **`baseUrl` 就是 server 根地址**，端点路径由 SDK 自己拼（`/api/session`、`/api/event` …），
 *    不要在这里补前缀。
 *
 * v2 的 `OpenCode.make()` 直接返回数据、失败即抛异常（v1 的 `{data, error}` 信封已经取消），
 * 所以调用方一律用 try/catch 处理错误。
 */

function createAuthHeader(password: string): string {
  return `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`
}

function createClient(url: string, password: string): OpenCodeClient {
  return OpenCode.make({
    baseUrl: url,
    headers: { Authorization: createAuthHeader(password) }
  })
}

export { createAuthHeader, createClient }
