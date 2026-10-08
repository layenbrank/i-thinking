/**
 * generic feed：目录内需有 `latest.yml` + Setup.exe（由 NSIS maker 产出）。
 * 优先 Vite 编译期注入的 STUDIO_UPDATE_FEED_URL，再回落环境变量。
 */
function findFeedUrl(): string | undefined {
  const injected = process.env.STUDIO_UPDATE_FEED_URL?.trim()
  if (injected) return injected.replace(/\/$/, '')
  const updateUrl = process.env.STUDIO_UPDATE_URL?.trim()
  if (updateUrl) return updateUrl.replace(/\/$/, '')
  const base = process.env.STUDIO_S3_UPDATE_BASE?.trim()
  if (!base) return undefined
  return `${base.replace(/\/$/, '')}/win32/x64`
}

export { findFeedUrl }
