import { describe, expect, it } from 'vitest'

import {
  COMPARE_PLACEHOLDER,
  CONDITION_KINDS,
  CONDITION_LABELS,
  conditionKind,
  makeCondition,
  parseOperand
} from './condition'

describe('conditionKind', function () {
  it('reads the kind off the key corex would deserialize', function () {
    expect(conditionKind({ eq: ['a', 'b'] })).toBe('eq')
    expect(conditionKind({ ne: ['a', 'b'] })).toBe('ne')
    expect(conditionKind({ gt: ['a', 'b'] })).toBe('gt')
    expect(conditionKind({ lt: ['a', 'b'] })).toBe('lt')
    expect(conditionKind({ and: [] })).toBe('and')
    expect(conditionKind({ or: [] })).toBe('or')
    expect(conditionKind({ not: 'a' })).toBe('not')
  })

  it('keeps contains apart from the expressions', function () {
    expect(conditionKind({ contains: ['{{var.list}}', 'x'] })).toBe('contains')
  })

  it('treats a bare string as an expression', function () {
    expect(conditionKind('{{variables.enabled}}')).toBe('expr')
  })
})

describe('makeCondition', function () {
  it('gives every kind a shell without leftovers from the previous one', function () {
    expect(makeCondition('expr')).toBe('')
    expect(makeCondition('not')).toEqual({ not: '' })
    expect(makeCondition('and')).toEqual({ and: [] })
    expect(makeCondition('or')).toEqual({ or: [] })
    expect(makeCondition('contains')).toEqual({ contains: ['', ''] })
    expect(makeCondition('eq')).toEqual({ eq: ['', ''] })
  })

  it('round-trips every kind through conditionKind', function () {
    CONDITION_KINDS.forEach(function (kind) {
      expect(conditionKind(makeCondition(kind))).toBe(kind)
    })
  })
})

describe('parseOperand', function () {
  it('reads scalars the way YAML would', function () {
    expect(parseOperand('5')).toBe(5)
    expect(parseOperand('-3.5')).toBe(-3.5)
    expect(parseOperand('.5')).toBe(0.5)
    expect(parseOperand('1e3')).toBe(1000)
    expect(parseOperand('true')).toBe(true)
    expect(parseOperand('false')).toBe(false)
  })

  it('leaves anything that is not a scalar a string', function () {
    expect(parseOperand('')).toBe('')
    expect(parseOperand('{{inputs.count}}')).toBe('{{inputs.count}}')
    expect(parseOperand('5 个')).toBe('5 个')
    expect(parseOperand('+5')).toBe('+5')
    expect(parseOperand(' 5')).toBe(' 5')
    expect(parseOperand('1e999')).toBe('1e999')
  })
})

describe('condition labels', function () {
  it('has a label and a placeholder for every kind it offers', function () {
    CONDITION_KINDS.forEach(function (kind) {
      expect(CONDITION_LABELS[kind]).toBeTruthy()
    })
    expect(COMPARE_PLACEHOLDER.contains).toEqual(['{{表达式}}', '要找的子串 / 元素'])
  })
})
