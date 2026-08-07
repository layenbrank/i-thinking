import chalk from 'chalk'
import {
  findSelectedIds,
  shouldForce,
  warnOrFail,
  type PrepareContext
} from './command.ts'
import { findHostKey, type HostKey } from './config.ts'
import { formatError, log, type SummaryRow } from './log.ts'
import { RECIPES, type ArtifactRecipe } from './recipes/index.ts'
import { parseArtifactSources, type ParsedSource } from './parse-sources.ts'

type RunResult = {
  rows: SummaryRow[]
  hasRequiredFailure: boolean
}

async function trySources(
  ctx: PrepareContext,
  recipe: ArtifactRecipe,
  host: HostKey | null,
  sources: ParsedSource[]
): Promise<SummaryRow> {
  if (sources.length === 0) {
    const message = recipe.missingHint ?? `${recipe.id}: 无可用源（检查 sources.ts / 平台）`
    if (recipe.isRequired) {
      log.error(message)
      return { id: recipe.id, outcome: 'failed', detail: message }
    }
    warnOrFail(ctx, recipe.id, new Error(message))
    return { id: recipe.id, outcome: 'warned', detail: message }
  }

  let lastError: unknown
  for (let i = 0; i < sources.length; i += 1) {
    const source = sources[i]
    try {
      if (source.type === 'local') {
        if (!recipe.stageLocal) {
          throw new Error(`${recipe.id} 不支持 local 源`)
        }
        log.info(`${recipe.id} ← ${source.id} (local)`)
        await recipe.stageLocal(ctx, source.dir)
        return { id: recipe.id, outcome: 'local', detail: source.id }
      }

      log.info(`${recipe.id} ← ${source.id} (remote)`)
      await recipe.stageRemote(ctx, host, source.asset)
      log.success(`${recipe.id} 完成`)
      return { id: recipe.id, outcome: 'remote', detail: source.id }
    } catch (error) {
      lastError = error
      const isLast = i === sources.length - 1
      if (isLast) break
      log.warn(
        `${recipe.id} 源 ${source.id} 失败，尝试下一个: ${formatError(error)}`
      )
    }
  }

  const detail = formatError(lastError)
  if (recipe.isRequired) {
    log.error(`${recipe.id} 失败: ${detail}`)
    if (recipe.missingHint) console.error(chalk.yellow(recipe.missingHint))
    return { id: recipe.id, outcome: 'failed', detail }
  }
  try {
    warnOrFail(ctx, `${recipe.id} 失败`, lastError)
    return { id: recipe.id, outcome: 'warned', detail }
  } catch {
    return { id: recipe.id, outcome: 'failed', detail }
  }
}

async function runRecipe(
  ctx: PrepareContext,
  recipe: ArtifactRecipe,
  host: HostKey | null,
  index: number,
  total: number
): Promise<SummaryRow> {
  const force = shouldForce(ctx, recipe.id)

  try {
    if (!force && (await recipe.isReady(ctx))) {
      log.step(index, total, recipe.id, '已就绪，跳过')
      return { id: recipe.id, outcome: 'skipped' }
    }

    if (force && recipe.clearArtifacts) {
      log.step(index, total, recipe.id, '清理后重新准备')
      recipe.clearArtifacts(ctx, host)
    } else {
      log.step(index, total, recipe.id, '按源链准备')
    }

    const sources = await parseArtifactSources(recipe.id, host, {
      skipLocal: ctx.isForceRemote
    })
    if (ctx.isVerbose || ctx.isForceRemote) {
      log.debug(
        `${recipe.id} 源链: ${sources
          .map(function (source) {
            return source.id
          })
          .join(' → ')}`
      )
    }

    return await trySources(ctx, recipe, host, sources)
  } catch (error) {
    const detail = formatError(error)
    if (recipe.isRequired) {
      log.error(`${recipe.id} 失败: ${detail}`)
      if (recipe.missingHint) console.error(chalk.yellow(recipe.missingHint))
      return { id: recipe.id, outcome: 'failed', detail }
    }
    try {
      warnOrFail(ctx, `${recipe.id} 失败`, error)
      return { id: recipe.id, outcome: 'warned', detail }
    } catch {
      return { id: recipe.id, outcome: 'failed', detail }
    }
  }
}

async function runPipeline(ctx: PrepareContext): Promise<RunResult> {
  const host = findHostKey()
  const recipes = RECIPES.filter(function (recipe) {
    return findSelectedIds(
      ctx,
      RECIPES.map(function (item) {
        return item.id
      })
    ).includes(recipe.id)
  })

  if (recipes.length === 0) {
    throw new Error('没有可执行的产物（检查 --only）')
  }

  const rows: SummaryRow[] = []
  let hasRequiredFailure = false

  for (let i = 0; i < recipes.length; i += 1) {
    const recipe = recipes[i]
    const row = await runRecipe(ctx, recipe, host, i + 1, recipes.length)
    rows.push(row)
    if (row.outcome === 'failed' && recipe.isRequired) {
      hasRequiredFailure = true
      break
    }
    if (row.outcome === 'failed' && ctx.isStrict) {
      hasRequiredFailure = true
      break
    }
  }

  return { rows, hasRequiredFailure }
}

export { runPipeline, type RunResult }
