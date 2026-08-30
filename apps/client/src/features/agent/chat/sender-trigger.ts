/**
 * AgentSender 通用触发：检测与行为解耦
 */
type TriggerInsertMode = 'chip' | 'text'

interface TriggerBehavior {
  id: string
  insertMode: TriggerInsertMode
  serializePrefix: string
  source: string
}

interface TriggerRule {
  char: string
  behaviorId: string
  kind: string
}

interface TriggerMatch {
  char: string
  kind: string
  behaviorId: string
  query: string
  /** 触发符 + query 的总长度，便于删除 */
  tokenLength: number
}

interface SenderChip {
  id: string
  kind: string
  label: string
  value: string
  meta: Record<string, string>
}

const BEHAVIOR_PICK_FILE = 'pick-file'
const BEHAVIOR_PICK_SKILL = 'pick-skill'

const TRIGGER_BEHAVIORS: TriggerBehavior[] = [
  {
    id: BEHAVIOR_PICK_FILE,
    insertMode: 'chip',
    serializePrefix: '@',
    source: 'workspace-files'
  },
  {
    id: BEHAVIOR_PICK_SKILL,
    insertMode: 'chip',
    serializePrefix: '/',
    source: 'workspace-skills'
  }
]

const TRIGGER_RULES: TriggerRule[] = [
  { char: '@', behaviorId: BEHAVIOR_PICK_FILE, kind: 'file' },
  { char: '/', behaviorId: BEHAVIOR_PICK_SKILL, kind: 'skill' }
]

function findTriggerBehavior(behaviorId: string) {
  return TRIGGER_BEHAVIORS.find(function (item) {
    return item.id === behaviorId
  })
}

/**
 * 触发前界：行首 / 空白 / 非 ASCII 字母数字（允许「你好@」），
 * 但 ASCII 标识符后的 @ / 不触发（避免 a@b、http://）。
 */
function findHasValidTriggerBoundary(text: string, atIndex: number) {
  if (atIndex <= 0) return true
  const prev = text[atIndex - 1]
  if (!prev) return true
  if (/[\s\u00a0\uFFFC]/.test(prev)) return true
  // ASCII 字母数字或常见 URL 字符 → 非法前界
  if (/[A-Za-z0-9._~-]/.test(prev)) return false
  // 其他（含 CJK、标点）→ 合法
  return true
}

/**
 * 仅看光标前纯文本。符号与光标间有空格则不匹配。
 */
function parseTriggerToken(textBeforeCaret: string, rules: TriggerRule[] = TRIGGER_RULES) {
  if (!textBeforeCaret) return null

  let best: TriggerMatch | null = null

  for (const rule of rules) {
    const escaped = rule.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`${escaped}([^\\s]*)$`)
    const matched = textBeforeCaret.match(pattern)
    if (!matched || matched.index === undefined) continue

    if (!findHasValidTriggerBoundary(textBeforeCaret, matched.index)) continue

    const query = matched[1] ?? ''
    const tokenLength = rule.char.length + query.length
    const next: TriggerMatch = {
      char: rule.char,
      kind: rule.kind,
      behaviorId: rule.behaviorId,
      query,
      tokenLength
    }

    if (!best || next.tokenLength <= best.tokenLength) {
      best = next
    }
  }

  return best
}

export {
  BEHAVIOR_PICK_FILE,
  BEHAVIOR_PICK_SKILL,
  TRIGGER_BEHAVIORS,
  TRIGGER_RULES,
  findTriggerBehavior,
  parseTriggerToken
}
export type {
  SenderChip,
  TriggerBehavior,
  TriggerInsertMode,
  TriggerMatch,
  TriggerRule
}
