import { Command } from 'commander'

import type { CommandModule } from '../../core/registry.ts'
import { logger } from '../../core/logger.ts'
import { hasTty, promptSelect } from '../../core/prompt.ts'
import { TOOLS } from './tools/catalog.ts'
import { findLockPins, hasToolPin, parseToolsLock } from './infra/lock.ts'
import { findPlatformKey } from './infra/platform.ts'
import { stageVendoredTools } from './infra/stage.ts'
import { verifyStagedDir } from './infra/verify.ts'
import { TARGETS, findTarget, targetKeys } from './targets/catalog.ts'

function findAppKeysText(): string {
  return targetKeys().join('|')
}

/** 优先位置参数 app；`--app` 为备用（经 pnpm 传参时可能需加 `--`）。 */
async function parseApp(positional?: string, optionApp?: string): Promise<string> {
  const raw = positional || optionApp
  if (raw) {
    if (TARGETS[raw]) {
      return raw
    }
    throw new Error(`[sidecar] 无效应用 "${raw}"（可选: ${findAppKeysText()}）`)
  }

  if (!hasTty()) {
    throw new Error(
      `[sidecar] 非交互环境必须指定应用: pnpm command sidecar <动作> <${findAppKeysText()}>`
    )
  }

  return promptSelect(
    '选择 sidecar 目标应用',
    targetKeys().map(function (id) {
      return { name: id, value: id }
    })
  )
}

async function ensureTool(toolId: string): Promise<void> {
  const tool = TOOLS[toolId]
  if (!tool) {
    throw new Error(`[sidecar] 未知工具: ${toolId}`)
  }
  await tool.ensure(findPlatformKey())
}

function isRequiredTool(toolId: string, app: string): boolean {
  if (toolId === 'corex') {
    return true
  }
  // client 依赖 goose ACP sidecar
  return app === 'client' && toolId === 'goose'
}

async function runBootstrap(app: string): Promise<void> {
  const key = findPlatformKey()
  const lock = parseToolsLock()
  const target = findTarget(app)

  for (const tool of Object.values(TOOLS)) {
    const pins = findLockPins(lock, tool.id)
    if (!pins || !hasToolPin(pins, key)) {
      if (isRequiredTool(tool.id, app)) {
        throw new Error(`[sidecar] 当前平台无 ${tool.id} 钉死版本: ${key}（应用=${app}）`)
      }
      continue
    }
    await tool.ensure(key)
  }

  await stageVendoredTools(target, key)
  verifyStagedDir(target.findStagedDir(key), app)
  logger.success(`[sidecar] 引导完成（${app}）`)
}

async function runStage(app: string): Promise<void> {
  const target = findTarget(app)
  await stageVendoredTools(target)
}

async function runVerify(app: string): Promise<void> {
  const target = findTarget(app)
  verifyStagedDir(target.findStagedDir(findPlatformKey()), app)
}

function registerAppAction(
  parent: Command,
  name: string,
  description: string,
  run: (app: string) => Promise<void>
): void {
  const appsLabel = findAppKeysText()
  parent
    .command(name)
    .description(description)
    .argument(`[app]`, `目标应用（${appsLabel}）`)
    .option('--app <id>', `同位置参数 app（${appsLabel}）`)
    .action(async function (appArg: string | undefined, opts: { app?: string }) {
      const app = await parseApp(appArg, opts.app)
      await run(app)
    })
}

const SidecarCommand: CommandModule = {
  name: 'sidecar',
  description: '侧车工具下载 / 落盘 / 校验（按应用目标）',
  register(program) {
    const appsLabel = findAppKeysText()
    const sidecar = program
      .command('sidecar')
      .description(`侧车工具：下载、落盘、校验（${appsLabel}）`)
      .addHelpText(
        'after',
        `
示例:
  pnpm command sidecar bootstrap studio
  pnpm command sidecar bootstrap client
  pnpm sidecar stage studio
  pnpm command sidecar verify client
  pnpm command sidecar corex
  pnpm command sidecar goose
  pnpm sidecar bootstrap -- --app studio
`
      )

    registerAppAction(sidecar, 'bootstrap', '按 lock 拉取工具 → 落盘 → 校验', runBootstrap)
    registerAppAction(sidecar, 'stage', '将已缓存工具拷贝到应用目录', runStage)
    registerAppAction(sidecar, 'verify', '校验落盘目录校验和', runVerify)

    for (const toolId of Object.keys(TOOLS)) {
      sidecar
        .command(toolId)
        .description(`仅确保 ${toolId} 进入共享下载缓存`)
        .action(async function () {
          await ensureTool(toolId)
        })
    }
  }
}

export { SidecarCommand }
