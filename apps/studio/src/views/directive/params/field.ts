import type { CorexAction } from '@/stores/corex'

/**
 * 动作参数：corex 只声明类型名（`SchemaType` 那 11 种），没有 JSON Schema 明细。所以「给什么
 * 控件、怎么写进去、什么算不合法」这套规矩集中在这里 —— 动作库试跑与编辑器步骤表单共用同一
 * 份，免得两边各判一套、行为越走越远。
 */

type ActionParam = CorexAction['params'][number]

/** 声明里用得上的部分：收窄依赖，便于单独测 */
export interface ParamSpec {
  name: string
  ty: string
  required?: boolean
}

/** 控件种类：勾选 / 数字 / 一段 JSON / 一行文本 / 掩码文本 */
export type FieldKind = 'checkbox' | 'json' | 'number' | 'secret' | 'text'

interface FieldSpec {
  kind: FieldKind
  /** 占位提示：让人一眼看出该填什么形状 */
  hint?: string
}

/** `SchemaType` 是固定枚举，逐一对上控件；认不出的类型当文本 */
const FIELDS_BY_TYPE: Record<string, FieldSpec> = {
  bool: { kind: 'checkbox' },
  int: { kind: 'number' },
  float: { kind: 'number' },
  array: { kind: 'json', hint: '[ … ]' },
  map: { kind: 'json', hint: '{ … }' },
  any: { kind: 'json', hint: '{ … }' },
  null: { kind: 'json', hint: 'null' },
  secret: { kind: 'secret', hint: '••••••' },
  file: { kind: 'text', hint: '文件路径' },
  bytes: { kind: 'text', hint: '文件路径或文本' },
  str: { kind: 'text' }
}

const TEXT_FIELD: FieldSpec = { kind: 'text' }

/** 写全了的整数 / 数字；`1.`、`1e`、`12abc` 都算还没写完 */
const INT_TEXT = /^[+-]?\d+$/
const FLOAT_TEXT = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/

function findSpec(ty: string): FieldSpec {
  return FIELDS_BY_TYPE[ty] ?? TEXT_FIELD
}

export function findFieldKind(ty: string): FieldKind {
  return findSpec(ty).kind
}

export function findFieldHint(ty: string): string {
  return findSpec(ty).hint ?? ''
}

function problemOf(name: string, reason: string): string {
  return `「${name}」${reason}`
}

/** `JSON.parse` 的安静版：读不出来时给原因，别把异常抛给界面 */
function readJson(text: string): { value: unknown } | { reason: string } {
  try {
    return { value: JSON.parse(text) }
  } catch (error) {
    // 填错 JSON 是常事：报给界面就好，别把它抬成异常
    const reason = error instanceof Error ? error.message : String(error)
    console.warn('[params] 不是合法 JSON', reason)
    return { reason }
  }
}

/** `array` / `map` 说明了形状，贴错就当场指出来，别等 corex 拒 */
function checkShape(param: ParamSpec, value: unknown): string | null {
  if (param.ty === 'array' && !Array.isArray(value)) return problemOf(param.name, '要一个 JSON 数组')
  if (param.ty === 'map' && (value === null || typeof value !== 'object' || Array.isArray(value))) {
    return problemOf(param.name, '要一个 JSON 对象')
  }
  return null
}

export type FieldValue = { ok: true; value: unknown } | { ok: false; error: string }

/** 取值 → 一行文本：字符串原样，空值空串，其余紧凑 JSON（喂给单行控件） */
export function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''
  return JSON.stringify(value)
}

/** 取值 → 控件里显示的文本：JSON 类参数多行展开，方便直接改 */
export function formatField(param: ParamSpec, value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, findFieldKind(param.ty) === 'json' ? 2 : undefined)
}

/** 输入框文本 → 取值。空 = undefined（不传，让 corex 用自己的默认值） */
export function parseValue(param: ParamSpec, text: string): FieldValue {
  const kind = findFieldKind(param.ty)

  if (kind === 'checkbox') {
    if (text === 'true') return { ok: true, value: true }
    if (text === 'false') return { ok: true, value: false }
    return text.trim()
      ? { ok: false, error: problemOf(param.name, '要 true / false') }
      : { ok: true, value: undefined }
  }

  if (!text.trim()) return { ok: true, value: undefined }

  if (kind === 'number') {
    const raw = text.trim()
    if (param.ty === 'int') {
      return INT_TEXT.test(raw)
        ? { ok: true, value: Number.parseInt(raw, 10) }
        : { ok: false, error: problemOf(param.name, '要一个整数') }
    }
    return FLOAT_TEXT.test(raw) && Number.isFinite(Number(raw))
      ? { ok: true, value: Number(raw) }
      : { ok: false, error: problemOf(param.name, '要一个数字') }
  }

  if (kind === 'json') {
    const read = readJson(text)
    if ('reason' in read) {
      // `any` 什么都收：读不出 JSON 就按普通字符串走
      return param.ty === 'any'
        ? { ok: true, value: text }
        : { ok: false, error: problemOf(param.name, `的 JSON 读不出来：${read.reason}`) }
    }
    const problem = checkShape(param, read.value)
    return problem ? { ok: false, error: problem } : { ok: true, value: read.value }
  }

  // 文本 / 掩码：原样带过去（不 trim：路径里的空格可能是真的）
  return { ok: true, value: text }
}

/** 打字中间态不该被吃掉：读不出来就原样留着，由 `checkValue` 标出来 */
export function parseInput(param: ParamSpec, text: string): unknown {
  const parsed = parseValue(param, text)
  return parsed.ok ? parsed.value : text
}

/** 定型取值对得上声明类型吗？对不上给一句能显示的话 */
export function checkValue(param: ParamSpec, value: unknown): string | null {
  if (value === undefined) return null

  const kind = findFieldKind(param.ty)
  if (kind === 'text' || kind === 'secret') return null

  if (kind === 'checkbox') {
    return typeof value === 'boolean' ? null : problemOf(param.name, '要 true / false')
  }

  if (typeof value === 'string') {
    // 还没解析过来的手输内容：按输入框那套再看一遍
    const parsed = parseValue(param, value)
    return parsed.ok ? null : parsed.error
  }

  if (kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return problemOf(param.name, param.ty === 'int' ? '要一个整数' : '要一个数字')
    }
    return param.ty === 'int' && !Number.isInteger(value)
      ? problemOf(param.name, '要一个整数')
      : null
  }

  return checkShape(param, value)
}

/** 写入一个参数：清空即从取值表里去掉，让 corex 用自己的默认值 */
export function setParamValue(
  values: Record<string, unknown>,
  name: string,
  value: unknown
): Record<string, unknown> {
  const next = { ...values }
  if (value === undefined) delete next[name]
  else next[name] = value
  return next
}

/** 声明的默认值 → 初始取值表；没默认值的先空着（不传即用 corex 的默认值） */
export function createDefaultValues(params: readonly ActionParam[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  params.forEach(function (param) {
    if (param.default !== undefined) values[param.name] = param.default
  })
  return values
}

/** 必填没填 / 填得不对：第一个问题，界面据此拦住「运行」 */
export function findParamProblem(
  params: readonly ActionParam[],
  values: Record<string, unknown>
): string | null {
  for (const param of params) {
    const value = values[param.name]
    if (value === undefined) {
      if (param.required) return problemOf(param.name, '是必填参数')
      continue
    }
    const problem = checkValue(param, value)
    if (problem) return problem
  }
  return null
}
