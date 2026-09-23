import { describe, expect, it } from 'vitest'

import type { CorexAction } from '@/stores/corex'

import {
  checkValue,
  createDefaultValues,
  findFieldHint,
  findFieldKind,
  findParamProblem,
  formatField,
  formatValue,
  parseInput,
  parseValue,
  setParamValue
} from './field'

function param(
  name: string,
  ty: string,
  required = false,
  extra: Partial<CorexAction['params'][number]> = {}
): CorexAction['params'][number] {
  return { name, ty, required, ...extra }
}

describe('findFieldKind', function () {
  it('gives bool a checkbox and the shapeless types a JSON box', function () {
    expect(findFieldKind('bool')).toBe('checkbox')
    expect(findFieldKind('array')).toBe('json')
    expect(findFieldKind('map')).toBe('json')
    expect(findFieldKind('any')).toBe('json')
  })

  it('gives the numbers their own box and masks a secret', function () {
    expect(findFieldKind('int')).toBe('number')
    expect(findFieldKind('float')).toBe('number')
    expect(findFieldKind('secret')).toBe('secret')
  })

  it('falls back to a plain text box for the types it knows nothing about', function () {
    expect(findFieldKind('str')).toBe('text')
    expect(findFieldKind('file')).toBe('text')
    expect(findFieldKind('bytes')).toBe('text')
    expect(findFieldKind('something-new')).toBe('text')
    expect(findFieldHint('something-new')).toBe('')
  })

  it('hints at the shape each type expects', function () {
    expect(findFieldHint('array')).toBe('[ … ]')
    expect(findFieldHint('map')).toBe('{ … }')
    expect(findFieldHint('str')).toBe('')
  })
})

describe('formatValue', function () {
  it('keeps text as it is, and writes everything else as JSON', function () {
    expect(formatValue('a b')).toBe('a b')
    expect(formatValue(12)).toBe('12')
    expect(formatValue(true)).toBe('true')
    expect(formatValue({ a: 1 })).toBe('{"a":1}')
  })

  it('writes nothing for a missing value', function () {
    expect(formatValue(undefined)).toBe('')
    expect(formatValue(null)).toBe('')
  })
})

describe('formatField', function () {
  it('opens a JSON parameter up so it stays editable', function () {
    expect(formatField(param('paths', 'array'), ['a', 'b'])).toBe('[\n  "a",\n  "b"\n]')
  })

  it('keeps the other types on one line', function () {
    expect(formatField(param('size', 'int'), 12)).toBe('12')
    expect(formatField(param('paths', 'array'), undefined)).toBe('')
  })
})

