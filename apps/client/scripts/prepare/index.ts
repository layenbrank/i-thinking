/**
 * 构建前准备 sidecar / 工具二进制。
 *
 *   node scripts/prepare/index.ts
 *   node scripts/prepare/index.ts --show-sources
 *   node scripts/prepare/index.ts --force --only corex
 *   node scripts/prepare/index.ts --force-remote
 *
 * 源链配置：scripts/prepare/sources.ts
 * 本机覆盖：scripts/prepare/sources.local.ts（见 .example）
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ARTIFACT_IDS,
  findModeLabel,
  findSelectedIds,
  parseCommand,
  resolveForceTargets
} from './command.ts'
import { findHostKey, HOST_TRIPLE } from './config.ts'
import { hashSha256 } from './file.ts'
import { formatError, log, printBanner, setVerbose } from './log.ts'
import { runPipeline } from './pipeline.ts'
import { RECIPES } from './recipes/index.ts'
import { printArtifactSources } from './parse-sources.ts'

async function prepare(argv = process.argv): Promise<void> {
  let ctx = parseCommand(argv)
  setVerbose(ctx.isVerbose || ctx.isShowSources)
  const hostKey = findHostKey()
  const hostLabel = hostKey ?? process.platform
  printBanner({
    host: `${hostLabel} / ${HOST_TRIPLE}`,
    mode: findModeLabel(ctx)
  })

  const selected = findSelectedIds(ctx, ARTIFACT_IDS)

  if (ctx.isShowSources) {
    await printArtifactSources(selected, hostKey, {
      skipLocal: ctx.isForceRemote
    })
    return
  }

  ctx = await resolveForceTargets(
    ctx,
    RECIPES.map(function (recipe) {
      return {
        name: recipe.label,
        value: recipe.id,
        exists: recipe.hasExisting()
      }
    })
  )

  if (ctx.isVerbose) {
    await printArtifactSources(selected, hostKey, {
      skipLocal: ctx.isForceRemote
    })
  }

  const result = await runPipeline(ctx)
  log.summary(result.rows)

  if (result.hasRequiredFailure) {
    process.exitCode = 1
  }
}

const isDirectRun =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  prepare().catch(function (error) {
    log.error(formatError(error))
    process.exit(1)
  })
}

export { hashSha256, prepare }
