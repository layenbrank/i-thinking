import chalk from 'chalk'
import figlet from 'figlet'
import { atlas } from 'gradient-string'
import { LOG_PREFIX } from './config.ts'

type RecipeOutcome = 'skipped' | 'local' | 'remote' | 'warned' | 'failed'

type SummaryRow = {
  id: string
  outcome: RecipeOutcome
  detail?: string
}

let isVerbose = false

function setVerbose(enabled: boolean): void {
  isVerbose = enabled
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function printBanner(meta?: { host: string; mode: string }): void {
  if (!process.stdout.isTTY) {
    const bits = [meta?.host, meta?.mode].filter(Boolean)
    console.log(`${LOG_PREFIX} ${bits.join(' · ')}`)
    return
  }

  try {
    const asciiArt = figlet.textSync('PREPARE', {
      font: 'Slant',
      horizontalLayout: 'fitted',
      verticalLayout: 'controlled smushing'
    })
    console.log(`\n${atlas(asciiArt)}`)
  } catch {
    console.log(`\n${chalk.blueBright.bold('PREPARE')}`)
  }

  const subtitle = meta
    ? `client binaries · ${meta.host} · ${meta.mode}`
    : 'client binaries · corex / pandoc / ffmpeg'
  console.log(chalk.gray(`${subtitle}\n`))
}

function outcomeColor(outcome: RecipeOutcome): typeof chalk.green {
  if (outcome === 'failed') return chalk.red
  if (outcome === 'warned') return chalk.yellow
  if (outcome === 'skipped') return chalk.gray
  return chalk.green
}

function outcomeLabel(outcome: RecipeOutcome): string {
  if (outcome === 'skipped') return '跳过'
  if (outcome === 'local') return '本地'
  if (outcome === 'remote') return '远端'
  if (outcome === 'warned') return '警告'
  return '失败'
}

/** 类似前端 `message.info`：`log.info` / `log.success` / … */
const log = {
  info(message: string): void {
    console.log(chalk.cyan(`${LOG_PREFIX} ${message}`))
  },
  success(message: string): void {
    console.log(chalk.green(`${LOG_PREFIX} ${message}`))
  },
  warn(message: string): void {
    console.warn(chalk.yellow(`${LOG_PREFIX} ${message}`))
  },
  error(message: string): void {
    console.error(chalk.red(`${LOG_PREFIX} ${message}`))
  },
  skip(message: string): void {
    console.log(chalk.gray(`${LOG_PREFIX} ${message}`))
  },
  debug(message: string): void {
    if (!isVerbose) return
    console.log(chalk.gray(`${LOG_PREFIX} ${message}`))
  },
  /** `[1/3] corex · 已就绪，跳过` */
  step(index: number, total: number, id: string, message: string): void {
    console.log(chalk.cyan(`${LOG_PREFIX} [${index}/${total}] ${id} · ${message}`))
  },
  summary(rows: SummaryRow[]): void {
    if (rows.length === 0) return
    console.log('')
    console.log(chalk.bold(`${LOG_PREFIX} 汇总`))
    for (const row of rows) {
      const paint = outcomeColor(row.outcome)
      const label = outcomeLabel(row.outcome)
      const detail = row.detail ? chalk.gray(` · ${row.detail}`) : ''
      console.log(paint(`${LOG_PREFIX}  ${label}  ${row.id}${detail}`))
    }
    const failed = rows.filter(function (row) {
      return row.outcome === 'failed'
    }).length
    const warned = rows.filter(function (row) {
      return row.outcome === 'warned'
    }).length
    const updated = rows.filter(function (row) {
      return row.outcome === 'local' || row.outcome === 'remote'
    }).length
    const skipped = rows.filter(function (row) {
      return row.outcome === 'skipped'
    }).length
    console.log(
      chalk.gray(
        `${LOG_PREFIX} 更新 ${updated} · 跳过 ${skipped} · 警告 ${warned} · 失败 ${failed}\n`
      )
    )
  }
}

export {
  formatBytes,
  formatError,
  log,
  printBanner,
  setVerbose,
  type RecipeOutcome,
  type SummaryRow
}