describe('parseValue', function () {
  it('leaves an empty box out, so corex keeps its own default', function () {
    expect(parseValue(param('x', 'str'), '')).toEqual({ ok: true, value: undefined })
    expect(parseValue(param('x', 'int'), '  ')).toEqual({ ok: true, value: undefined })
  })

  it('passes text through untouched', function () {
    expect(parseValue(param('x', 'str'), ' a b ')).toEqual({ ok: true, value: ' a b ' })
  })

  it('reads integers, and refuses anything that is not one', function () {
    expect(parseValue(param('n', 'int'), '12')).toEqual({ ok: true, value: 12 })
    expect(parseValue(param('n', 'int'), '-3')).toEqual({ ok: true, value: -3 })
    expect(parseValue(param('n', 'int'), '1.5')).toEqual({ ok: false, error: '「n」要一个整数' })
    expect(parseValue(param('n', 'int'), '1.')).toEqual({ ok: false, error: '「n」要一个整数' })
  })

  it('reads numbers, and waits for one to be finished', function () {
    expect(parseValue(param('n', 'float'), '1.5')).toEqual({ ok: true, value: 1.5 })
    expect(parseValue(param('n', 'float'), '1e3')).toEqual({ ok: true, value: 1000 })
    expect(parseValue(param('n', 'float'), '1.')).toEqual({ ok: false, error: '「n」要一个数字' })
    expect(parseValue(param('n', 'float'), 'abc')).toEqual({ ok: false, error: '「n」要一个数字' })
  })

  it('only accepts true / false for a checkbox', function () {
    expect(parseValue(param('f', 'bool'), 'true')).toEqual({ ok: true, value: true })
    expect(parseValue(param('f', 'bool'), 'false')).toEqual({ ok: true, value: false })
    expect(parseValue(param('f', 'bool'), '')).toEqual({ ok: true, value: undefined })
    expect(parseValue(param('f', 'bool'), 'yes')).toEqual({ ok: false, error: '「f」要 true / false' })
  })

  it('reads structured text as JSON', function () {
    expect(parseValue(param('x', 'map'), '{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
    expect(parseValue(param('x', 'array'), '[1,2]')).toEqual({ ok: true, value: [1, 2] })
  })

  it('points out a shape that does not match the declared type', function () {
    expect(parseValue(param('x', 'array'), '{"a":1}')).toEqual({
      ok: false,
      error: '「x」要一个 JSON 数组'
    })
    expect(parseValue(param('x', 'map'), '[1,2]')).toEqual({
      ok: false,
      error: '「x」要一个 JSON 对象'
    })
  })

  it('says why the JSON could not be read', function () {
    const parsed = parseValue(param('x', 'map'), '{"a":}')

    expect(parsed.ok).toBe(false)
    expect(parsed.ok ? '' : parsed.error).toContain('「x」的 JSON 读不出来：')
  })

  it('lets `any` take a plain string, since corex accepts one', function () {
    expect(parseValue(param('x', 'any'), 'hello')).toEqual({ ok: true, value: 'hello' })
    expect(parseValue(param('x', 'any'), '12')).toEqual({ ok: true, value: 12 })
  })
})

describe('parseInput', function () {
  it('keeps half-typed text instead of eating it', function () {
    expect(parseInput(param('x', 'map'), '{"a":')).toBe('{"a":')
    expect(parseInput(param('n', 'int'), '1.')).toBe('1.')
  })

  it('hands over the value once the text reads', function () {
    expect(parseInput(param('n', 'int'), '12')).toBe(12)
    expect(parseInput(param('x', 'map'), '{}')).toEqual({})
  })
})

describe('checkValue', function () {
  it('has nothing to say about an unset value or a text one', function () {
    expect(checkValue(param('x', 'str'), undefined)).toBeNull()
    expect(checkValue(param('x', 'str'), 12)).toBeNull()
    expect(checkValue(param('x', 'secret'), 'whatever')).toBeNull()
  })

  it('checks a typed value against its declared type', function () {
    expect(checkValue(param('f', 'bool'), true)).toBeNull()
    expect(checkValue(param('f', 'bool'), 'yes')).toBe('「f」要 true / false')
    expect(checkValue(param('n', 'int'), 12)).toBeNull()
    expect(checkValue(param('n', 'int'), 1.5)).toBe('「n」要一个整数')
    expect(checkValue(param('n', 'float'), Number.POSITIVE_INFINITY)).toBe('「n」要一个数字')
    expect(checkValue(param('x', 'array'), { a: 1 })).toBe('「x」要一个 JSON 数组')
    expect(checkValue(param('x', 'array'), ['a'])).toBeNull()
  })

  it('still reads a value that was left as text', function () {
    expect(checkValue(param('n', 'int'), '12')).toBeNull()
    expect(checkValue(param('n', 'int'), 'abc')).toBe('「n」要一个整数')
    expect(checkValue(param('x', 'map'), '{"a":1}')).toBeNull()
    expect(checkValue(param('x', 'map'), '{oops}')).toContain('「x」的 JSON 读不出来：')
  })
})

describe('createDefaultValues', function () {
  it('prefills the declared defaults', function () {
    const values = createDefaultValues([
      param('text', 'str', true, { default: 'hello' }),
      param('count', 'int', false, { default: 3 }),
      param('force', 'bool', false, { default: true })
    ])

    expect(values).toEqual({ text: 'hello', count: 3, force: true })
  })

  it('leaves a parameter without a default unset', function () {
    expect(createDefaultValues([param('x', 'str'), param('y', 'bool')])).toEqual({})
  })
})

describe('setParamValue', function () {
  it('writes a value without touching the others', function () {
    expect(setParamValue({ a: 1 }, 'b', 2)).toEqual({ a: 1, b: 2 })
  })

  it('drops the key when the box was cleared, so corex keeps its default', function () {
    expect(setParamValue({ a: 1, b: 2 }, 'b', undefined)).toEqual({ a: 1 })
    expect(setParamValue({ b: 1 }, 'b', '')).toEqual({ b: '' })
  })
})

describe('findParamProblem', function () {
  it('passes when every required parameter is filled the right way', function () {
    expect(findParamProblem([param('x', 'str', true)], { x: 'hello' })).toBeNull()
    expect(findParamProblem([param('x', 'str')], {})).toBeNull()
  })

  it('names the required parameter that was left empty', function () {
    expect(findParamProblem([param('x', 'str', true)], {})).toBe('「x」是必填参数')
  })

  it('reports the first problem, in declaration order', function () {
    const params = [param('a', 'int'), param('b', 'str', true), param('c', 'int')]
    const values = { a: 'oops', c: 1 }

    expect(findParamProblem(params, values)).toBe('「a」要一个整数')
    expect(findParamProblem(params, { a: 1 })).toBe('「b」是必填参数')
  })
})
