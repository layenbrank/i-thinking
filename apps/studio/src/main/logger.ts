type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function format(level: LogLevel, module: string, message: string, extra?: unknown) {
  const time = new Date().toISOString()
  const base = `[${time}] [${level.toUpperCase()}] [${module}] ${message}`
  if (extra === undefined) return base
  return `${base} ${stringifyExtra(extra)}`
}

function stringifyExtra(extra: unknown) {
  if (extra instanceof Error) {
    return extra.stack ?? extra.message
  }
  try {
    return JSON.stringify(extra)
  } catch {
    return String(extra)
  }
}

export interface Logger {
  debug: (message: string, extra?: unknown) => void
  info: (message: string, extra?: unknown) => void
  warn: (message: string, extra?: unknown) => void
  error: (message: string, extra?: unknown) => void
  child: (module: string) => Logger
}

export function createLogger(module: string): Logger {
  return {
    debug(message, extra) {
      if (!process.env.STUDIO_DEBUG) return
      console.debug(format('debug', module, message, extra))
    },
    info(message, extra) {
      console.info(format('info', module, message, extra))
    },
    warn(message, extra) {
      console.warn(format('warn', module, message, extra))
    },
    error(message, extra) {
      console.error(format('error', module, message, extra))
    },
    child(childModule) {
      return createLogger(`${module}:${childModule}`)
    }
  }
}
