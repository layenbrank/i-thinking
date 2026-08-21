import { resolve } from 'node:path'
import process from 'node:process'

let loaded = false

/** 加载仓库根目录 `.env`（可重复调用，只生效一次） */
function loadEnv(): void {
  if (loaded) return
  loaded = true
  const envPath = resolve(process.cwd(), '.env')
  try {
    process.loadEnvFile(envPath)
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined
    if (code !== 'ENOENT') {
      console.warn(`加载 .env 失败 (${envPath}):`, err instanceof Error ? err.message : err)
    }
  }
}

export { loadEnv }
