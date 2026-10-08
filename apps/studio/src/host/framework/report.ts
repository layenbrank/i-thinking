/**
 * 探测失败的统一上报：**同一条消息只报一次**。
 *
 * 宿主里有不少 catch 是「探测」——轮询某个目录、扫一遍 skills、问一次 git，
 * 路径随时可能被删、文件随时可能被换。这类失败是预期内的，每次都报会刷屏
 * （进度轮询是 400 ms 一次）；但完全静默又让真正的问题（权限不对、配置写错）
 * 无处可查。折中就是「报一次」：第一次说清楚，之后静默。
 *
 * 需要区分不同来源时把来源拼进 `message`（如路径），去重键就是它。
 */
const REPORTED = new Set<string>()

/**
 * 去重表的容量上限。消息里常带路径，长跑进程里被删的临时目录会不断产生新键，
 * 无上限就是慢性泄漏；到顶后整表清掉重来 —— 代价只是早期消息可能再报一次。
 */
const MAX_REPORTED = 256

function reportOnce(message: string, error?: unknown): void {
  if (REPORTED.has(message)) {
    return
  }
  if (REPORTED.size >= MAX_REPORTED) {
    REPORTED.clear()
  }
  REPORTED.add(message)
  if (error === undefined) {
    console.warn(`[probe] ${message}`)
    return
  }
  console.warn(`[probe] ${message}`, error)
}

export { reportOnce }
