import type { Step } from './types'

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

export { cloneStep, moveStep, nextStepId }
