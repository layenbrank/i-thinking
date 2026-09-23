import { describe, expect, it } from 'vitest'

import { normalizeDefinition, parseDirectiveDocument, parseDirectiveEntries } from './directive'

describe('parseDirectiveEntries', function () {
  it('reads name / path / bucket / summary', function () {
    const actual = parseDirectiveEntries([
      {
        name: 'build-intern',
        path: 'D:\\x\\build-intern.yaml',
        bucket: 'data',
        summary: { description: '打包', step_count: 3, input_count: 2, trigger_count: 1 }
      },
      { name: 'draft', path: 'D:\\x\\draft.yaml', bucket: null, summary: null }
    ])
    expect(actual).toEqual([
      {
        name: 'build-intern',
        path: 'D:\\x\\build-intern.yaml',
        bucket: 'data',
        summary: { description: '打包', step_count: 3, input_count: 2, trigger_count: 1 }
      },
      { name: 'draft', path: 'D:\\x\\draft.yaml', bucket: null, summary: null }
    ])
  })

  // 一条坏指令元信息可能只给了一半，缺的当 0 而不是整条丢掉
  it('fills in the missing summary counts', function () {
    expect(parseDirectiveEntries([{ name: 'half', summary: { step_count: 2 } }])).toEqual([
      {
        name: 'half',
        path: '',
        bucket: null,
        summary: { description: '', step_count: 2, input_count: 0, trigger_count: 0 }
      }
    ])
    const summaries = parseDirectiveEntries([{ name: 'bad', summary: 'nope' }]).map(function (entry) {
      return entry.summary
    })
    expect(summaries).toEqual([null])
  })

  it('keeps a directive corex could not classify, but drops rows without a name', function () {
    const actual = parseDirectiveEntries([{ path: 'x.yaml' }, null, 'nope', { name: 'ok' }])
    expect(actual).toEqual([{ name: 'ok', path: '', bucket: null, summary: null }])
  })

  it('returns nothing for a shape it does not know', function () {
    expect(parseDirectiveEntries({ directives: ['a'] })).toEqual([])
  })
})

describe('parseDirectiveDocument', function () {
  it('keeps the text and the model corex sent', function () {
    const actual = parseDirectiveDocument({
      name: 'demo',
      path: 'D:\\x\\demo.yaml',
      text: 'name: demo\nsteps: []\n',
      definition: { name: 'demo', description: 'd', version: '1', inputs: [], steps: [] }
    })
    expect(actual).toEqual({
      name: 'demo',
      path: 'D:\\x\\demo.yaml',
      text: 'name: demo\nsteps: []\n',
      definition: { name: 'demo', description: 'd', version: '1', inputs: [], steps: [] }
    })
  })

  // corex 省略空字段，编辑器按「必有」渲染
  it('fills in what corex omits', function () {
    const actual = parseDirectiveDocument({ name: 'demo', definition: { name: 'demo' } })
    expect(actual.definition).toMatchObject({
      name: 'demo',
      description: '',
      version: '',
      inputs: [],
      steps: []
    })
  })

  it('keeps the fields it does not know', function () {
    const actual = normalizeDefinition(
      { name: 'demo', steps: [{ id: 's1', action: 'fs.copy', future_option: true }] },
      'fallback'
    )
    expect(actual.steps[0]).toEqual({ id: 's1', action: 'fs.copy', future_option: true })
  })

  it('falls back to the document name and survives a broken payload', function () {
    expect(parseDirectiveDocument({ name: 'demo', definition: null }).definition.name).toBe('demo')
    expect(parseDirectiveDocument(null)).toMatchObject({ name: '', text: '' })
  })
})
