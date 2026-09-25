type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type Logger = {
  debug: (message: string, extra?: unknown) => void
  info: (message: string, extra?: unknown) => void
  warn: (message: string, extra?: unknown) => void
  error: (message: string, extra?: unknown) => void
  child: (module: string) => Logger
}

function format(level: LogLevel, module: string, message: string, extra?: unknown) {
  const time = new Date().toISOString()
  const base = `[${time}] [${level.toUpperCase()}] [${module}] ${message}`
  if (extra === undefined) return base
  return `${base} ${stringify(extra)}`
}

function stringify(extra: unknown) {
  if (extra instanceof Error) {
    return extra.stack ?? extra.message
  }
  try {
    return JSON.stringify(extra)
  } catch (error) {
    // 不能调 logger 自己（递归）：直接 console；不可序列化的 extra 本身就是要看的信息
    console.warn('[logger] extra 不可序列化，回退 String()', error)
    return String(extra)
  }
}

function log(level: LogLevel, module: string, message: string, extra?: unknown): void {
  if (level === 'debug' && !process.env.STUDIO_DEBUG) return

  console[level](format(level, module, message, extra))
}

function buildLogger(module: string): Logger {
  return {
    debug(message, extra) {
      log('debug', module, message, extra)
    },
    info(message, extra) {
      log('info', module, message, extra)
    },
    warn(message, extra) {
      log('warn', module, message, extra)
    },
    error(message, extra) {
      log('error', module, message, extra)
    },
    child(childModule) {
      return buildLogger(`${module}:${childModule}`)
    }
  }
}

export type { Logger }
export { buildLogger }
