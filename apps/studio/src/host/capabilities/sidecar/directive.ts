import type {
  Bucket,
  DirectiveContent,
  DirectiveEntry,
  DirectiveDocument,
  DirectiveRun,
  DirectiveSummary
} from '../../../shared/ipc/specs/sidecar'
import { BucketSchema } from '../../../shared/ipc/specs/sidecar'

/**
 * 指令的文件形状（corex daemon 的 `list_directives` / `read_directive` / `save_directive`）。
 *
 * 宿主不再自己拆 YAML：模型（`definition`）由 corex 交过来，就是它刚反序列化的那一份。
 * 两边各拆一次的话，编辑器里的形状迟早会和真跑的那份悄悄错位 —— 那正是「改了没生效」
 * 这类问题的来源。
 */

/** corex 会省略空字段，编辑器按「必有」渲染，这里补默认值。 */
function normalizeDefinition(raw: unknown, fallbackName: string): DirectiveContent {
  const doc = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    ...doc,
    name: typeof doc.name === 'string' && doc.name ? doc.name : fallbackName,
    description: typeof doc.description === 'string' ? doc.description : '',
    version: typeof doc.version === 'string' ? doc.version : '',
    inputs: Array.isArray(doc.inputs) ? doc.inputs : [],
    steps: Array.isArray(doc.steps) ? doc.steps : []
  } as DirectiveContent
}

/** 分类由 corex 的 `Bucket` 说了算：读到没见过的值就当「没分类」，而不是编一个出来。 */
function parseBucket(raw: unknown): Bucket | null {
  const parsed = BucketSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function toCount(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

/**
 * 「上次跑成什么样」：corex 账本里的那条记录（`list_directives` 条目的 `last_run`）。
 * 时间戳缺一个就当没有 —— 卡片少显示一段时间，好过整条指令消失。
 */
function parseDirectiveRun(raw: unknown): DirectiveRun | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }

  const doc = raw as Record<string, unknown>
  const startedAt = toCount(doc.started_at_ms)
  const endedAt = toCount(doc.ended_at_ms)
  if (startedAt <= 0 || endedAt <= 0) {
    return undefined
  }

  return {
    started_at_ms: startedAt,
    ended_at_ms: endedAt,
    ok: doc.ok === true,
    error: typeof doc.error === 'string' ? doc.error : undefined,
    duration_ms: toCount(doc.duration_ms),
    run_count: toCount(doc.run_count),
    failed_count: toCount(doc.failed_count)
  }
}

/** 元信息缺一个数就当 0：卡片少显示一个数字，好过整条指令不出现。 */
function parseSummary(raw: unknown): DirectiveSummary | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const doc = raw as Record<string, unknown>
  return {
    description: typeof doc.description === 'string' ? doc.description : '',
    step_count: toCount(doc.step_count),
    input_count: toCount(doc.input_count),
    trigger_count: toCount(doc.trigger_count)
  }
}

function parseDirectiveEntries(data: unknown): DirectiveEntry[] {
  if (!Array.isArray(data)) {
    return []
  }

  const entries: DirectiveEntry[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const row = item as Record<string, unknown>
    if (typeof row.name !== 'string' || !row.name) {
      continue
    }
    entries.push({
      name: row.name,
      path: typeof row.path === 'string' ? row.path : '',
      bucket: parseBucket(row.bucket),
      summary: parseSummary(row.summary),
      last_run: parseDirectiveRun(row.last_run)
    })
  }
  return entries
}

function parseDirectiveDocument(data: unknown): DirectiveDocument {
  const doc = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const name = typeof doc.name === 'string' ? doc.name : ''
  return {
    name,
    path: typeof doc.path === 'string' ? doc.path : '',
    text: typeof doc.text === 'string' ? doc.text : '',
    definition: normalizeDefinition(doc.definition, name)
  }
}

export { normalizeDefinition, parseDirectiveDocument, parseDirectiveEntries }
export type { DirectiveDocument, DirectiveEntry, DirectiveSummary }
