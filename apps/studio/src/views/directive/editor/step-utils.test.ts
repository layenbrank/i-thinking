import { describe, expect, it } from 'vitest'

import { cloneStep, moveStep, nextStepId } from './step-utils'
import type { Step } from './types'

/**
 * 步骤 id 是 React 的 key，也是 corex 认步骤的凭据：撞车会让两边都认错行。
 * 这里盯住「新增时给的号一定没被兄弟占着」。
 */

function actionStep(id: string): Step {
  return { id, action: 'shell.run' }
}

describe('nextStepId', function () {
  it('starts at one and takes the short name of the action', function () {
    expect(nextStepId('file.write', [])).toBe('write-1')
    expect(nextStepId('shell.run', [])).toBe('run-1')
    expect(nextStepId('scan', [])).toBe('scan-1')
  })

  it('fills the hole a deleted step left instead of colliding', function () {
    const steps = [actionStep('run-1'), actionStep('run-3')]
    expect(nextStepId('shell.run', steps)).toBe('run-2')
  })

  it('keeps counting when the numbers in use are consecutive', function () {
    const steps = [actionStep('run-1'), actionStep('run-2')]
    expect(nextStepId('shell.run', steps)).toBe('run-3')
  })

  it('ignores ids belonging to other actions', function () {
    expect(nextStepId('shell.run', [actionStep('write-1')])).toBe('run-1')
  })
})

describe('cloneStep', function () {
  it('copies the content and gives the copy its own id', function () {
    const copy = cloneStep({ ...actionStep('run-1'), params: { command: 'ls' } })
    const source = { id: 'run-1', action: 'shell.run', params: { command: 'ls' } }

    expect(copy).not.toBe(source)
    expect(copy).toMatchObject({ action: 'shell.run', params: { command: 'ls' } })
    expect(copy.id).not.toBe('run-1')
  })
})

describe('moveStep', function () {
  it('moves one step and leaves the rest in order', function () {
    const steps = ['a', 'b', 'c'].map(actionStep)
    const ids = function (list: Step[]): (string | undefined)[] {
      return list.map(function (step) {
        return step.id
      })
    }

    expect(ids(moveStep(steps, 2, 0))).toEqual(['c', 'a', 'b'])
    expect(ids(steps)).toEqual(['a', 'b', 'c'])
  })
})
