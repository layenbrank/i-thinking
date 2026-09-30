import { describe, expect, it } from 'vitest'

import {
  buildControlStep,
  cloneStep,
  findStepKind,
  moveStep,
  nextStepId,
  switchStepKind
} from './step-utils'
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

describe('buildControlStep', function () {
  it('builds a skeleton corex can read for every control-flow kind', function () {
    expect(buildControlStep('if', 'if-1')).toEqual({ id: 'if-1', if: '', then: [] })
    expect(buildControlStep('repeat', 'repeat-1')).toEqual({
      id: 'repeat-1',
      repeat: { count: 1 },
      steps: []
    })
    expect(buildControlStep('parallel', 'parallel-1')).toEqual({ id: 'parallel-1', parallel: [] })
    expect(buildControlStep('steps', 'steps-1')).toEqual({ id: 'steps-1', steps: [] })
  })

  it('names the kind of every skeleton it builds', function () {
    expect(findStepKind(buildControlStep('if', 'a'))).toBe('if')
    expect(findStepKind(buildControlStep('repeat', 'a'))).toBe('repeat')
    expect(findStepKind(buildControlStep('parallel', 'a'))).toBe('parallel')
    expect(findStepKind(buildControlStep('steps', 'a'))).toBe('steps')
    expect(findStepKind(actionStep('a'))).toBe('action')
  })
})

describe('switchStepKind', function () {
  it('keeps the id and carries the child steps over', function () {
    const steps = [actionStep('one'), actionStep('two')]
    const next = switchStepKind({ id: 'keep-me', if: '', then: steps }, 'steps')

    expect(next).toEqual({ id: 'keep-me', steps })
    // 并行分支数组也是「一串步骤」，换类型时照搬
    expect(switchStepKind({ id: 'p', parallel: steps }, 'repeat')).toEqual({
      id: 'p',
      repeat: { count: 1 },
      steps
    })
  })

  it('gives a condition branch the children as its then', function () {
    expect(switchStepKind({ id: 's', steps: [actionStep('one')] }, 'if')).toEqual({
      id: 's',
      if: '',
      then: [actionStep('one')]
    })
  })

  it('drops the fields the new kind cannot hold', function () {
    const next = switchStepKind(
      { id: 'a', action: 'shell.run', params: { command: 'ls' }, save_to: 'out' },
      'parallel'
    )

    expect(next).toEqual({ id: 'a', parallel: [] })
  })

  it('returns the very same step when the kind did not change', function () {
    const step = buildControlStep('parallel', 'a')
    expect(switchStepKind(step, 'parallel')).toBe(step)
  })
})
