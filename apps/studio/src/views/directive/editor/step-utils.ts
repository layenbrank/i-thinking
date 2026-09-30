import type { Step } from './types'

/**
 * 步骤的四种控制流（动作之外）与它们的骨架。
 *
 * 骨架只给 corex 认得了的最小形状：新增一个空分支/空循环也要能画出来，
 * 剩下的交给编辑器里的表单填。
 */
const CONTROL_KINDS = ['if', 'repeat', 'parallel', 'steps'] as const

type ControlKind = (typeof CONTROL_KINDS)[number]

const STEP_KINDS = ['action', ...CONTROL_KINDS] as const

type StepKind = (typeof STEP_KINDS)[number]

/** 复制步骤：深拷贝并换一个唯一 id，避免 React key 与 corex 步骤 id 撞车 */
function cloneStep(step: Step): Step {
  const copy = structuredClone(step) as Step
  return { ...copy, id: `${step.id}-${crypto.randomUUID().slice(0, 4)}` }
}

/** 把第 from 个步骤移动到 to（只动顺序，不改内容） */
function moveStep(steps: Step[], from: number, to: number): Step[] {
  const next = [...steps]
  const moved = next.splice(from, 1)[0]
  next.splice(to, 0, moved)
  return next
}

/** 动作 id 的短名：`file.write` → `write`，拿它给步骤 id 起头 */
function stepBase(actionID: string): string {
  const parts = actionID.split('.')
  return parts[parts.length - 1] || actionID
}

/**
 * 新步骤的 id：`<短名>-<序号>`，序号取第一个还没被兄弟占用的。
 *
 * 不能用「兄弟数量 + 1」推：删掉中间一条再新增，推出来的号会撞上还活着的那条 ——
 * React 的 key 与 corex 的步骤 id 都会认错行。
 */
function nextStepId(actionID: string, siblings: readonly Step[]): string {
  const base = stepBase(actionID)
  const taken = new Set(
    siblings.map(function (step) {
      return step.id
    })
  )
  let index = 1
  while (taken.has(`${base}-${index}`)) {
    index += 1
  }
  return `${base}-${index}`
}

/** 这条步骤现在是哪一种（判据与 StepNode 的分派一致，只此一份） */
function findStepKind(step: Step): StepKind {
  if ('action' in step) return 'action'
  if ('if' in step) return 'if'
  if ('repeat' in step) return 'repeat'
  if ('parallel' in step) return 'parallel'
  return 'steps'
}

/** 新控制流步骤的骨架；`repeat` 给一个 count 1，corex 的循环得二选一才跑得起来 */
function buildControlStep(kind: ControlKind, id: string): Step {
  if (kind === 'if') return { id, if: '', then: [] }
  if (kind === 'repeat') return { id, repeat: { count: 1 }, steps: [] }
  if (kind === 'parallel') return { id, parallel: [] }
  return { id, steps: [] }
}

/**
 * 这一步装的子步骤。换类型时只搬两边都说得通的那些 ——
 * 循序块 / 循环都有 `steps`，条件分支的 `then`、并行的分支数组也都是「一串步骤」，
 * 语义相通；换掉的只是外层怎么走。动作的参数没人接，只能丢。
 */
function childStepsOf(step: Step): Step[] {
  if ('action' in step) return []
  if ('if' in step) return step.then
  if ('parallel' in step) return step.parallel
  return step.steps
}

/**
 * 换一种步骤类型（原地重建）。
 *
 * id 一定留着：它是 React 的 key，也是用户可能改过的标识，换个类型不该顺带把它改掉。
 * 换成动作要一份动作目录才能填 `action`，所以那一路由 step-node 自己走 `buildStep`。
 */
function switchStepKind(step: Step, kind: ControlKind): Step {
  if (findStepKind(step) === kind) return step

  const next = buildControlStep(kind, step.id ?? '')
  const children = childStepsOf(step)
  if (children.length === 0) return next
  // 条件分支只有 then 能收下这一串；换个类型不等于替用户编出 else
  return 'if' in next ? { ...next, then: children } : { ...next, steps: children }
}

export {
  CONTROL_KINDS,
  STEP_KINDS,
  buildControlStep,
  cloneStep,
  findStepKind,
  moveStep,
  nextStepId,
  switchStepKind
}
export type { ControlKind, StepKind }
