import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import type { ArtifactId } from './config.ts'
import { log } from './log.ts'

const ARTIFACT_IDS: ArtifactId[] = ['corex', 'pandoc', 'ffmpeg']

type PrepareContext = {
  isStrict: boolean
  isForce: boolean
  isAsk: boolean
  isForceRemote: boolean
  isVerbose: boolean
  isShowSources: boolean
  /** null = 全部产物；非空 = 仅跑这些 */
  onlyIds: ArtifactId[] | null
  forceTargets: ReadonlySet<ArtifactId>
}

type AskChoice = {
  name: string
  value: ArtifactId
  exists: boolean
}

function parseArtifactIds(raw: string, label: string): ArtifactId[] {
  const parts = raw
    .split(',')
    .map(function (item) {
      return item.trim()
    })
    .filter(Boolean)
  if (parts.length === 0) {
    throw new Error(`${label} 不能为空`)
  }
  const unknown = parts.filter(function (id) {
    return !ARTIFACT_IDS.includes(id as ArtifactId)
  })
  if (unknown.length > 0) {
    throw new Error(`${label} 含未知产物: ${unknown.join(', ')}（可选: ${ARTIFACT_IDS.join(', ')}）`)
  }
  return parts as ArtifactId[]
}

function hasTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

function findModeLabel(ctx: PrepareContext): string {
  const parts = []
  if (ctx.isShowSources) parts.push('show-sources')
  if (ctx.isForce) parts.push('force')
  if (ctx.isAsk) parts.push('ask')
  if (ctx.isForceRemote) parts.push('force-remote')
  if (ctx.isStrict) parts.push('strict')
  if (ctx.onlyIds) parts.push(`only:${ctx.onlyIds.join('+')}`)
  return parts.length > 0 ? parts.join(' · ') : 'default'
}

/** 懒解析：无 import 副作用。 */
function parseCommand(argv = process.argv): PrepareContext {
  const program = new Command()

  program
    .name('prepare')
    .description('准备 client sidecar / 工具二进制（corex、pandoc、ffmpeg）')
    .option('-s, --strict', '可选产物失败时也退出（corex 始终必需）')
    .option('-f, --force', '强制覆盖所选产物（非交互；可配合 --only）')
    .option('--only <ids>', `仅处理指定产物，逗号分隔（${ARTIFACT_IDS.join(',')}）`)
    .option('--force-remote', '跳过 sources 中的 local 源，仅走远端链')
    .option('--show-sources', '打印各产物生效源链后退出')
    .option('-a, --ask', '交互勾选要覆盖的已落盘产物（需 TTY）')
    .option('-v, --verbose', '输出更详细的下载/缓存/源链日志')
    .helpOption('-h, --help', '显示帮助')
    .showHelpAfterError(true)
    .parse(argv, { from: 'node' })

  const parsed = program.opts<{
    strict?: boolean
    force?: boolean
    only?: string
    forceRemote?: boolean
    showSources?: boolean
    ask?: boolean
    verbose?: boolean
  }>()

  if (parsed.force && parsed.ask) {
    throw new Error('请勿同时使用 --force 与 --ask：覆盖用 --force/--only，交互勾选用 --ask')
  }

  return {
    isStrict: Boolean(parsed.strict),
    isForce: Boolean(parsed.force),
    isAsk: Boolean(parsed.ask),
    isForceRemote: Boolean(parsed.forceRemote),
    isVerbose: Boolean(parsed.verbose),
    isShowSources: Boolean(parsed.showSources),
    onlyIds: parsed.only ? parseArtifactIds(parsed.only, '--only') : null,
    forceTargets: new Set<ArtifactId>()
  }
}

function shouldForce(ctx: PrepareContext, id: ArtifactId): boolean {
  return ctx.forceTargets.has(id)
}

function withForceTargets(ctx: PrepareContext, targets: ArtifactId[]): PrepareContext {
  return {
    ...ctx,
    forceTargets: new Set(targets)
  }
}

function findSelectedIds(ctx: PrepareContext, available: ArtifactId[]): ArtifactId[] {
  if (!ctx.onlyIds) return available
  return available.filter(function (id) {
    return ctx.onlyIds!.includes(id)
  })
}

/**
 * 解析覆盖目标：
 * - `--force`：非交互，覆盖所选（全部或 `--only`）
 * - `--ask`：TTY 勾选已存在项
 */
async function resolveForceTargets(
  ctx: PrepareContext,
  choices: AskChoice[]
): Promise<PrepareContext> {
  const selected = findSelectedIds(
    ctx,
    choices.map(function (choice) {
      return choice.value
    })
  )
  if (selected.length === 0) {
    throw new Error('--only 与当前产物列表无交集')
  }

  if (ctx.isForce) {
    log.info(`强制覆盖: ${selected.join(', ')}`)
    return withForceTargets(ctx, selected)
  }

  if (!ctx.isAsk) return ctx

  if (!hasTty()) {
    log.warn('--ask 需要交互终端，已忽略（默认跳过已就绪产物）')
    return ctx
  }

  const existing = choices.filter(function (choice) {
    return choice.exists && selected.includes(choice.value)
  })
  if (existing.length === 0) {
    log.info('没有已落盘产物需要确认覆盖')
    return ctx
  }

  const { targets } = await inquirer.prompt<{ targets: ArtifactId[] }>([
    {
      type: 'checkbox',
      name: 'targets',
      message: chalk.cyanBright('选择要重新准备的产物（不选则跳过已就绪项）:'),
      choices: existing.map(function (choice) {
        return {
          name: choice.name,
          value: choice.value
        }
      })
    }
  ])

  if (targets.length === 0) {
    log.skip('未选择覆盖项')
  } else {
    log.info(`将覆盖: ${targets.join(', ')}`)
  }
  return withForceTargets(ctx, targets)
}

function warnOrFail(ctx: PrepareContext, label: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  if (ctx.isStrict) throw error instanceof Error ? error : new Error(message)
  log.warn(`${label}: ${message}`)
}

export {
  ARTIFACT_IDS,
  findModeLabel,
  findSelectedIds,
  parseCommand,
  resolveForceTargets,
  shouldForce,
  warnOrFail,
  withForceTargets,
  type AskChoice,
  type PrepareContext
}
